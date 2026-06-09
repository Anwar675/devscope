export type IssueSeverity = "critical" | "high" | "medium";
export type RecommendationPriority = "immediate" | "short-term" | "medium-term" | "long-term";

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

export const spikeTimelineData = [
  { time: "10:00", latency: 245, dbConn: 45, cpu: 35, normal: true },
  { time: "10:15", latency: 280, dbConn: 52, cpu: 42, normal: true },
  { time: "10:30", latency: 320, dbConn: 58, cpu: 48, normal: true },
  { time: "10:45", latency: 890, dbConn: 75, cpu: 52, normal: false, spike: "start" },
  { time: "11:00", latency: 1450, dbConn: 88, cpu: 58, normal: false },
  { time: "11:15", latency: 2800, dbConn: 95, cpu: 62, normal: false },
  { time: "11:30", latency: 4120, dbConn: 98, cpu: 65, normal: false, spike: "peak" },
  { time: "11:45", latency: 3890, dbConn: 98, cpu: 68, normal: false },
  { time: "12:00", latency: 3200, dbConn: 97, cpu: 64, normal: false },
];

export const detectedIssues: DetectedIssue[] = [
  {
    id: 0,
    title: "Database Connection Pool Saturation",
    severity: "critical",
    impact: "High latency, request queuing, failed transactions",
    detectedAt: "11:30 AM",
    rootCause: {
      primary: "Connection pool exhausted (98/100 connections)",
      secondary: [
        "Missing index on orders.created_at column causing slow queries",
        "Long-running queries holding connections",
        "No connection timeout configured",
      ],
    },
    timeline: [
      { time: "10:45", event: "Traffic spike begins (+150% req/s)", metric: "throughput", change: "+150%" },
      { time: "11:00", event: "DB connections reach 88/100", metric: "dbConn", change: "+70%" },
      { time: "11:15", event: "Query latency increases 10x", metric: "latency", change: "+900%" },
      { time: "11:30", event: "Connection pool saturated (98/100)", metric: "dbConn", change: "+118%" },
      { time: "11:30", event: "Error rate spikes to 15.3%", metric: "errorRate", change: "+1400%" },
    ],
    correlations: [
      { metric: "DB Connections", correlation: 0.94, description: "Strong positive correlation with latency" },
      { metric: "Query Duration", correlation: 0.89, description: "Slow queries blocking connection pool" },
      { metric: "CPU Usage", correlation: 0.32, description: "Low correlation - CPU not the bottleneck" },
    ],
    affectedEndpoints: [
      { endpoint: "/api/orders", impact: "Critical - 4,120ms P95 latency", severity: "critical" },
      { endpoint: "/api/checkout", impact: "Critical - 5,200ms P95 latency", severity: "critical" },
      { endpoint: "/api/search", impact: "High - 2,400ms P95 latency", severity: "high" },
      { endpoint: "/api/products", impact: "Medium - 890ms P95 latency", severity: "medium" },
    ],
    recommendations: [
      {
        title: "Immediate: Add Missing Database Index",
        description: "Create index on orders.created_at to speed up time-range queries",
        command: "CREATE INDEX idx_orders_created_at ON orders(created_at);",
        priority: "immediate",
        effort: "Low (5 minutes)",
        impact: "High - Expected 60-80% query speed improvement",
        tradeoffs: [
          { type: "pro", text: "Drastically reduces query time for order history" },
          { type: "pro", text: "Minimal implementation effort" },
          { type: "con", text: "Slight overhead on INSERT operations (~5%)" },
        ],
      },
      {
        title: "Short-term: Increase Connection Pool Size",
        description: "Scale from 100 to 200 connections to handle peak traffic",
        command: "DATABASE_POOL_SIZE=200 # in .env",
        priority: "short-term",
        effort: "Low (10 minutes)",
        impact: "Medium - Buys time but doesn't solve root cause",
        tradeoffs: [
          { type: "pro", text: "Quick fix for immediate relief" },
          { type: "con", text: "Increases DB memory usage (~400MB)" },
          { type: "con", text: "Band-aid solution - doesn't fix slow queries" },
        ],
      },
      {
        title: "Medium-term: Implement Read Replica",
        description: "Offload read-heavy queries (search, product listing) to replica",
        command: null,
        priority: "medium-term",
        effort: "Medium (2-3 days)",
        impact: "High - Reduces primary DB load by ~60%",
        tradeoffs: [
          { type: "pro", text: "Separates read and write workloads" },
          { type: "pro", text: "Better scalability for future growth" },
          { type: "con", text: "Replication lag (typically 100-500ms)" },
          { type: "con", text: "Additional infrastructure cost (~$200/month)" },
        ],
      },
      {
        title: "Long-term: Add Redis Caching Layer",
        description: "Cache frequently accessed data (products, user sessions)",
        command: null,
        priority: "long-term",
        effort: "High (1-2 weeks)",
        impact: "Very High - Could reduce DB queries by 70%",
        tradeoffs: [
          { type: "pro", text: "Massive reduction in DB load" },
          { type: "pro", text: "Sub-millisecond response times" },
          { type: "con", text: "Cache invalidation complexity" },
          { type: "con", text: "Additional service to maintain" },
          { type: "con", text: "Learning curve for team" },
        ],
      },
    ],
  },
  {
    id: 1,
    title: "Missing Cache Layer (0% Cache Hit Rate)",
    severity: "high",
    impact: "Repeated identical queries, unnecessary DB load",
    detectedAt: "11:00 AM",
    rootCause: {
      primary: "No caching mechanism configured",
      secondary: [
        "70% of product queries are identical reads",
        "User session data fetched on every request",
        "Static product catalog queried repeatedly",
      ],
    },
    timeline: [
      { time: "10:45", event: "Product page views increase 3x", metric: "traffic", change: "+200%" },
      { time: "11:00", event: "Identical queries detected (70% duplicate)", metric: "queries", change: "+300%" },
      { time: "11:15", event: "DB read load reaches 4,200 queries/min", metric: "dbReads", change: "+250%" },
    ],
    correlations: [
      { metric: "Product Reads", correlation: 0.87, description: "Most queries are product lookups" },
      { metric: "Cache Hit Rate", correlation: -1, description: "No cache = 0% hit rate" },
    ],
    affectedEndpoints: [
      { endpoint: "/api/products/:id", impact: "High - Every request hits DB", severity: "high" },
      { endpoint: "/api/search", impact: "High - No result caching", severity: "high" },
    ],
    recommendations: [
      {
        title: "Immediate: Implement Application-Level Caching",
        description: "Use in-memory cache (Map/LRU) for frequently accessed data",
        command: "npm install lru-cache",
        priority: "immediate",
        effort: "Low (1-2 hours)",
        impact: "Medium - Reduces DB queries by ~30%",
        tradeoffs: [
          { type: "pro", text: "Quick to implement" },
          { type: "pro", text: "No infrastructure changes needed" },
          { type: "con", text: "Cache not shared across instances" },
          { type: "con", text: "Limited by server memory" },
        ],
      },
      {
        title: "Short-term: Deploy Redis Cache",
        description: "Distributed cache shared across all backend instances",
        command: null,
        priority: "short-term",
        effort: "Medium (2-3 days)",
        impact: "Very High - Could reduce DB queries by 70%",
        tradeoffs: [
          { type: "pro", text: "Shared cache across all servers" },
          { type: "pro", text: "Sub-millisecond latency" },
          { type: "pro", text: "Industry-standard solution" },
          { type: "con", text: "Cache invalidation strategy needed" },
          { type: "con", text: "Additional cost (~$50/month for managed Redis)" },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "No Query Optimization on High-Traffic Endpoints",
    severity: "medium",
    impact: "Search queries taking 2.4s, checkout taking 5.2s",
    detectedAt: "11:15 AM",
    rootCause: {
      primary: "Unoptimized database queries with N+1 problem",
      secondary: [
        "Search endpoint does full table scan",
        "Missing JOIN optimization",
        "No pagination on large result sets",
      ],
    },
    timeline: [
      { time: "11:00", event: "Search traffic increases", metric: "searches", change: "+180%" },
      { time: "11:15", event: "Search latency spikes", metric: "latency", change: "+400%" },
    ],
    correlations: [
      { metric: "Search Volume", correlation: 0.91, description: "More searches = slower performance" },
    ],
    affectedEndpoints: [
      { endpoint: "/api/search", impact: "Critical - 2,400ms average", severity: "critical" },
    ],
    recommendations: [
      {
        title: "Immediate: Add Search Index",
        description: "Create full-text search index on product name and description",
        command: "CREATE INDEX idx_product_search ON products USING GIN(to_tsvector('english', name || ' ' || description));",
        priority: "immediate",
        effort: "Low (15 minutes)",
        impact: "High - Expected 10x faster searches",
        tradeoffs: [
          { type: "pro", text: "Dramatic search performance improvement" },
          { type: "con", text: "Index size ~200MB" },
        ],
      },
      {
        title: "Short-term: Implement Elasticsearch",
        description: "Dedicated search engine for complex queries",
        command: null,
        priority: "medium-term",
        effort: "High (1 week)",
        impact: "Very High - Professional-grade search",
        tradeoffs: [
          { type: "pro", text: "Advanced search features (fuzzy, faceting, etc.)" },
          { type: "pro", text: "Scales independently" },
          { type: "con", text: "Complexity in data synchronization" },
          { type: "con", text: "Higher infrastructure cost" },
        ],
      },
    ],
  },
];

export const systemHealth = [
  { component: "API Server", status: "degraded", cpu: 65, memory: 78, issues: 1 },
  { component: "PostgreSQL", status: "critical", cpu: 95, memory: 88, issues: 2 },
  { component: "Redis Cache", status: "missing", cpu: 0, memory: 0, issues: 1 },
  { component: "Load Balancer", status: "healthy", cpu: 12, memory: 24, issues: 0 },
] as const;

export const chartTooltipStyle = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
};
