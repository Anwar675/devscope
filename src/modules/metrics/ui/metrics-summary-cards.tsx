import { motion } from "motion/react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { errorRateData, latencyTimeSeriesData, throughputData } from "./metrics-data";

type MetricColor = "green" | "blue" | "orange" | "purple";

interface KeyMetric {
  label: string;
  value: string;
  change: number;
  trend: "up" | "down";
  icon: LucideIcon;
  color: MetricColor;
  chart: number[];
}

const metricColors: Record<
  MetricColor,
  {
    background: string;
    icon: string;
    stroke: string;
  }
> = {
  green: {
    background: "bg-green-500/20",
    icon: "text-green-400",
    stroke: "#10b981",
  },
  blue: {
    background: "bg-blue-500/20",
    icon: "text-blue-400",
    stroke: "#3b82f6",
  },
  orange: {
    background: "bg-orange-500/20",
    icon: "text-orange-400",
    stroke: "#f59e0b",
  },
  purple: {
    background: "bg-purple-500/20",
    icon: "text-purple-400",
    stroke: "#a855f7",
  },
};

const keyMetrics: KeyMetric[] = [
  {
    label: "Avg Response Time",
    value: "284ms",
    change: -12,
    trend: "down",
    icon: Clock,
    color: "green",
    chart: latencyTimeSeriesData.map((item) => item.avg),
  },
  {
    label: "Total Requests",
    value: "96.0K",
    change: 18,
    trend: "up",
    icon: Activity,
    color: "blue",
    chart: throughputData.map((item) => item.requests),
  },
  {
    label: "Error Rate",
    value: "3.2%",
    change: 8,
    trend: "up",
    icon: AlertCircle,
    color: "orange",
    chart: errorRateData.map((item) => item.rate),
  },
  {
    label: "Requests/sec",
    value: "1,248",
    change: 15,
    trend: "up",
    icon: Zap,
    color: "purple",
    chart: throughputData.map((item) => item.requests / 3600),
  },
];

const getTrendColor = (metric: KeyMetric) => {
  if (metric.trend === "down" && metric.color === "green") {
    return "text-green-400";
  }

  if (metric.trend === "up" && metric.color === "green") {
    return "text-red-400";
  }

  return metric.trend === "up" ? "text-green-400" : "text-red-400";
};

export const MetricsSummaryCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {keyMetrics.map((metric, idx) => {
        const colors = metricColors[metric.color];

        return (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="min-w-0 p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl hover:border-white/20 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${colors.background} flex items-center justify-center`}>
                <metric.icon className={`w-6 h-6 ${colors.icon}`} />
              </div>
              <div className={`flex items-center gap-1 text-sm ${getTrendColor(metric)}`}>
                {metric.trend === "up" ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {Math.abs(metric.change)}%
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{metric.value}</div>
            <div className="text-sm text-blue-200/70 mb-4">{metric.label}</div>

            <div className="h-12 min-w-0">
              <ResponsiveContainer width="100%" height={48}>
                <AreaChart data={metric.chart.map((value) => ({ value }))}>
                  <defs>
                    <linearGradient id={`metrics-gradient-${metric.color}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={colors.stroke} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={colors.stroke}
                    fill={`url(#metrics-gradient-${metric.color})`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
