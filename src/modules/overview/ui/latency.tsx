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
const latencyData = [
  { time: "0:00", value: 120, phase: "baseline", users: 100 },
  { time: "0:30", value: 130, phase: "baseline", users: 100 },
  { time: "1:00", value: 125, phase: "baseline", users: 100 },
  { time: "1:30", value: 140, phase: "ramp", users: 500 },
  { time: "2:00", value: 180, phase: "ramp", users: 1000 },
  { time: "2:30", value: 250, phase: "ramp", users: 1000 },
  { time: "3:00", value: 450, phase: "stress", users: 5000 },
  { time: "3:30", value: 850, phase: "stress", users: 7500 },
  { time: "4:00", value: 2100, phase: "stress", users: 10000 },
  { time: "4:30", value: 3400, phase: "stress", users: 10000 },
  { time: "5:00", value: 4120, phase: "stress", users: 10000 },
];
export const LatencyChart = () => {
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
          <button className="px-3 py-1 bg-dev-accent text-dev-text text-sm rounded-lg">
            P95
          </button>
          <button className="px-3 py-1 bg-dev-surface/10 text-dev-text-muted text-sm rounded-lg hover:bg-dev-surface/20">
            P50
          </button>
          <button className="px-3 py-1 bg-dev-surface/10 text-dev-text-muted text-sm rounded-lg hover:bg-dev-surface/20">
            Error %
          </button>
        </div>
      </div>

      {/* Phase labels */}
      <div className="flex gap-2 mb-3">
        <div className="flex items-center gap-2 px-3 py-1 bg-dev-purple/20 rounded-lg">
          <div className="w-2 h-2 bg-dev-purple rounded-full" />
          <span className="text-xs text-dev-purple">100 users</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-dev-orange/20 rounded-lg">
          <div className="w-2 h-2 bg-dev-orange rounded-full" />
          <span className="text-xs text-dev-orange">1k users</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-dev-danger/20 rounded-lg">
          <div className="w-2 h-2 bg-dev-danger rounded-full" />
          <span className="text-xs text-dev-danger">10k users</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={latencyData}>
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
    </motion.div>
  );
};
