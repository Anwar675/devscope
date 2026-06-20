export type MetricsTimeRange = "1h" | "6h" | "24h" | "3d" | "7d" | "30d";

export const metricsTimeRanges: MetricsTimeRange[] = [
  "1h",
  "6h",
  "24h",
  "3d",
  "7d",
  "30d",
];

export type LatencyTimeSeriesDatum = {
  time: string;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
};

export type ThroughputDatum = {
  time: string;
  requests: number;
  success: number;
  failed: number;
};

export type ErrorRateDatum = {
  time: string;
  rate: number;
  count: number;
};

export type ResourceUtilizationDatum = {
  time: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
};

export type DatabaseMetricsDatum = {
  time: string;
  connections: number;
  queries: number;
  cacheHit: number;
};

export type EndpointBreakdownDatum = {
  runId?: string;
  createdAt?: string;
  endpoint: string;
  requests: number;
  avgLatency: number;
  errors: number;
  p95: number;
};

export type StatusCodeDatum = {
  name: string;
  value: number;
  color: string;
};

export type ResponseTimeDistributionDatum = {
  range: string;
  count: number;
};

export type MetricsAnalyticsData = {
  timeRange: MetricsTimeRange;
  generatedAt: string;
  source: {
    runs: number;
    primary: string;
    realtime: string;
    latencyUnit?: "ms";
    aggregation?: string;
    resource: string;
    includedRuns?: {
      id: string;
      createdAt: string;
      requests: number;
      errors: number;
      avgLatency: number;
      duration: number;
    }[];
  };
  summary: {
    avgResponseTime: {
      value: number;
      unit: "ms";
      change: number;
    };
    totalRequests: {
      value: number;
      change: number;
    };
    errorRate: {
      value: number;
      unit: "%";
      change: number;
    };
    requestsPerSecond: {
      value: number;
      change: number;
    };
  };
  latencyTimeSeriesData: LatencyTimeSeriesDatum[];
  throughputData: ThroughputDatum[];
  errorRateData: ErrorRateDatum[];
  resourceUtilizationData: ResourceUtilizationDatum[];
  databaseMetricsData: DatabaseMetricsDatum[];
  endpointBreakdown: EndpointBreakdownDatum[];
  statusCodeData: StatusCodeDatum[];
  responseTimeDistribution: ResponseTimeDistributionDatum[];
};

export const latencyTimeSeriesData: LatencyTimeSeriesDatum[] = [];

export const throughputData: ThroughputDatum[] = [];

export const errorRateData: ErrorRateDatum[] = [];

export const resourceUtilizationData: ResourceUtilizationDatum[] = [];

export const databaseMetricsData: DatabaseMetricsDatum[] = [];

export const endpointBreakdown: EndpointBreakdownDatum[] = [];

export const statusCodeData: StatusCodeDatum[] = [];

export const responseTimeDistribution: ResponseTimeDistributionDatum[] = [];

export const chartTooltipStyle = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
};

export const chartLabelStyle = {
  color: "#94a3b8",
};

export const fallbackMetricsData: MetricsAnalyticsData = {
  timeRange: "24h",
  generatedAt: new Date(0).toISOString(),
  source: {
    runs: 0,
    primary: "not_loaded",
    realtime: "not_loaded",
    latencyUnit: "ms",
    aggregation: "No backend metrics loaded.",
    resource: "CPU/RAM metrics are not loaded; missing values default to 0.",
    includedRuns: [],
  },
  summary: {
    avgResponseTime: {
      value: 0,
      unit: "ms",
      change: 0,
    },
    totalRequests: {
      value: 0,
      change: 0,
    },
    errorRate: {
      value: 0,
      unit: "%",
      change: 0,
    },
    requestsPerSecond: {
      value: 0,
      change: 0,
    },
  },
  latencyTimeSeriesData: [],
  throughputData: [],
  errorRateData: [],
  resourceUtilizationData: [],
  databaseMetricsData: [],
  endpointBreakdown: [],
  statusCodeData: [
    { name: "2xx Success", value: 0, color: "#10b981" },
    { name: "4xx/5xx Errors", value: 0, color: "#ef4444" },
  ],
  responseTimeDistribution: [
    { range: "0-100ms", count: 0 },
    { range: "100-250ms", count: 0 },
    { range: "250-500ms", count: 0 },
    { range: "500ms-1s", count: 0 },
    { range: "1s-2s", count: 0 },
    { range: "2s+", count: 0 },
  ],
};
