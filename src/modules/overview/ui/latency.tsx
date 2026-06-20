import { motion } from "motion/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { OverviewLatencyPoint } from "./overview-data";

type LatencyChartProps = {
  data: OverviewLatencyPoint[];
};

export const LatencyChart = ({ data }: LatencyChartProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="lg:col-span-2 p-6 bg-dev-surface/5 backdrop-blur-lg border border-dev-border rounded-2xl"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-dev-text">
          Latency over time (ms)
        </h3>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-dev-accent text-dev-text text-sm rounded-lg">
            P95
          </span>
          <span className="px-3 py-1 bg-dev-surface/10 text-dev-text-muted text-sm rounded-lg">
            P50
          </span>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="flex items-center gap-2 px-3 py-1 bg-dev-purple/20 rounded-lg">
          <div className="w-2 h-2 bg-dev-purple rounded-full" />
          <span className="text-xs text-dev-purple">Normal samples</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-dev-danger/20 rounded-lg">
          <div className="w-2 h-2 bg-dev-danger rounded-full" />
          <span className="text-xs text-dev-danger">Spike risk</span>
        </div>
      </div>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--dev-danger)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--dev-danger)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--dev-chart-grid)" />
            <XAxis dataKey="time" stroke="var(--dev-chart-axis)" style={{ fontSize: "12px" }} />
            <YAxis stroke="var(--dev-chart-axis)" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--dev-chart-tooltip)",
                border: "1px solid var(--dev-chart-tooltip-border)",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "var(--dev-chart-axis)" }}
              formatter={(value) => [`${value ?? 0}ms`, "Latency"]}
            />
            <ReferenceLine
              y={1500}
              stroke="var(--dev-amber)"
              strokeDasharray="5 5"
              label={{
                value: "SLA",
                position: "right",
                fill: "var(--dev-amber)",
                fontSize: 11,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--dev-danger)"
              fill="url(#latencyGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[250px] items-center justify-center rounded-xl border border-dev-border bg-dev-surface/5 text-sm text-dev-text-muted">
          No latency samples available yet.
        </div>
      )}
    </motion.div>
  );
};
