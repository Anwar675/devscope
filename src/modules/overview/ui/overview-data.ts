export type OverviewMetricColor = "red" | "orange" | "green" | "blue" | "purple";
export type OverviewMetricStatus = "critical" | "warning" | "good" | "info";
export type OverviewMetricTrend = "up" | "down" | "neutral";
export type OverviewMetricIcon =
  | "clock"
  | "alert-triangle"
  | "zap"
  | "activity"
  | "database";

export type OverviewMetric = {
  label: string;
  value: string;
  unit: string;
  icon: OverviewMetricIcon;
  color: OverviewMetricColor;
  status: OverviewMetricStatus;
  change: number | null;
  trend: OverviewMetricTrend;
  subtext?: string;
};

export type OverviewLatencyPoint = {
  time: string;
  value: number;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  users: number;
  normal: boolean;
  spike?: "start" | "peak";
};

export type OverviewScenario = {
  id: string;
  name: string;
  endpoint: string;
  latency: string;
  status: "pass" | "warning" | "fail";
  requests: number;
  errors: number;
  color: "purple" | "teal" | "blue" | "coral" | "amber";
};

export type OverviewIssue = {
  id: number;
  title: string;
  severity: "critical" | "high" | "medium";
  impact: string;
  recommendation: string;
  progress: number;
};

export type OverviewRecommendation = {
  issueId: number;
  title: string;
  description: string;
  priority: "immediate" | "short-term" | "medium-term" | "long-term";
  effort: string;
  impact: string;
};

export type OverviewDashboardData = {
  generatedAt: string;
  timeRange: string;
  header: {
    title: string;
    description: string;
    badges: {
      label: string;
      tone: "danger" | "warning" | "success";
    }[];
  };
  keyMetrics: OverviewMetric[];
  latencyTrend: OverviewLatencyPoint[];
  scenarios: OverviewScenario[];
  aiAnalysis: {
    rootCause: string;
    issuesFound: number;
    issues: OverviewIssue[];
  };
  recommendations: OverviewRecommendation[];
  performanceSignals: OverviewMetric[];
};

export const fallbackOverviewData: OverviewDashboardData = {
  generatedAt: "",
  timeRange: "3d",
  header: {
    title: "Performance Dashboard",
    description: "No completed load-test data available yet",
    badges: [
      { label: "0 critical issues", tone: "success" },
      { label: "0 warnings", tone: "success" },
    ],
  },
  keyMetrics: [],
  latencyTrend: [],
  scenarios: [],
  aiAnalysis: {
    rootCause: "Run a load test to generate AI analysis.",
    issuesFound: 0,
    issues: [],
  },
  recommendations: [],
  performanceSignals: [],
};

export function isOverviewDashboardData(
  value: unknown,
): value is OverviewDashboardData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const dashboard = value as OverviewDashboardData;

  return (
    dashboard.header !== undefined &&
    Array.isArray(dashboard.keyMetrics) &&
    Array.isArray(dashboard.latencyTrend) &&
    Array.isArray(dashboard.scenarios) &&
    dashboard.aiAnalysis !== undefined &&
    Array.isArray(dashboard.recommendations) &&
    Array.isArray(dashboard.performanceSignals)
  );
}
