import { motion } from "motion/react";
import {
  AlertTriangle,
  Activity,
  Clock,
  Database,
  Zap,
} from "lucide-react";
import type {
  OverviewMetric,
  OverviewMetricColor,
  OverviewMetricIcon,
  OverviewMetricStatus,
} from "./overview-data";

interface StatusProps {
  metrics: OverviewMetric[];
  className?: string;
}

const colorStyles: Record<
  OverviewMetricColor,
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

const iconMap: Record<OverviewMetricIcon, typeof Activity> = {
  "alert-triangle": AlertTriangle,
  activity: Activity,
  clock: Clock,
  database: Database,
  zap: Zap,
};

const statusLabel: Record<OverviewMetricStatus, string> = {
  critical: "Critical",
  warning: "Warning",
  good: "Good",
  info: "Info",
};

const getMetricDetail = (metric: OverviewMetric) => {
  if (typeof metric.change === "number") {
    const trendLabel = metric.trend === "up" ? "Up" : "Down";

    return `${trendLabel} ${Math.abs(metric.change)}% from baseline`;
  }

  if (!metric.subtext) {
    return null;
  }

  return `${statusLabel[metric.status]}: ${metric.subtext}`;
};

export const Status = ({ metrics, className = "mb-8" }: StatusProps) => {
  if (metrics.length === 0) {
    return (
      <div className={`rounded-2xl border border-dev-border bg-dev-surface/5 p-6 text-dev-text-muted ${className}`}>
        No overview metrics available yet.
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}
    >
      {metrics.map((metric, idx) => {
        const Icon = iconMap[metric.icon];
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
