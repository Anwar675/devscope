export type IssueSeverity = "critical" | "high" | "medium";
export type RecommendationPriority =
  | "immediate"
  | "short-term"
  | "medium-term"
  | "long-term";
export type HealthStatus = "healthy" | "degraded" | "critical" | "missing";

export interface DetectedIssue {
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
  recommendations: {
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
  }[];
}

export interface AnalysisHealthComponent {
  component: string;
  status: HealthStatus;
  issues: number;
  detail: string;
  metrics: {
    label: string;
    value: string;
    tone: "neutral" | "success" | "warning" | "danger";
  }[];
}

export interface SpikeTimelinePoint {
  time: string;
  latency: number;
  requestsPerSecond: number;
  errorRate: number;
  users: number;
  normal: boolean;
  spike?: "start" | "peak";
}

export interface AIAnalysisReport {
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
  spikeTimeline: SpikeTimelinePoint[];
  issues: DetectedIssue[];
}

export const chartTooltipStyle = {
  backgroundColor: "var(--dev-chart-tooltip)",
  border: "1px solid var(--dev-chart-tooltip-border)",
  borderRadius: "8px",
};
