import { desc, eq } from "drizzle-orm";

import { db } from "../../db";
import { loadTestRun } from "../../db/schema";

const MAX_ANALYSIS_RUNS = 20;
const MAX_ISSUES = 6;
const MAX_RECOMMENDATION_EVIDENCE = 12;
const LATENCY_SPIKE_RATIO = 2.5;
const LATENCY_SPIKE_MIN_DELTA_MS = 100;

type DbLoadTestRun = typeof loadTestRun.$inferSelect;

export type IssueSeverity = "critical" | "high" | "medium";
export type RecommendationPriority =
  | "immediate"
  | "short-term"
  | "medium-term"
  | "long-term";

type RealtimeSample = {
  duration: number;
  users: number;
  latency: number;
  errors: number;
  errorRate: number;
  requestsPerSecond: number;
};

type FinalSummary = {
  avgLatency: number;
  p90: number;
  p95: number;
  p99: number;
  requests: number;
  errors: number;
  errorRate: number;
  duration: number;
  maxThroughput: number;
  aiInsights?: AiInsight[];
  aiAnalysisStatus?: "generated" | "fallback" | "skipped";
};

type AiInsight = {
  type: "success" | "warning" | "recommendation";
  title: string;
  description: string;
};

type IssueRecommendation = {
  title: string;
  description: string;
  command: string | null;
  priority: RecommendationPriority;
  effort: string;
  impact: string;
  tradeoffs: {
    type: "pro" | "con";
    text: string;
  }[];
};

export type AnalysisHealthStatus =
  | "healthy"
  | "degraded"
  | "critical"
  | "missing";

export type AnalysisHealthComponent = {
  component: string;
  status: AnalysisHealthStatus;
  issues: number;
  detail: string;
  metrics: {
    label: string;
    value: string;
    tone: "neutral" | "success" | "warning" | "danger";
  }[];
};

export type DetectedIssue = {
  id: number;
  title: string;
  severity: IssueSeverity;
  impact: string;
  detectedAt: string;
  rootCause: {
    primary: string;
    secondary: string[];
  };
  timeline: {
    time: string;
    event: string;
    metric: string;
    change: string;
  }[];
  correlations: {
    metric: string;
    correlation: number;
    description: string;
  }[];
  affectedEndpoints: {
    endpoint: string;
    impact: string;
    severity: IssueSeverity;
  }[];
  recommendations: IssueRecommendation[];
};

export type AIAnalysisReport = {
  summary: {
    analyzedRuns: number;
    issueCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    maxLatencyMs: number;
    minLatencyMs: number;
    primaryBottleneck: string;
    latestRunId: string | null;
  };
  health: AnalysisHealthComponent[];
  spikeTimeline: {
    time: string;
    latency: number;
    requestsPerSecond: number;
    errorRate: number;
    users: number;
    normal: boolean;
    spike?: "start" | "peak";
  }[];
  issues: DetectedIssue[];
};

type AnalyzedRun = {
  record: DbLoadTestRun;
  summary: FinalSummary;
  realtimeSeries: RealtimeSample[];
  endpoint: string;
};

type IssueKind =
  | "error"
  | "tail-latency"
  | "latency-spike"
  | "throughput"
  | "stable";

type ScoredDetectedIssue = DetectedIssue & {
  issueScore: number;
  issueCreatedAt: number;
};

export class AIAnalysisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIAnalysisValidationError";
  }
}

export async function getAIAnalysisReport(userId: string) {
  const records = await db
    .select()
    .from(loadTestRun)
    .where(eq(loadTestRun.userId, userId))
    .orderBy(desc(loadTestRun.createdAt))
    .limit(MAX_ANALYSIS_RUNS);

  const analyzedRuns = records
    .filter((record) => ["completed", "failed", "stopped"].includes(record.status))
    .map(normalizeRun)
    .filter((run): run is AnalyzedRun => run !== null);

  const issues = analyzedRuns
    .flatMap((run) => createIssuesForRun(run, analyzedRuns))
    .sort((a, b) => b.issueScore - a.issueScore || b.issueCreatedAt - a.issueCreatedAt)
    .slice(0, MAX_ISSUES)
    .map((issue, index) => stripIssueScore(issue, index));

  if (issues.length === 0 && analyzedRuns.length > 0) {
    issues.push(createStableRunIssue(getWorstRunForIssue(analyzedRuns, "stable"), 0, analyzedRuns));
  }

  return {
    summary: createSummary(analyzedRuns, issues),
    health: createHealth(analyzedRuns, issues),
    spikeTimeline: createSpikeTimeline(analyzedRuns[0]),
    issues,
  };
}

function normalizeRun(record: DbLoadTestRun): AnalyzedRun | null {
  const summary = normalizeSummary(record);
  const realtimeSeries = normalizeRealtimeSeries(record.realtimeSeries);

  if (!summary && realtimeSeries.length === 0 && record.errors === 0) {
    return null;
  }

  return {
    record,
    summary:
      summary ??
      createSummaryFromRecord(record, realtimeSeries),
    realtimeSeries,
    endpoint: getEndpointLabel(record.url),
  };
}

function normalizeSummary(record: DbLoadTestRun): FinalSummary | null {
  if (!isRecord(record.summary)) {
    return null;
  }

  const avgLatency = getNumber(record.summary.avgLatency);
  const p95 = getNumber(record.summary.p95) ?? avgLatency;
  const p99 = getNumber(record.summary.p99) ?? p95;
  const requests = getNumber(record.summary.requests);

  if (
    avgLatency === undefined &&
    p95 === undefined &&
    p99 === undefined &&
    requests === undefined
  ) {
    return null;
  }

  return {
    avgLatency: avgLatency ?? parseLatencyMs(record.latency) ?? 0,
    p90: getNumber(record.summary.p90) ?? p95 ?? avgLatency ?? 0,
    p95: p95 ?? avgLatency ?? 0,
    p99: p99 ?? p95 ?? avgLatency ?? 0,
    requests: requests ?? 0,
    errors: getNumber(record.summary.errors) ?? record.errors,
    errorRate: normalizeRate(
      getNumber(record.summary.errorRate) ?? record.errorRate,
    ),
    duration: getNumber(record.summary.duration) ?? record.duration,
    maxThroughput:
      getNumber(record.summary.maxThroughput) ?? record.requestsPerSecond,
    aiInsights: normalizeAiInsights(record.summary.aiInsights),
    aiAnalysisStatus: normalizeAiAnalysisStatus(record.summary.aiAnalysisStatus),
  };
}

function createSummaryFromRecord(
  record: DbLoadTestRun,
  realtimeSeries: RealtimeSample[],
): FinalSummary {
  const avgLatency = parseLatencyMs(record.latency) ?? 0;
  const maxLatency = Math.max(avgLatency, ...realtimeSeries.map((item) => item.latency));
  const maxThroughput = Math.max(
    record.requestsPerSecond,
    ...realtimeSeries.map((item) => item.requestsPerSecond),
  );

  return {
    avgLatency,
    p90: maxLatency,
    p95: maxLatency,
    p99: maxLatency,
    requests: 0,
    errors: record.errors,
    errorRate: normalizeRate(record.errorRate),
    duration: record.duration,
    maxThroughput,
  };
}

function normalizeRealtimeSeries(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const duration = getNumber(item.duration);
      const users = getNumber(item.users);
      const latency = getNumber(item.latency);
      const errors = getNumber(item.errors);
      const errorRate = getNumber(item.errorRate);
      const requestsPerSecond = getNumber(item.requestsPerSecond);

      if (
        duration === undefined ||
        users === undefined ||
        latency === undefined ||
        errors === undefined ||
        errorRate === undefined ||
        requestsPerSecond === undefined
      ) {
        return null;
      }

      return {
        duration,
        users,
        latency,
        errors,
        errorRate,
        requestsPerSecond,
      };
    })
    .filter((item): item is RealtimeSample => item !== null);
}

function createIssuesForRun(run: AnalyzedRun, allRuns: AnalyzedRun[]) {
  const issues: ScoredDetectedIssue[] = [];
  const summary = run.summary;
  const errorSeverity = getErrorSeverity(summary.errorRate, summary.errors);

  if (errorSeverity) {
    issues.push(
      createScoredIssue(
        createErrorIssue(run, issues.length, errorSeverity, allRuns),
        run,
        "error",
      ),
    );
  }

  if (summary.p95 >= Math.max(500, summary.avgLatency * 2)) {
    issues.push(
      createScoredIssue(
        createTailLatencyIssue(
          run,
          issues.length,
          summary.p99 >= 1_500 ? "critical" : "high",
          allRuns,
        ),
        run,
        "tail-latency",
      ),
    );
  }

  const spike = findLatencySpike(run.realtimeSeries);

  if (spike) {
    issues.push(
      createScoredIssue(
        createLatencySpikeIssue(run, issues.length, spike, allRuns),
        run,
        "latency-spike",
      ),
    );
  }

  if (
    summary.requests === 0 &&
    summary.maxThroughput === 0 &&
    run.record.status === "failed"
  ) {
    issues.push(
      createScoredIssue(
        createThroughputIssue(run, issues.length, allRuns),
        run,
        "throughput",
      ),
    );
  }

  return issues.map((issue, index) => ({
    ...issue,
    id: index,
  }));
}

function createErrorIssue(
  run: AnalyzedRun,
  id: number,
  severity: IssueSeverity,
  allRuns: AnalyzedRun[],
): DetectedIssue {
  const errorRate = formatPercent(run.summary.errorRate);
  const firstAiWarning = run.summary.aiInsights?.find(
    (insight) => insight.type === "warning",
  );

  return {
    id,
    title: "Request failures detected",
    severity,
    impact: `${run.summary.errors} failed requests, ${errorRate} error rate`,
    detectedAt: formatDetectedAt(run.record),
    rootCause: {
      primary:
        run.record.errorMessage ??
        firstAiWarning?.title ??
        "The run completed with failed HTTP requests.",
      secondary: [
        `Backend stored status: ${run.record.status}`,
        `Target: ${run.record.method} ${run.endpoint}`,
        `Error rate crossed the healthy baseline: ${errorRate}`,
      ],
    },
    timeline: createTimeline(run, "error", allRuns),
    correlations: [
      {
        metric: "Error rate",
        correlation: severity === "critical" ? 0.96 : 0.88,
        description: "Failed requests are the strongest signal for this issue.",
      },
      {
        metric: "Latency",
        correlation: run.summary.p95 > run.summary.avgLatency ? 0.74 : 0.42,
        description: "Latency often rises when retries or failed upstream calls appear.",
      },
    ],
    affectedEndpoints: [
      {
        endpoint: run.endpoint,
        impact: `${run.summary.errors} failures during the selected load test`,
        severity,
      },
    ],
    recommendations: createEvidenceBackedAiRecommendations(
      run,
      "error",
      allRuns,
    ),
  };
}

function createTailLatencyIssue(
  run: AnalyzedRun,
  id: number,
  severity: IssueSeverity,
  allRuns: AnalyzedRun[],
): DetectedIssue {
  return {
    id,
    title: "Tail latency is much higher than average",
    severity,
    impact: `Average ${formatLatency(run.summary.avgLatency)}, p95 ${formatLatency(
      run.summary.p95,
    )}, p99 ${formatLatency(run.summary.p99)}`,
    detectedAt: formatDetectedAt(run.record),
    rootCause: {
      primary: "A minority of requests are significantly slower than the average request.",
      secondary: [
        `p95 is ${formatRatio(run.summary.p95, run.summary.avgLatency)}x the average latency.`,
        `p99 reached ${formatLatency(run.summary.p99)}.`,
        `The run used ${run.record.users.toLocaleString("en-US")} virtual users for ${run.summary.duration}s.`,
      ],
    },
    timeline: createTimeline(run, "tail-latency", allRuns),
    correlations: [
      {
        metric: "p95 latency",
        correlation: 0.93,
        description: "Tail latency is the primary signal for this issue.",
      },
      {
        metric: "Virtual users",
        correlation: run.record.users > 1 ? 0.7 : 0.35,
        description: "More concurrent users can expose queuing or slow downstream work.",
      },
      {
        metric: "Throughput",
        correlation: run.summary.maxThroughput > 0 ? -0.58 : 0,
        description: "Throughput can flatten while slow requests accumulate.",
      },
    ],
    affectedEndpoints: [
      {
        endpoint: run.endpoint,
        impact: `p95 ${formatLatency(run.summary.p95)} under ${run.record.users.toLocaleString("en-US")} users`,
        severity,
      },
    ],
    recommendations: createEvidenceBackedAiRecommendations(
      run,
      "tail-latency",
      allRuns,
    ),
  };
}

function createLatencySpikeIssue(
  run: AnalyzedRun,
  id: number,
  spike: { previous: RealtimeSample; peak: RealtimeSample },
  allRuns: AnalyzedRun[],
): DetectedIssue {
  return {
    id,
    title: "Latency spike during the run",
    severity: spike.peak.latency >= 1_000 ? "high" : "medium",
    impact: `${formatLatency(spike.previous.latency)} to ${formatLatency(
      spike.peak.latency,
    )} while test was running`,
    detectedAt: `${Math.round(spike.peak.duration)}s`,
    rootCause: {
      primary:
        "Realtime samples show a sudden latency jump compared with the previous captured point.",
      secondary: [
        `Users at spike: ${spike.peak.users.toLocaleString("en-US")}`,
        `Throughput at spike: ${formatNumber(spike.peak.requestsPerSecond)} req/s`,
        `Error rate at spike: ${formatPercent(normalizeRate(spike.peak.errorRate))}`,
      ],
    },
    timeline: createTimeline(run, "latency-spike", allRuns, spike),
    correlations: [
      {
        metric: "Realtime latency",
        correlation: 0.91,
        description: "The spike is derived directly from the realtime latency series.",
      },
      {
        metric: "Active users",
        correlation: spike.peak.users > spike.previous.users ? 0.72 : 0.38,
        description: "The spike happened while concurrency was changing or under pressure.",
      },
    ],
    affectedEndpoints: [
      {
        endpoint: run.endpoint,
        impact: `Peak realtime latency ${formatLatency(spike.peak.latency)}`,
        severity: spike.peak.latency >= 1_000 ? "high" : "medium",
      },
    ],
    recommendations: createEvidenceBackedAiRecommendations(
      run,
      "latency-spike",
      allRuns,
      spike,
    ),
  };
}

function createThroughputIssue(
  run: AnalyzedRun,
  id: number,
  allRuns: AnalyzedRun[],
): DetectedIssue {
  return {
    id,
    title: "No successful throughput recorded",
    severity: "high",
    impact: "The run did not record successful request throughput.",
    detectedAt: formatDetectedAt(run.record),
    rootCause: {
      primary:
        run.record.errorMessage ??
        "k6 did not produce successful request throughput for this run.",
      secondary: [
        `Target: ${run.record.method} ${run.endpoint}`,
        `Configured users: ${run.record.users.toLocaleString("en-US")}`,
        `Configured duration: ${run.record.duration}s`,
      ],
    },
    timeline: createTimeline(run, "throughput", allRuns),
    correlations: [
      {
        metric: "Throughput",
        correlation: -1,
        description: "Zero throughput is the defining signal for this issue.",
      },
    ],
    affectedEndpoints: [
      {
        endpoint: run.endpoint,
        impact: "0 req/s captured in the stored summary",
        severity: "high",
      },
    ],
    recommendations: createEvidenceBackedAiRecommendations(
      run,
      "throughput",
      allRuns,
    ),
  };
}

function createStableRunIssue(
  run: AnalyzedRun,
  id: number,
  allRuns: AnalyzedRun[],
): DetectedIssue {
  return {
    id,
    title: "No major issue detected",
    severity: "medium",
    impact: `Latest run looks stable: avg ${formatLatency(
      run.summary.avgLatency,
    )}, p95 ${formatLatency(run.summary.p95)}, ${formatPercent(
      run.summary.errorRate,
    )} error rate`,
    detectedAt: formatDetectedAt(run.record),
    rootCause: {
      primary: "Stored load test metrics are within the default analysis thresholds.",
      secondary: [
        `Throughput: ${formatNumber(run.summary.maxThroughput)} req/s`,
        `Requests: ${run.summary.requests.toLocaleString("en-US")}`,
        `Endpoint: ${run.record.method} ${run.endpoint}`,
      ],
    },
    timeline: createTimeline(run, "stable", allRuns),
    correlations: [
      {
        metric: "Error rate",
        correlation: 0,
        description: "No error-rate pressure was found in this run.",
      },
      {
        metric: "p95 latency",
        correlation: 0.24,
        description: "Tail latency stayed near the average latency baseline.",
      },
    ],
    affectedEndpoints: [
      {
        endpoint: run.endpoint,
        impact: "No critical impact found in stored metrics",
        severity: "medium",
      },
    ],
    recommendations: createEvidenceBackedAiRecommendations(
      run,
      "stable",
      allRuns,
    ),
  };
}

function createTimeline(
  run: AnalyzedRun,
  kind: IssueKind,
  allRuns: AnalyzedRun[],
  spike?: { previous: RealtimeSample; peak: RealtimeSample },
) {
  const comparedRuns = allRuns.length > 0 ? allRuns : [run];
  const worstRun = getWorstRunForIssue(comparedRuns, kind);
  const rank = getIssueRank(run, comparedRuns, kind);
  const target = `${run.record.method} ${run.endpoint}`;
  const worstTarget = `${worstRun.record.method} ${worstRun.endpoint}`;

  return [
    {
      time: formatDetectedAt(run.record),
      event: `${target} evaluated against ${comparedRuns.length} analyzed runs`,
      metric: "scope",
      change: `rank #${rank}`,
    },
    {
      time: getIssueEventTime(run, kind, spike),
      event: getIssueEvent(run, kind, spike),
      metric: getIssueMetric(kind),
      change: getIssueChange(run, kind, spike),
    },
    {
      time: "all runs",
      event:
        run.record.id === worstRun.record.id
          ? `${target} is the strongest ${getIssueLabel(kind)} signal`
          : `Strongest ${getIssueLabel(kind)} signal is at ${worstTarget}`,
      metric: "endpoint",
      change: formatIssueValue(worstRun, kind),
    },
  ];
}

function createScoredIssue(
  issue: DetectedIssue,
  run: AnalyzedRun,
  kind: IssueKind,
): ScoredDetectedIssue {
  return {
    ...issue,
    issueScore: getSeverityScore(issue.severity) + getIssueSignalScore(run, kind),
    issueCreatedAt: (
      run.record.completedAt ??
      run.record.updatedAt ??
      run.record.createdAt
    ).getTime(),
  };
}

function stripIssueScore(issue: ScoredDetectedIssue, id: number): DetectedIssue {
  const { issueScore, issueCreatedAt, ...detectedIssue } = issue;
  void issueScore;
  void issueCreatedAt;

  return {
    ...detectedIssue,
    id,
  };
}

function getSeverityScore(severity: IssueSeverity) {
  if (severity === "critical") {
    return 1_000_000;
  }

  if (severity === "high") {
    return 100_000;
  }

  return 10_000;
}

function getIssueSignalScore(run: AnalyzedRun, kind: IssueKind) {
  if (kind === "error") {
    return run.summary.errorRate * 10_000 + run.summary.errors;
  }

  if (kind === "tail-latency") {
    return run.summary.p95;
  }

  if (kind === "latency-spike") {
    const spike = findLatencySpike(run.realtimeSeries);
    return spike ? spike.peak.latency - spike.previous.latency : 0;
  }

  if (kind === "throughput") {
    return run.summary.maxThroughput <= 0 ? 10_000 : 1 / run.summary.maxThroughput;
  }

  return run.summary.p95 + run.summary.errorRate * 10_000;
}

function getWorstRunForIssue(runs: AnalyzedRun[], kind: IssueKind) {
  return runs.reduce((worst, run) =>
    getIssueSignalScore(run, kind) > getIssueSignalScore(worst, kind)
      ? run
      : worst,
  );
}

function getIssueRank(run: AnalyzedRun, allRuns: AnalyzedRun[], kind: IssueKind) {
  const rankedRuns = [...allRuns].sort(
    (a, b) => getIssueSignalScore(b, kind) - getIssueSignalScore(a, kind),
  );

  return Math.max(
    1,
    rankedRuns.findIndex((rankedRun) => rankedRun.record.id === run.record.id) + 1,
  );
}

function getIssueEventTime(
  run: AnalyzedRun,
  kind: IssueKind,
  spike?: { previous: RealtimeSample; peak: RealtimeSample },
) {
  if (kind === "latency-spike" && spike) {
    return `${Math.round(spike.peak.duration)}s`;
  }

  return formatDetectedAt(run.record);
}

function getIssueEvent(
  run: AnalyzedRun,
  kind: IssueKind,
  spike?: { previous: RealtimeSample; peak: RealtimeSample },
) {
  if (kind === "error") {
    return `${run.summary.errors} failed requests on ${run.record.method} ${run.endpoint}`;
  }

  if (kind === "tail-latency") {
    return `p95 latency reached ${formatLatency(run.summary.p95)} on ${run.record.method} ${run.endpoint}`;
  }

  if (kind === "latency-spike" && spike) {
    return `Latency spiked from ${formatLatency(spike.previous.latency)} to ${formatLatency(
      spike.peak.latency,
    )} on ${run.record.method} ${run.endpoint}`;
  }

  if (kind === "throughput") {
    return `${run.record.method} ${run.endpoint} recorded ${formatNumber(
      run.summary.maxThroughput,
    )} req/s`;
  }

  return `${run.record.method} ${run.endpoint} stayed within the current thresholds`;
}

function getIssueMetric(kind: IssueKind) {
  if (kind === "error") {
    return "error rate";
  }

  if (kind === "tail-latency" || kind === "latency-spike") {
    return "latency";
  }

  if (kind === "throughput") {
    return "throughput";
  }

  return "status";
}

function getIssueChange(
  run: AnalyzedRun,
  kind: IssueKind,
  spike?: { previous: RealtimeSample; peak: RealtimeSample },
) {
  if (kind === "error") {
    return formatPercent(run.summary.errorRate);
  }

  if (kind === "tail-latency") {
    return formatDeltaPercent(run.summary.p95, run.summary.avgLatency);
  }

  if (kind === "latency-spike" && spike) {
    return formatDeltaPercent(spike.peak.latency, spike.previous.latency);
  }

  if (kind === "throughput") {
    return `${formatNumber(run.summary.maxThroughput)} req/s`;
  }

  return run.record.status;
}

function getIssueLabel(kind: IssueKind) {
  if (kind === "error") {
    return "failure";
  }

  if (kind === "tail-latency") {
    return "tail latency";
  }

  if (kind === "latency-spike") {
    return "latency spike";
  }

  if (kind === "throughput") {
    return "throughput";
  }

  return "baseline";
}

function formatIssueValue(run: AnalyzedRun, kind: IssueKind) {
  if (kind === "error") {
    return `${formatPercent(run.summary.errorRate)} errors`;
  }

  if (kind === "tail-latency") {
    return formatLatency(run.summary.p95);
  }

  if (kind === "latency-spike") {
    const spike = findLatencySpike(run.realtimeSeries);
    return spike ? formatLatency(spike.peak.latency) : "no spike";
  }

  if (kind === "throughput") {
    return `${formatNumber(run.summary.maxThroughput)} req/s`;
  }

  return run.record.status;
}

function createEvidenceBackedAiRecommendations(
  run: AnalyzedRun,
  kind: IssueKind,
  allRuns: AnalyzedRun[],
  spike?: { previous: RealtimeSample; peak: RealtimeSample },
): IssueRecommendation[] {
  const recommendations = collectGeneratedAiRecommendations(run, allRuns);
  const evidence = createRecommendationEvidence(run, kind, allRuns, spike);

  return recommendations.slice(0, 3).map(({ insight, sourceRun }) => ({
    title: insight.title,
    description: [insight.description, evidence].filter(Boolean).join("\n\n"),
    command: null,
    priority: getRecommendationPriority(kind),
    effort: "From stored AI analysis",
    impact: `Generated for ${sourceRun.record.method} ${sourceRun.endpoint} from saved load-test evidence.`,
    tradeoffs: [
      {
        type: "pro",
        text: "Uses generated AI insight already persisted with the load-test run.",
      },
      {
        type: "con",
        text: "No recommendation is fabricated when the run only has fallback or missing AI analysis.",
      },
    ],
  }));
}

function collectGeneratedAiRecommendations(
  run: AnalyzedRun,
  allRuns: AnalyzedRun[],
) {
  const orderedRuns = [
    run,
    ...allRuns.filter((candidate) => candidate.record.id !== run.record.id),
  ];
  const seen = new Set<string>();

  return orderedRuns.flatMap((sourceRun) => {
    if (sourceRun.summary.aiAnalysisStatus !== "generated") {
      return [];
    }

    return (sourceRun.summary.aiInsights ?? [])
      .filter((insight) => insight.type === "recommendation")
      .flatMap((insight) => {
        const key = `${insight.title}:${insight.description}`;

        if (seen.has(key)) {
          return [];
        }

        seen.add(key);

        return [{ insight, sourceRun }];
      });
  });
}

function createRecommendationEvidence(
  run: AnalyzedRun,
  kind: IssueKind,
  allRuns: AnalyzedRun[],
  spike?: { previous: RealtimeSample; peak: RealtimeSample },
) {
  const evidence = [
    `Issue source: ${run.record.method} ${run.endpoint}`,
    `Current run: errors ${run.summary.errors}, error rate ${formatPercent(
      run.summary.errorRate,
    )}, avg ${formatLatency(run.summary.avgLatency)}, p95 ${formatLatency(
      run.summary.p95,
    )}, p99 ${formatLatency(run.summary.p99)}, max RPS ${formatNumber(
      run.summary.maxThroughput,
    )}`,
    ...createAllRunErrorEvidence(allRuns),
    ...createAllRunSpikeEvidence(allRuns, spike),
  ];

  if (kind === "throughput") {
    evidence.push(
      `Throughput signal: ${run.record.status}, ${formatNumber(
        run.summary.maxThroughput,
      )} req/s, ${formatNumber(run.summary.requests)} requests`,
    );
  }

  if (kind === "stable") {
    evidence.push(`Stable signal: ${allRuns.length} runs evaluated without a higher-severity issue.`);
  }

  return `Evidence used: ${evidence.slice(0, MAX_RECOMMENDATION_EVIDENCE).join(" | ")}`;
}

function createAllRunErrorEvidence(allRuns: AnalyzedRun[]) {
  return allRuns
    .filter(
      (run) =>
        run.summary.errors > 0 ||
        run.summary.errorRate > 0 ||
        Boolean(run.record.errorMessage) ||
        extractLogErrorLines(run.record.log).length > 0,
    )
    .flatMap((run) => {
      const logLines = extractLogErrorLines(run.record.log);

      return [
        `Error run ${run.record.method} ${run.endpoint}: ${run.summary.errors} errors, ${formatPercent(
          run.summary.errorRate,
        )} error rate${run.record.errorMessage ? `, message: ${run.record.errorMessage}` : ""}`,
        ...logLines.map((line) => `Log error ${run.endpoint}: ${line}`),
      ];
    });
}

function createAllRunSpikeEvidence(
  allRuns: AnalyzedRun[],
  selectedSpike?: { previous: RealtimeSample; peak: RealtimeSample },
) {
  const spikeEvidence = allRuns.flatMap((run) =>
    findAllLatencySpikes(run.realtimeSeries).map((spike) =>
      `Spike ${run.record.method} ${run.endpoint} at ${Math.round(
        spike.peak.duration,
      )}s: ${formatLatency(spike.previous.latency)} -> ${formatLatency(
        spike.peak.latency,
      )}`,
    ),
  );

  if (selectedSpike) {
    return [
      `Selected spike: ${formatLatency(selectedSpike.previous.latency)} -> ${formatLatency(
        selectedSpike.peak.latency,
      )} at ${Math.round(selectedSpike.peak.duration)}s`,
      ...spikeEvidence,
    ];
  }

  return spikeEvidence;
}

function extractLogErrorLines(log: string | null) {
  if (!log) {
    return [];
  }

  return log
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\b(error|failed|fail|exception|timeout)\b/i.test(line))
    .slice(-3);
}

function findAllLatencySpikes(samples: RealtimeSample[]) {
  const spikes: { previous: RealtimeSample; peak: RealtimeSample }[] = [];

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const peak = samples[index];

    if (
      previous.latency > 0 &&
      peak.latency >= previous.latency * LATENCY_SPIKE_RATIO &&
      peak.latency - previous.latency >= LATENCY_SPIKE_MIN_DELTA_MS
    ) {
      spikes.push({ previous, peak });
    }
  }

  return spikes;
}

function getRecommendationPriority(kind: IssueKind): RecommendationPriority {
  if (kind === "error" || kind === "throughput") {
    return "immediate";
  }

  if (kind === "latency-spike") {
    return "short-term";
  }

  if (kind === "tail-latency") {
    return "medium-term";
  }

  return "long-term";
}

function createSummary(analyzedRuns: AnalyzedRun[], issues: DetectedIssue[]) {
  const latencyValues = analyzedRuns
    .flatMap((run) => [run.summary.avgLatency, run.summary.p95, run.summary.p99])
    .filter((value) => Number.isFinite(value) && value > 0);
  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const highCount = issues.filter((issue) => issue.severity === "high").length;
  const mediumCount = issues.filter((issue) => issue.severity === "medium").length;

  return {
    analyzedRuns: analyzedRuns.length,
    issueCount: issues.length,
    criticalCount,
    highCount,
    mediumCount,
    maxLatencyMs: latencyValues.length > 0 ? Math.max(...latencyValues) : 0,
    minLatencyMs: latencyValues.length > 0 ? Math.min(...latencyValues) : 0,
    primaryBottleneck: issues[0]?.rootCause.primary ?? "No completed load test data available yet.",
    latestRunId: analyzedRuns[0]?.record.id ?? null,
  };
}

function createHealth(
  analyzedRuns: AnalyzedRun[],
  issues: DetectedIssue[],
): AnalysisHealthComponent[] {
  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const highCount = issues.filter((issue) => issue.severity === "high").length;

  if (analyzedRuns.length === 0) {
    return [
      {
        component: "Load test data",
        status: "missing",
        issues: 0,
        detail: "No completed load test run is available for analysis.",
        metrics: [
          { label: "Runs", value: "0", tone: "neutral" },
          { label: "Source", value: "load_test_run", tone: "neutral" },
        ],
      },
    ];
  }

  const totalErrors = analyzedRuns.reduce(
    (total, run) => total + run.summary.errors,
    0,
  );
  const totalRequests = analyzedRuns.reduce(
    (total, run) => total + run.summary.requests,
    0,
  );
  const overallErrorRate =
    totalRequests > 0
      ? totalErrors / totalRequests
      : Math.max(...analyzedRuns.map((run) => run.summary.errorRate));
  const avgLatency = getAverage(
    analyzedRuns.map((run) => run.summary.avgLatency),
  );
  const maxP95 = Math.max(...analyzedRuns.map((run) => run.summary.p95));
  const maxThroughput = Math.max(
    ...analyzedRuns.map((run) => run.summary.maxThroughput),
  );

  return [
    {
      component: "Reliability",
      status:
        overallErrorRate >= 0.05
          ? "critical"
          : overallErrorRate > 0
            ? "degraded"
            : "healthy",
      issues: issues.filter((issue) => issue.title.includes("fail")).length,
      detail: "Based on stored request errors and error rate across all analyzed runs.",
      metrics: [
        { label: "Errors", value: String(totalErrors), tone: totalErrors > 0 ? "danger" : "success" },
        { label: "Error rate", value: formatPercent(overallErrorRate), tone: overallErrorRate > 0 ? "danger" : "success" },
      ],
    },
    {
      component: "Latency",
      status:
        maxP95 >= 1_500
          ? "critical"
          : maxP95 >= 500
            ? "degraded"
            : "healthy",
      issues: issues.filter((issue) => issue.title.toLowerCase().includes("latency")).length,
      detail: "Based on avg, p95, p99, and realtime latency samples across all analyzed runs.",
      metrics: [
        { label: "Avg", value: formatLatency(avgLatency), tone: "neutral" },
        { label: "Max p95", value: formatLatency(maxP95), tone: maxP95 >= 500 ? "warning" : "success" },
      ],
    },
    {
      component: "Throughput",
      status:
        maxThroughput <= 0
          ? "critical"
          : highCount > 0 || criticalCount > 0
            ? "degraded"
            : "healthy",
      issues: issues.filter((issue) => issue.title.toLowerCase().includes("throughput")).length,
      detail: "Based on request count and requests per second across all analyzed runs.",
      metrics: [
        { label: "Max RPS", value: `${formatNumber(maxThroughput)} req/s`, tone: maxThroughput > 0 ? "success" : "danger" },
        { label: "Requests", value: formatNumber(totalRequests), tone: "neutral" },
      ],
    },
    {
      component: "Test coverage",
      status: analyzedRuns.length >= 3 ? "healthy" : "degraded",
      issues: 0,
      detail: "Based on how many stored runs can be compared.",
      metrics: [
        { label: "Analyzed", value: String(analyzedRuns.length), tone: analyzedRuns.length >= 3 ? "success" : "warning" },
        { label: "Completed", value: String(analyzedRuns.filter((run) => run.record.status === "completed").length), tone: "neutral" },
      ],
    },
  ];
}

function getAverage(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value));

  if (validValues.length === 0) {
    return 0;
  }

  return validValues.reduce((total, value) => total + value, 0) / validValues.length;
}

function createSpikeTimeline(run: AnalyzedRun | undefined) {
  if (!run) {
    return [];
  }

  const samples =
    run.realtimeSeries.length > 0
      ? run.realtimeSeries
      : [
          {
            duration: run.summary.duration,
            users: run.record.users,
            latency: run.summary.avgLatency,
            errors: run.summary.errors,
            errorRate: run.summary.errorRate * 100,
            requestsPerSecond: run.summary.maxThroughput,
          },
        ];
  const peak = samples.reduce((max, item) =>
    item.latency > max.latency ? item : max,
  );
  let spikeStarted = false;

  return samples.map((sample, index) => {
    const baseline = getPreviousAverageLatency(samples, index, 5);
    const isSpike =
      baseline !== null &&
      baseline > 0 &&
      sample.latency >= baseline * LATENCY_SPIKE_RATIO &&
      sample.latency - baseline >= LATENCY_SPIKE_MIN_DELTA_MS;
    const spike = sample === peak && isSpike
      ? "peak"
      : isSpike && !spikeStarted
        ? "start"
        : undefined;

    if (isSpike) {
      spikeStarted = true;
    }

    return {
      time: `${Math.round(sample.duration)}s`,
      latency: round(sample.latency, 1),
      requestsPerSecond: round(sample.requestsPerSecond, 2),
      errorRate: round(normalizeRate(sample.errorRate) * 100, 2),
      users: Math.round(sample.users),
      normal: !isSpike,
      spike,
    };
  });
}

function getPreviousAverageLatency(
  samples: RealtimeSample[],
  index: number,
  pointCount: number,
) {
  const previousSamples = samples.slice(Math.max(0, index - pointCount), index);

  if (previousSamples.length === 0) {
    return null;
  }

  return (
    previousSamples.reduce((total, sample) => total + sample.latency, 0) /
    previousSamples.length
  );
}

function findLatencySpike(samples: RealtimeSample[]) {
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const peak = samples[index];

    if (
      previous.latency > 0 &&
      peak.latency >= previous.latency * LATENCY_SPIKE_RATIO &&
      peak.latency - previous.latency >= LATENCY_SPIKE_MIN_DELTA_MS
    ) {
      return { previous, peak };
    }
  }

  return null;
}

function getErrorSeverity(
  errorRate: number,
  errors: number,
): IssueSeverity | null {
  if (errorRate >= 0.1 || errors >= 100) {
    return "critical";
  }

  if (errorRate >= 0.02 || errors >= 10) {
    return "high";
  }

  if (errorRate > 0 || errors > 0) {
    return "medium";
  }

  return null;
}

function normalizeAiInsights(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const insights = value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const type = getString(item.type);
      const title = getString(item.title);
      const description = getString(item.description);

      if (!["success", "warning", "recommendation"].includes(type) || !title || !description) {
        return null;
      }

      return {
        type: type as AiInsight["type"],
        title,
        description,
      };
    })
    .filter((item): item is AiInsight => item !== null);

  return insights.length > 0 ? insights : undefined;
}

function normalizeAiAnalysisStatus(value: unknown) {
  return value === "generated" || value === "fallback" || value === "skipped"
    ? value
    : undefined;
}

function getEndpointLabel(url: string) {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.pathname}${parsedUrl.search}` || parsedUrl.hostname;
  } catch {
    return url;
  }
}

function formatDetectedAt(record: DbLoadTestRun) {
  return (record.completedAt ?? record.updatedAt ?? record.createdAt).toISOString();
}

function parseLatencyMs(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatLatency(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: value < 1 ? 3 : value < 100 ? 2 : 1,
  })}ms`;
}

function formatPercent(value: number) {
  return `${round(normalizeRate(value) * 100, 2)}%`;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: value < 100 ? 2 : 0,
  });
}

function formatRatio(value: number, baseline: number) {
  if (!Number.isFinite(value) || !Number.isFinite(baseline) || baseline <= 0) {
    return "0";
  }

  return String(round(value / baseline, 1));
}

function formatDeltaPercent(value: number, baseline: number) {
  if (!Number.isFinite(value) || !Number.isFinite(baseline) || baseline <= 0) {
    return "baseline";
  }

  const delta = ((value - baseline) / baseline) * 100;
  const sign = delta > 0 ? "+" : "";

  return `${sign}${round(delta, 1)}%`;
}

function normalizeRate(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return value > 1 ? value / 100 : value;
}

function round(value: number, digits: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(digits));
}

function getNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
