import { motion } from "motion/react";
import {
  AlertTriangle,
  Clock,
  Cpu,
  Database,
  Server,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type MetricColor = "red" | "orange" | "green" | "blue" | "purple";

export type MetricStatus = "critical" | "warning" | "good" | "info";

export type MetricTrend = "up" | "down" | "neutral";

export interface StatusMetric {
  label: string;
  value: string;
  unit: string;
  icon: LucideIcon;
  color: MetricColor;
  status: MetricStatus;
  change?: number | null;
  trend?: MetricTrend;
  subtext?: string;
}

interface StatusProps {
  metrics: StatusMetric[];
  className?: string;
}

const colorStyles: Record<
  MetricColor,
  {
    value: string;
    detail: string;
  }
> = {
  red: {
    value: "text-dev-danger",
    detail: "text-dev-danger",
  },
  orange: {
    value: "text-dev-orange",
    detail: "text-dev-orange",
  },
  green: {
    value: "text-dev-success",
    detail: "text-dev-success",
  },
  blue: {
    value: "text-dev-accent",
    detail: "text-dev-accent",
  },
  purple: {
    value: "text-dev-purple",
    detail: "text-dev-purple",
  },
};

const statusPrefix: Record<MetricStatus, string> = {
  critical: "⚠",
  warning: "⚠",
  good: "✓",
  info: "•",
};

export const systemMetrics: StatusMetric[] = [
  {
    label: "Latency P95",
    value: "4,120",
    unit: "ms",
    change: 340,
    trend: "up",
    icon: Clock,
    color: "red",
    status: "critical",
  },
  {
    label: "Error Rate",
    value: "15.3",
    unit: "%",
    change: null,
    trend: "up",
    icon: AlertTriangle,
    color: "red",
    status: "critical",
    subtext: "Spike detected",
  },
  {
    label: "Throughput",
    value: "842",
    unit: "req/s",
    change: -32,
    trend: "down",
    icon: Zap,
    color: "orange",
    status: "warning",
    subtext: "from 1,240 target",
  },
  {
    label: "DB Connections",
    value: "98",
    unit: "/100",
    change: null,
    trend: "up",
    icon: Database,
    color: "red",
    status: "critical",
    subtext: "Pool nearly full",
  },
];

export const resourceMetrics: StatusMetric[] = [
  {
    label: "CPU Usage",
    value: "32",
    unit: "%",
    status: "good",
    icon: Cpu,
    color: "green",
    subtext: "Not the bottleneck",
  },
  {
    label: "Memory",
    value: "68",
    unit: "%",
    status: "good",
    icon: Server,
    color: "green",
    subtext: "Acceptable",
  },
  {
    label: "Cache Hit Rate",
    value: "0",
    unit: "%",
    status: "critical",
    icon: Database,
    color: "red",
    subtext: "No cache configured",
  },
  {
    label: "Queue Length",
    value: "1,248",
    unit: " jobs",
    status: "warning",
    icon: Zap,
    color: "orange",
    subtext: "Growing fast",
  },
];

const getMetricDetail = (metric: StatusMetric) => {
  if (typeof metric.change === "number") {
    const trendSymbol = metric.trend === "up" ? "↑" : "↓";

    return `${trendSymbol} ${Math.abs(metric.change)}% from baseline`;
  }

  if (!metric.subtext) {
    return null;
  }

  return `${statusPrefix[metric.status]} ${metric.subtext}`;
};

export const Status = ({ metrics, className = "mb-8" }: StatusProps) => {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}
    >
      {metrics.map((metric, idx) => {
        const Icon = metric.icon;
        const detail = getMetricDetail(metric);
        const colors = colorStyles[metric.color];

        return (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 bg-dev-surface/5 backdrop-blur-lg border border-dev-border rounded-2xl hover:border-dev-border-strong transition-all"
          >
            <div className="flex items-center gap-2 mb-4 text-dev-text-muted/70 text-sm">
              <Icon className="w-4 h-4" />
              {metric.label}
            </div>
            <div className={`text-4xl font-bold mb-2 ${colors.value}`}>
              {metric.value}
              <span className="text-lg font-normal text-dev-text-muted/50 ml-1">
                {metric.unit}
              </span>
            </div>
            {detail && <div className={`text-sm ${colors.detail}`}>{detail}</div>}
          </motion.div>
        );
      })}
    </div>
  );
};
