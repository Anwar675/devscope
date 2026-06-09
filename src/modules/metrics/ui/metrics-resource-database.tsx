import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  chartLabelStyle,
  chartTooltipStyle,
  databaseMetricsData,
  resourceUtilizationData,
} from "./metrics-data";

export const MetricsResourceDatabase = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
        className="min-w-0 p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl"
      >
        <h3 className="text-xl font-semibold text-white mb-6">Resource Utilization</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={resourceUtilizationData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              labelStyle={chartLabelStyle}
              formatter={(value) => [`${value}%`, ""]}
            />
            <Legend />
            <Area type="monotone" dataKey="cpu" stackId="1" stroke="#3b82f6" fill="#3b82f680" name="CPU" />
            <Area type="monotone" dataKey="memory" stackId="2" stroke="#10b981" fill="#10b98180" name="Memory" />
            <Area type="monotone" dataKey="network" stackId="3" stroke="#f59e0b" fill="#f59e0b80" name="Network" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9 }}
        className="min-w-0 p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl"
      >
        <h3 className="text-xl font-semibold text-white mb-6">Database Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={databaseMetricsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <YAxis yAxisId="left" stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartLabelStyle} />
            <Legend />
            <Bar yAxisId="left" dataKey="connections" fill="#8b5cf6" name="Connections" />
            <Line yAxisId="right" type="monotone" dataKey="cacheHit" stroke="#10b981" strokeWidth={2} name="Cache Hit %" />
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
};
