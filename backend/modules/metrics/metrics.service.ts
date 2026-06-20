import { and, desc, eq, gte } from "drizzle-orm";

import { db } from "../../db";
import { loadTestRun } from "../../db/schema";

const MAX_METRICS_RUNS = 500;
const MAX_ENDPOINT_BREAKDOWN_RUNS = 500;
const timeRangeHours = {
  "1h": 1,
  "6h": 6,
  "24h": 24,
  "3d": 24 * 3,
  "7d": 24 * 7,
  "30d": 24 * 30,
} as const;

export type MetricsTimeRange = keyof typeof timeRangeHours;

type MetricsRun = typeof loadTestRun.$inferSelect;

type StoredSummary = {
  avgLatency?: number;
  p90?: number;
  p95?: number;
  p99?: number;
  requests?: number;
  errors?: number;
  errorRate?: number;
  duration?: number;
  maxThroughput?: number;
  infrastructure?: {
    cpu?: Record<string, unknown>;
    ram?: Record<string, unknown>;
    pods?: Record<string, unknown>;
    containers?: Record<string, unknown>;
  };
};

type MetricSnapshot = {
  run: MetricsRun;
  timestamp: Date;
  endpoint: string;
  requests: number;
  errors: number;
  success: number;
  avgLatency: number;
  p50: number;
  p95: number;
  p99: number;
  duration: number;
  throughput: number;
  currentUsers: number;
  cpuPercent?: number;
  memoryPercent?: number;
  ramMb?: number;
};

export class MetricsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetricsValidationError";
  }
}

export async function getBackendMetrics(
  userId: string,
  rangeInput: string | undefined,
) {
  const range = parseTimeRange(rangeInput);
  const cutoff = new Date(Date.now() - timeRangeHours[range] * 60 * 60 * 1000);

  const runs = await db
    .select()
    .from(loadTestRun)
    .where(andUserAndCutoff(userId, cutoff))
    .orderBy(desc(loadTestRun.createdAt))
    .limit(MAX_METRICS_RUNS);
  const endpointRuns = await db
    .select()
    .from(loadTestRun)
    .where(eq(loadTestRun.userId, userId))
    .orderBy(desc(loadTestRun.createdAt))
    .limit(MAX_ENDPOINT_BREAKDOWN_RUNS);

  const snapshots = runs
    .map(createSnapshot)
    .filter((snapshot): snapshot is MetricSnapshot => snapshot !== null)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const endpointSnapshots = endpointRuns
    .map(createSnapshot)
    .filter((snapshot): snapshot is MetricSnapshot => snapshot !== null);

  const buckets = createBuckets(range, cutoff);
  const bucketed = buckets.map((bucket) =>
    aggregateBucket(
      bucket,
      snapshots.filter(
        (snapshot) =>
          snapshot.timestamp >= bucket.from && snapshot.timestamp < bucket.to,
      ),
    ),
  );

  const totals = aggregateTotals(snapshots);

  return {
    timeRange: range,
    generatedAt: new Date().toISOString(),
    source: {
      runs: snapshots.length,
      primary: "load_test_run.summary",
      realtime: "load_test_run.realtime_series",
      latencyUnit: "ms",
      aggregation:
        "avgLatency is weighted by summary.requests, which includes successful and failed HTTP requests from k6 http_reqs.",
      resource:
        "CPU/RAM utilization uses stored infrastructure percent fields when present; missing values default to 0. Node RAM MB snapshots are kept as raw process-memory data and are not converted into utilization percent.",
      includedRuns: snapshots.map((snapshot) => ({
        id: snapshot.run.id,
        createdAt: snapshot.run.createdAt.toISOString(),
        requests: Math.round(snapshot.requests),
        errors: Math.round(snapshot.errors),
        avgLatency: roundMetric(snapshot.avgLatency),
        duration: roundMetric(snapshot.duration),
      })),
    },
    summary: createSummary(totals, bucketed),
    latencyTimeSeriesData: bucketed.map((bucket) => ({
      time: bucket.label,
      p50: roundMetric(bucket.p50),
      p95: roundMetric(bucket.p95),
      p99: roundMetric(bucket.p99),
      avg: roundMetric(bucket.avgLatency),
    })),
    throughputData: bucketed.map((bucket) => ({
      time: bucket.label,
      requests: Math.round(bucket.requests),
      success: Math.round(bucket.success),
      failed: Math.round(bucket.errors),
    })),
    errorRateData: bucketed.map((bucket) => ({
      time: bucket.label,
      rate: roundMetric(bucket.errorRate * 100),
      count: Math.round(bucket.errors),
    })),
    resourceUtilizationData: createResourceSeries(bucketed),
    databaseMetricsData: createDatabaseSeries(bucketed),
    endpointBreakdown: createEndpointBreakdown(endpointSnapshots),
    statusCodeData: [
      {
        name: "2xx Success",
        value: Math.round(totals.success),
        color: "#10b981",
      },
      {
        name: "4xx/5xx Errors",
        value: Math.round(totals.errors),
        color: "#ef4444",
      },
    ],
    responseTimeDistribution: createResponseTimeDistribution(snapshots),
  };
}

function andUserAndCutoff(userId: string, cutoff: Date) {
  return and(eq(loadTestRun.userId, userId), gte(loadTestRun.createdAt, cutoff));
}

function parseTimeRange(value: string | undefined): MetricsTimeRange {
  if (!value) {
    return "24h";
  }

  if (value in timeRangeHours) {
    return value as MetricsTimeRange;
  }

  throw new MetricsValidationError("Invalid metrics time range");
}

function createSnapshot(run: MetricsRun): MetricSnapshot | null {
  const summary = normalizeSummary(run.summary);
  const requests = getNumber(summary.requests) ?? estimateRequests(run, summary);
  const errors = getNumber(summary.errors) ?? run.errors;
  const avgLatency =
    getNumber(summary.avgLatency) ?? parseLatencyMs(run.latency) ?? 0;
  const p95 = getNumber(summary.p95) ?? avgLatency;
  const p99 = getNumber(summary.p99) ?? p95;
  const duration = getNumber(summary.duration) ?? run.duration;
  const throughput =
    getNumber(summary.maxThroughput) ??
    run.requestsPerSecond ??
    (duration > 0 ? requests / duration : 0);

  if (requests <= 0 && errors <= 0 && avgLatency <= 0) {
    return null;
  }

  return {
    run,
    timestamp: run.completedAt ?? run.startedAt ?? run.createdAt,
    endpoint: formatEndpoint(run.method, run.url),
    requests,
    errors,
    success: Math.max(0, requests - errors),
    avgLatency,
    p50: Math.min(avgLatency, p95),
    p95,
    p99,
    duration,
    throughput,
    currentUsers: run.currentUsers || run.totalUsers || run.users,
    cpuPercent: getCpuPercent(summary),
    memoryPercent: getMemoryPercent(summary),
    ramMb: getRamMb(summary),
  };
}

function normalizeSummary(value: unknown): StoredSummary {
  return isRecord(value) ? (value as StoredSummary) : {};
}

function estimateRequests(run: MetricsRun, summary: StoredSummary) {
  const duration = getNumber(summary.duration) ?? run.duration;
  const throughput = getNumber(summary.maxThroughput) ?? run.requestsPerSecond;

  return duration > 0 && throughput > 0 ? Math.round(duration * throughput) : 0;
}

function createBuckets(range: MetricsTimeRange, cutoff: Date) {
  const count =
    range === "1h" || range === "6h" || range === "24h"
      ? 12
      : range === "7d"
        ? 7
        : 10;
  const intervalMs = (timeRangeHours[range] * 60 * 60 * 1000) / count;

  return Array.from({ length: count }, (_, index) => {
    const from = new Date(cutoff.getTime() + index * intervalMs);
    const to = new Date(from.getTime() + intervalMs);

    return {
      from,
      to,
      label: formatBucketLabel(from, range),
    };
  });
}

function aggregateBucket(
  bucket: { from: Date; to: Date; label: string },
  snapshots: MetricSnapshot[],
) {
  const totals = aggregateTotals(snapshots);

  return {
    ...bucket,
    ...totals,
  };
}

function aggregateTotals(snapshots: MetricSnapshot[]) {
  const requests = sum(snapshots.map((snapshot) => snapshot.requests));
  const errors = sum(snapshots.map((snapshot) => snapshot.errors));
  const success = Math.max(0, requests - errors);
  const avgLatency = weightedAverage(
    snapshots.map((snapshot) => ({
      value: snapshot.avgLatency,
      weight: Math.max(1, snapshot.requests),
    })),
  );
  const p50 = weightedAverage(
    snapshots.map((snapshot) => ({
      value: snapshot.p50,
      weight: Math.max(1, snapshot.requests),
    })),
  );
  const p95 = weightedAverage(
    snapshots.map((snapshot) => ({
      value: snapshot.p95,
      weight: Math.max(1, snapshot.requests),
    })),
  );
  const p99 = weightedAverage(
    snapshots.map((snapshot) => ({
      value: snapshot.p99,
      weight: Math.max(1, snapshot.requests),
    })),
  );
  const duration = sum(snapshots.map((snapshot) => snapshot.duration));
  const throughput =
    duration > 0
      ? requests / duration
      : weightedAverage(
          snapshots.map((snapshot) => ({
            value: snapshot.throughput,
            weight: Math.max(1, snapshot.duration),
          })),
        );
  const currentUsers = Math.max(
    0,
    ...snapshots.map((snapshot) => snapshot.currentUsers),
  );
  const ramMb = average(
    snapshots
      .map((snapshot) => snapshot.ramMb)
      .filter((value): value is number => value !== undefined),
  );
  const cpuPercent = average(
    snapshots
      .map((snapshot) => snapshot.cpuPercent)
      .filter((value): value is number => value !== undefined),
  );
  const memoryPercent = average(
    snapshots
      .map((snapshot) => snapshot.memoryPercent)
      .filter((value): value is number => value !== undefined),
  );

  return {
    requests,
    errors,
    success,
    avgLatency,
    p50,
    p95,
    p99,
    duration,
    throughput,
    errorRate: requests > 0 ? errors / requests : 0,
    currentUsers,
    cpuPercent,
    memoryPercent,
    ramMb,
  };
}

function createSummary(
  totals: ReturnType<typeof aggregateTotals>,
  bucketed: ReturnType<typeof aggregateBucket>[],
) {
  const previous = bucketed.slice(0, Math.floor(bucketed.length / 2));
  const current = bucketed.slice(Math.floor(bucketed.length / 2));
  const previousTotals = aggregateSeriesTotals(previous);
  const currentTotals = aggregateSeriesTotals(current);

  return {
    avgResponseTime: {
      value: roundMetric(totals.avgLatency),
      unit: "ms",
      change: percentChange(previousTotals.avgLatency, currentTotals.avgLatency),
    },
    totalRequests: {
      value: Math.round(totals.requests),
      change: percentChange(previousTotals.requests, currentTotals.requests),
    },
    errorRate: {
      value: roundMetric(totals.errorRate * 100),
      unit: "%",
      change: percentChange(previousTotals.errorRate, currentTotals.errorRate),
    },
    requestsPerSecond: {
      value: roundMetric(totals.throughput),
      change: percentChange(previousTotals.throughput, currentTotals.throughput),
    },
  };
}

function aggregateSeriesTotals(
  series: ReturnType<typeof aggregateBucket>[],
) {
  const requests = sum(series.map((item) => item.requests));
  const errors = sum(series.map((item) => item.errors));
  const duration = sum(series.map((item) => item.duration));

  return {
    requests,
    errors,
    avgLatency: weightedAverage(
      series.map((item) => ({
        value: item.avgLatency,
        weight: Math.max(1, item.requests),
      })),
    ),
    errorRate: requests > 0 ? errors / requests : 0,
    throughput: duration > 0 ? requests / duration : 0,
  };
}

function createResourceSeries(bucketed: ReturnType<typeof aggregateBucket>[]) {
  return bucketed.map((bucket) => ({
    time: bucket.label,
    cpu: roundMetric(bucket.cpuPercent),
    memory: roundMetric(bucket.memoryPercent),
    disk: 0,
    network: 0,
  }));
}

function createDatabaseSeries(bucketed: ReturnType<typeof aggregateBucket>[]) {
  return bucketed.map((bucket) => ({
    time: bucket.label,
    connections: bucket.currentUsers,
    queries: Math.round(bucket.requests),
    cacheHit: 0,
  }));
}

function createEndpointBreakdown(snapshots: MetricSnapshot[]) {
  return [...snapshots]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .map((snapshot) => ({
      runId: snapshot.run.id,
      createdAt: snapshot.run.createdAt.toISOString(),
      endpoint: snapshot.endpoint,
      requests: Math.round(snapshot.requests),
      avgLatency: roundMetric(snapshot.avgLatency),
      errors: Math.round(snapshot.errors),
      p95: roundMetric(snapshot.p95),
    }));
}

function createResponseTimeDistribution(snapshots: MetricSnapshot[]) {
  const ranges = [
    { range: "0-100ms", max: 100, count: 0 },
    { range: "100-250ms", max: 250, count: 0 },
    { range: "250-500ms", max: 500, count: 0 },
    { range: "500ms-1s", max: 1_000, count: 0 },
    { range: "1s-2s", max: 2_000, count: 0 },
    { range: "2s+", max: Infinity, count: 0 },
  ];

  for (const snapshot of snapshots) {
    const range = ranges.find((item) => snapshot.avgLatency < item.max);
    if (range) {
      range.count += Math.round(snapshot.requests);
    }
  }

  return ranges.map(({ range, count }) => ({ range, count }));
}

function getRamMb(summary: StoredSummary) {
  const ram = summary.infrastructure?.ram;

  if (!isRecord(ram)) {
    return undefined;
  }

  return getNumber(ram.rssMb) ?? getNumber(ram.heapUsedMb);
}

function getCpuPercent(summary: StoredSummary) {
  const cpu = summary.infrastructure?.cpu;

  if (!isRecord(cpu)) {
    return undefined;
  }

  return getPercent(cpu);
}

function getMemoryPercent(summary: StoredSummary) {
  const ram = summary.infrastructure?.ram;

  if (!isRecord(ram)) {
    return undefined;
  }

  return (
    getPercent(ram) ??
    calculatePercent(getNumber(ram.usedMb), getNumber(ram.totalMb))
  );
}

function getPercent(value: Record<string, unknown>) {
  const percent =
    getNumber(value.percent) ??
    getNumber(value.usagePercent) ??
    getNumber(value.utilizationPercent) ??
    getNumber(value.value);

  return percent === undefined ? undefined : clampPercent(percent);
}

function calculatePercent(used: number | undefined, total: number | undefined) {
  if (used === undefined || total === undefined || total <= 0) {
    return undefined;
  }

  return clampPercent((used / total) * 100);
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function formatEndpoint(method: string, url: string) {
  try {
    const parsed = new URL(url);
    return `${method.toUpperCase()} ${parsed.pathname || "/"}`;
  } catch {
    return `${method.toUpperCase()} ${url}`;
  }
}

function formatBucketLabel(value: Date, range: MetricsTimeRange) {
  if (range === "7d" || range === "30d") {
    return value.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    });
  }

  return value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function parseLatencyMs(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function percentChange(previous: number, current: number) {
  if (!Number.isFinite(previous) || previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return roundMetric(((current - previous) / previous) * 100);
}

function weightedAverage(values: { value: number; weight: number }[]) {
  const valid = values.filter(
    (item) =>
      Number.isFinite(item.value) &&
      Number.isFinite(item.weight) &&
      item.weight > 0,
  );

  const weight = sum(valid.map((item) => item.weight));
  if (weight <= 0) {
    return 0;
  }

  return sum(valid.map((item) => item.value * item.weight)) / weight;
}

function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length > 0 ? sum(valid) / valid.length : 0;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function roundMetric(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(value < 10 ? 2 : 1));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
