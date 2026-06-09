export type MetricsTimeRange = "1h" | "6h" | "24h" | "7d" | "30d";

export const metricsTimeRanges: MetricsTimeRange[] = ["1h", "6h", "24h", "7d", "30d"];

export const latencyTimeSeriesData = [
  { time: "00:00", p50: 120, p95: 245, p99: 580, avg: 156 },
  { time: "02:00", p50: 115, p95: 230, p99: 520, avg: 148 },
  { time: "04:00", p50: 110, p95: 220, p99: 490, avg: 142 },
  { time: "06:00", p50: 125, p95: 280, p99: 650, avg: 168 },
  { time: "08:00", p50: 180, p95: 450, p99: 1200, avg: 245 },
  { time: "10:00", p50: 220, p95: 580, p99: 1800, avg: 312 },
  { time: "12:00", p50: 280, p95: 720, p99: 2400, avg: 428 },
  { time: "14:00", p50: 240, p95: 620, p99: 1950, avg: 356 },
  { time: "16:00", p50: 195, p95: 480, p99: 1420, avg: 278 },
  { time: "18:00", p50: 210, p95: 520, p99: 1580, avg: 298 },
  { time: "20:00", p50: 165, p95: 380, p99: 980, avg: 224 },
  { time: "22:00", p50: 135, p95: 290, p99: 720, avg: 182 },
];

export const throughputData = [
  { time: "00:00", requests: 1200, success: 1195, failed: 5 },
  { time: "02:00", requests: 980, success: 978, failed: 2 },
  { time: "04:00", requests: 750, success: 750, failed: 0 },
  { time: "06:00", requests: 1450, success: 1438, failed: 12 },
  { time: "08:00", requests: 2800, success: 2720, failed: 80 },
  { time: "10:00", requests: 4200, success: 3990, failed: 210 },
  { time: "12:00", requests: 5600, success: 5180, failed: 420 },
  { time: "14:00", requests: 4800, success: 4560, failed: 240 },
  { time: "16:00", requests: 3900, success: 3750, failed: 150 },
  { time: "18:00", requests: 3200, success: 3100, failed: 100 },
  { time: "20:00", requests: 2400, success: 2360, failed: 40 },
  { time: "22:00", requests: 1650, success: 1635, failed: 15 },
];

export const errorRateData = [
  { time: "00:00", rate: 0.4, count: 5 },
  { time: "02:00", rate: 0.2, count: 2 },
  { time: "04:00", rate: 0.0, count: 0 },
  { time: "06:00", rate: 0.8, count: 12 },
  { time: "08:00", rate: 2.9, count: 80 },
  { time: "10:00", rate: 5.0, count: 210 },
  { time: "12:00", rate: 7.5, count: 420 },
  { time: "14:00", rate: 5.0, count: 240 },
  { time: "16:00", rate: 3.8, count: 150 },
  { time: "18:00", rate: 3.1, count: 100 },
  { time: "20:00", rate: 1.7, count: 40 },
  { time: "22:00", rate: 0.9, count: 15 },
];

export const resourceUtilizationData = [
  { time: "00:00", cpu: 28, memory: 52, disk: 45, network: 32 },
  { time: "02:00", cpu: 25, memory: 51, disk: 45, network: 28 },
  { time: "04:00", cpu: 22, memory: 50, disk: 45, network: 24 },
  { time: "06:00", cpu: 35, memory: 58, disk: 46, network: 42 },
  { time: "08:00", cpu: 62, memory: 72, disk: 48, network: 68 },
  { time: "10:00", cpu: 78, memory: 82, disk: 52, network: 85 },
  { time: "12:00", cpu: 92, memory: 88, disk: 58, network: 95 },
  { time: "14:00", cpu: 85, memory: 84, disk: 55, network: 88 },
  { time: "16:00", cpu: 68, memory: 76, disk: 51, network: 72 },
  { time: "18:00", cpu: 72, memory: 78, disk: 52, network: 76 },
  { time: "20:00", cpu: 55, memory: 68, disk: 49, network: 58 },
  { time: "22:00", cpu: 42, memory: 62, disk: 47, network: 45 },
];

export const databaseMetricsData = [
  { time: "00:00", connections: 45, queries: 1200, cacheHit: 82 },
  { time: "02:00", connections: 38, queries: 980, cacheHit: 85 },
  { time: "04:00", connections: 32, queries: 750, cacheHit: 88 },
  { time: "06:00", connections: 52, queries: 1450, cacheHit: 78 },
  { time: "08:00", connections: 75, queries: 2800, cacheHit: 65 },
  { time: "10:00", connections: 88, queries: 4200, cacheHit: 52 },
  { time: "12:00", connections: 98, queries: 5600, cacheHit: 38 },
  { time: "14:00", connections: 92, queries: 4800, cacheHit: 45 },
  { time: "16:00", connections: 82, queries: 3900, cacheHit: 58 },
  { time: "18:00", connections: 78, queries: 3200, cacheHit: 62 },
  { time: "20:00", connections: 65, queries: 2400, cacheHit: 72 },
  { time: "22:00", connections: 55, queries: 1650, cacheHit: 78 },
];

export const endpointBreakdown = [
  { endpoint: "/api/products", requests: 45230, avgLatency: 245, errors: 125, p95: 520 },
  { endpoint: "/api/orders", requests: 28450, avgLatency: 890, errors: 450, p95: 2100 },
  { endpoint: "/api/auth/login", requests: 18920, avgLatency: 120, errors: 45, p95: 280 },
  { endpoint: "/api/search", requests: 15680, avgLatency: 1200, errors: 890, p95: 3400 },
  { endpoint: "/api/checkout", requests: 12340, avgLatency: 1850, errors: 520, p95: 4200 },
  { endpoint: "/api/users/:id", requests: 9870, avgLatency: 180, errors: 28, p95: 380 },
];

export const statusCodeData = [
  { name: "2xx Success", value: 89450, color: "#10b981" },
  { name: "4xx Client Error", value: 4230, color: "#f59e0b" },
  { name: "5xx Server Error", value: 2320, color: "#ef4444" },
];

export const responseTimeDistribution = [
  { range: "0-100ms", count: 28450 },
  { range: "100-250ms", count: 35680 },
  { range: "250-500ms", count: 18920 },
  { range: "500-1s", count: 8450 },
  { range: "1s-2s", count: 3890 },
  { range: "2s+", count: 1610 },
];

export const chartTooltipStyle = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
};

export const chartLabelStyle = {
  color: "#94a3b8",
};
