import {
  getAIAnalysisReport,
  type DetectedIssue,
  type IssueSeverity,
} from "../aianalysis/aianalysis.service";
import {
  getBackendMetrics,
  type MetricsTimeRange,
} from "../metrics/metrics.service";

type MetricColor = "red" | "orange" | "green" | "blue" | "purple";
type MetricStatus = "critical" | "warning" | "good" | "info";
type MetricTrend = "up" | "down" | "neutral";

type OverviewMetric = {
  label: string;
  value: string;
  unit: string;
  icon: "clock" | "alert-triangle" | "zap" | "activity" | "database";
  color: MetricColor;
  status: MetricStatus;
  change: number | null;
  trend: MetricTrend;
  subtext?: string;
};

type BackendMetrics = Awaited<ReturnType<typeof getBackendMetrics>>;
type OverviewAnalysis = Awaited<ReturnType<typeof getAIAnalysisReport>>;
type MetricsSummary = BackendMetrics["summary"];
type EndpointBreakdown = BackendMetrics["endpointBreakdown"][number];
type LatencyPoint = BackendMetrics["latencyTimeSeriesData"][number];

const MAX_OVERVIEW_SCENARIOS = 5;
const MAX_OVERVIEW_ISSUES = 3;
const MAX_OVERVIEW_RECOMMENDATIONS = 4;
const EVIDENCE_SEPARATOR = "Evidence used:";
const OVERVIEW_DEFAULT_RANGE: MetricsTimeRange = "3d";
const LATENCY_SLA_MS = 1_500;

export async function getOverviewDashboard(
  userId: string,
  rangeInput: string | undefined,
) {
  const [metrics, analysis] = await Promise.all([
    getBackendMetrics(userId, rangeInput ?? OVERVIEW_DEFAULT_RANGE),
    getAIAnalysisReport(userId),
  ]);

  const latestRun = metrics.source.includedRuns.at(-1);
  const overviewIssues = dedupeIssues(analysis.issues).slice(
    0,
    MAX_OVERVIEW_ISSUES,
  );

  return {
    generatedAt: new Date().toISOString(),
    timeRange: metrics.timeRange,
    source: {
      metrics: metrics.source.primary,
      aiAnalysis: "load_test_run.summary.aiInsights and derived analysis",
      note:
        "Overview is derived from k6 load-test metrics and stored AI analysis only. Optional infrastructure signals are not inferred.",
    },
    header: {
      title: "Performance Dashboard",
      description: latestRun
        ? `Latest run: ${latestRun.createdAt} | ${formatNumber(latestRun.requests)} requests | ${formatLatency(latestRun.avgLatency)} avg latency`
        : "No completed load-test data available yet",
      badges: createIssueBadges(overviewIssues),
    },
    keyMetrics: createKeyMetrics(metrics.summary, analysis, overviewIssues),
    latencyTrend: createLatencyTrend(metrics.latencyTimeSeriesData, analysis),
    scenarios: createScenarios(metrics.endpointBreakdown),
    aiAnalysis: {
      summary: analysis.summary,
      rootCause: analysis.summary.primaryBottleneck,
      issuesFound: overviewIssues.length,
      issues: overviewIssues.map(createOverviewIssue),
    },
    recommendations: createRecommendations(overviewIssues),
    performanceSignals: createPerformanceSignals(
      metrics.summary,
      analysis,
      overviewIssues,
    ),
  };
}

function createKeyMetrics(
  summary: MetricsSummary,
  analysis: OverviewAnalysis,
  overviewIssues: DetectedIssue[],
): OverviewMetric[] {
  const errorRate = getMetricValue(summary.errorRate.value);
  const throughput = getMetricValue(summary.requestsPerSecond.value);
  const latencyP95 = analysis.summary.maxLatencyMs;
  const criticalCount = countIssuesBySeverity(overviewIssues, "critical");
  const highCount = countIssuesBySeverity(overviewIssues, "high");

  return [
    {
      label: "Latency P95",
      value: formatPlainNumber(latencyP95),
      unit: "ms",
      icon: "clock",
      color: latencyP95 >= 1_500 ? "red" : latencyP95 >= 500 ? "orange" : "green",
      status: latencyP95 >= 1_500 ? "critical" : latencyP95 >= 500 ? "warning" : "good",
      change: getMetricChange(summary.avgResponseTime.change),
      trend: getTrend(summary.avgResponseTime.change),
      subtext: "From AI analysis tail-latency signals",
    },
    {
      label: "Error Rate",
      value: formatPlainNumber(errorRate),
      unit: "%",
      icon: "alert-triangle",
      color: errorRate >= 5 ? "red" : errorRate > 0 ? "orange" : "green",
      status: errorRate >= 5 ? "critical" : errorRate > 0 ? "warning" : "good",
      change: getMetricChange(summary.errorRate.change),
      trend: getTrend(summary.errorRate.change),
      subtext: errorRate > 0 ? "Failures detected" : "No request failures",
    },
    {
      label: "Throughput",
      value: formatPlainNumber(throughput),
      unit: "req/s",
      icon: "zap",
      color: throughput <= 0 ? "red" : "blue",
      status: throughput <= 0 ? "critical" : "info",
      change: getMetricChange(summary.requestsPerSecond.change),
      trend: getTrend(summary.requestsPerSecond.change),
      subtext: "Aggregated from completed runs",
    },
    {
      label: "AI Issues",
      value: String(analysis.summary.issueCount),
      unit: "",
      icon: "activity",
      color:
        criticalCount > 0
          ? "red"
          : highCount > 0
            ? "orange"
            : "purple",
      status:
        criticalCount > 0
          ? "critical"
          : highCount > 0
            ? "warning"
            : "info",
      change: null,
      trend: "neutral",
      subtext: `${analysis.summary.analyzedRuns} analyzed runs`,
    },
  ];
}

function createLatencyTrend(
  latencyData: LatencyPoint[],
  analysis: OverviewAnalysis,
) {
  const spikeByTime = new Map(
    analysis.spikeTimeline.map((point) => [point.time, point]),
  );

  return latencyData.map((point) => {
    const spike = spikeByTime.get(point.time);

    return {
      time: point.time,
      value: point.p95,
      p50: point.p50,
      p95: point.p95,
      p99: point.p99,
      avg: point.avg,
      users: spike?.users ?? 0,
      normal: spike?.normal ?? true,
      spike: spike?.spike,
    };
  });
}

function createScenarios(endpoints: EndpointBreakdown[]) {
  return endpoints.slice(0, MAX_OVERVIEW_SCENARIOS).map((endpoint, index) => {
    const status = getScenarioStatus(endpoint);

    return {
      id: endpoint.runId,
      name: getScenarioName(endpoint.endpoint, index),
      endpoint: endpoint.endpoint,
      latency: `${formatPlainNumber(endpoint.p95)}ms`,
      status,
      requests: endpoint.requests,
      errors: endpoint.errors,
      color: getScenarioColor(index, status),
    };
  });
}

function createOverviewIssue(issue: DetectedIssue) {
  const recommendation = getPrimaryRecommendation(issue);

  return {
    id: issue.id,
    title: issue.title,
    severity: issue.severity,
    impact: issue.impact,
    recommendation:
      recommendation?.title ?? "Review the captured load-test evidence.",
    progress: getIssueSignalProgress(issue),
    affectedEndpoints: issue.affectedEndpoints,
  };
}

function createRecommendations(issues: DetectedIssue[]) {
  const seen = new Set<string>();

  return issues
    .flatMap((issue) => {
      const issueKey = getIssueKey(issue);
      const recommendation = getPrimaryRecommendation(issue);

      return recommendation
        ? [
            {
              dedupeKey: getRecommendationKey(issueKey, recommendation),
              issueId: issue.id,
              title: recommendation.title,
              description: formatRecommendationDescription(
                recommendation.description,
              ),
              priority: recommendation.priority,
              effort: recommendation.effort,
              impact: recommendation.impact,
              tradeoffs: recommendation.tradeoffs,
            },
          ]
        : [];
    })
    .filter((recommendation) => {
      if (seen.has(recommendation.dedupeKey)) {
        return false;
      }

      seen.add(recommendation.dedupeKey);
      return true;
    })
    .slice(0, MAX_OVERVIEW_RECOMMENDATIONS)
    .map(({ dedupeKey, ...recommendation }) => {
      void dedupeKey;
      return recommendation;
    });
}

function dedupeIssues(issues: DetectedIssue[]) {
  const seen = new Set<string>();

  return issues.filter((issue) => {
    const key = getIssueKey(issue);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getIssueKey(issue: DetectedIssue) {
  return [
    normalizeKey(issue.title),
    normalizeEndpoint(issue.affectedEndpoints[0]?.endpoint),
    normalizeKey(issue.rootCause.primary),
  ].join(":");
}

function getRecommendationKey(
  issueKey: string,
  recommendation: DetectedIssue["recommendations"][number],
) {
  return [
    issueKey,
    normalizeKey(recommendation.title),
    recommendation.priority,
  ].join(":");
}

function getPrimaryRecommendation(issue: DetectedIssue) {
  const seen = new Set<string>();

  return issue.recommendations.find((recommendation) => {
    const key = normalizeKey(recommendation.title);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function formatRecommendationDescription(description: string) {
  return description.split(EVIDENCE_SEPARATOR)[0]?.trim() || description.trim();
}

function createPerformanceSignals(
  summary: MetricsSummary,
  analysis: OverviewAnalysis,
  overviewIssues: DetectedIssue[],
): OverviewMetric[] {
  const totalRequests = getMetricValue(summary.totalRequests.value);
  const errorRate = getMetricValue(summary.errorRate.value);
  const successRate = Math.max(0, 100 - errorRate);
  const coverage = analysis.summary.analyzedRuns;
  const criticalCount = countIssuesBySeverity(overviewIssues, "critical");
  const highCount = countIssuesBySeverity(overviewIssues, "high");

  return [
    {
      label: "Success Rate",
      value: formatPlainNumber(successRate),
      unit: "%",
      icon: "activity",
      color: successRate >= 99 ? "green" : successRate >= 95 ? "orange" : "red",
      status: successRate >= 99 ? "good" : successRate >= 95 ? "warning" : "critical",
      change: null,
      trend: "neutral",
      subtext: "Requests minus recorded failures",
    },
    {
      label: "Total Requests",
      value: formatPlainNumber(totalRequests),
      unit: "",
      icon: "zap",
      color: "blue",
      status: "info",
      change: getMetricChange(summary.totalRequests.change),
      trend: getTrend(summary.totalRequests.change),
      subtext: `Current ${summary.totalRequests.value} request sample`,
    },
    {
      label: "Analyzed Runs",
      value: String(coverage),
      unit: "",
      icon: "database",
      color: coverage >= 3 ? "green" : "orange",
      status: coverage >= 3 ? "good" : "warning",
      change: null,
      trend: "neutral",
      subtext: coverage >= 3 ? "Enough comparison data" : "More runs improve confidence",
    },
    {
      label: "Primary Risk",
      value: String(criticalCount + highCount),
      unit: "",
      icon: "alert-triangle",
      color: criticalCount > 0 ? "red" : "orange",
      status: criticalCount > 0 ? "critical" : "warning",
      change: null,
      trend: "neutral",
      subtext: analysis.summary.primaryBottleneck,
    },
  ];
}

function createIssueBadges(overviewIssues: DetectedIssue[]) {
  const criticalCount = countIssuesBySeverity(overviewIssues, "critical");
  const warningCount =
    countIssuesBySeverity(overviewIssues, "high") +
    countIssuesBySeverity(overviewIssues, "medium");

  return [
    {
      label: `${criticalCount} critical issues`,
      tone: criticalCount > 0 ? "danger" : "success",
    },
    {
      label: `${warningCount} warnings`,
      tone: warningCount > 0 ? "warning" : "success",
    },
  ];
}

function getScenarioStatus(endpoint: EndpointBreakdown) {
  if (endpoint.errors > 0) {
    return "fail";
  }

  if (endpoint.p95 >= 500) {
    return "warning";
  }

  return "pass";
}

function getScenarioName(endpoint: string, index: number) {
  const [, path = endpoint] = endpoint.split(" ");
  const cleanPath = path.replace(/^\/+/, "") || "root";
  const lastSegment = cleanPath.split("/").filter(Boolean).at(-1) ?? cleanPath;
  const readable = lastSegment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

  return readable || `Scenario ${index + 1}`;
}

function getScenarioColor(index: number, status: "pass" | "warning" | "fail") {
  if (status === "fail") {
    return "coral";
  }

  if (status === "warning") {
    return "amber";
  }

  return ["purple", "teal", "blue"][index % 3];
}

function getIssueSignalProgress(issue: DetectedIssue) {
  const title = issue.title.toLowerCase();
  const searchableText = [
    issue.title,
    issue.impact,
    issue.rootCause.primary,
    ...issue.rootCause.secondary,
    ...issue.timeline.flatMap((item) => [item.metric, item.change, item.event]),
    ...issue.affectedEndpoints.map((endpoint) => endpoint.impact),
  ].join(" ");

  if (title.includes("failure")) {
    const errorRate = extractPercent(searchableText);

    if (errorRate !== null) {
      return roundProgress(errorRate);
    }
  }

  if (title.includes("tail latency")) {
    const maxLatency = Math.max(...extractLatencyMsValues(searchableText));

    if (Number.isFinite(maxLatency) && maxLatency > 0) {
      return roundProgress((maxLatency / LATENCY_SLA_MS) * 100);
    }
  }

  if (title.includes("latency spike")) {
    const latencies = extractLatencyMsValues(issue.impact);
    const previous = latencies[0];
    const peak = latencies[1] ?? Math.max(...latencies);

    if (
      previous !== undefined &&
      peak !== undefined &&
      Number.isFinite(previous) &&
      Number.isFinite(peak) &&
      previous > 0
    ) {
      return roundProgress(((peak - previous) / previous) * 100);
    }

    if (Number.isFinite(peak) && peak > 0) {
      return roundProgress((peak / LATENCY_SLA_MS) * 100);
    }
  }

  if (title.includes("throughput")) {
    const throughput = extractThroughput(searchableText);

    if (throughput !== null) {
      return throughput <= 0 ? 100 : roundProgress(100 / (throughput + 1));
    }
  }

  return roundProgress(getMaxCorrelation(issue) * 100);
}

function countIssuesBySeverity(
  issues: DetectedIssue[],
  severity: IssueSeverity,
) {
  return issues.filter((issue) => issue.severity === severity).length;
}

function extractPercent(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)\s*%/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractLatencyMsValues(value: string) {
  return [...value.matchAll(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*ms/gi)]
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter((latency) => Number.isFinite(latency));
}

function extractThroughput(value: string) {
  const match = value.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*req\/s/i);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function getMaxCorrelation(issue: DetectedIssue) {
  return issue.correlations.reduce(
    (max, correlation) => Math.max(max, Math.abs(correlation.correlation)),
    0,
  );
}

function roundProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(Math.min(100, Math.max(0, value)));
}

function getMetricValue(value: number | string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getMetricChange(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getTrend(value: number | undefined): MetricTrend {
  if (typeof value !== "number" || !Number.isFinite(value) || value === 0) {
    return "neutral";
  }

  return value > 0 ? "up" : "down";
}

function formatLatency(value: number) {
  return `${formatPlainNumber(value)}ms`;
}

function formatPlainNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: value < 100 ? 2 : 0,
  });
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function normalizeEndpoint(value: string | undefined) {
  if (!value) {
    return "unknown-endpoint";
  }

  return normalizeKey(value.replace(/\?.*$/, ""));
}

function normalizeKey(value: string | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\?.*?(?=\s|$)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
