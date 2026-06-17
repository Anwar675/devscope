import { motion } from "motion/react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  chartLabelStyle,
  chartTooltipStyle,
  type MetricsAnalyticsData,
} from "./metrics-data";

interface MetricsPrimaryChartsProps {
  metrics: MetricsAnalyticsData;
}

export const MetricsPrimaryCharts = ({ metrics }: MetricsPrimaryChartsProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="min-w-0 p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl"
      >
        <h3 className="text-xl font-semibold text-white mb-6">Response Time Percentiles</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics.latencyTimeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartLabelStyle} />
            <Legend />
            <Line type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={2} name="P50" dot={false} />
            <Line type="monotone" dataKey="p95" stroke="#f59e0b" strokeWidth={2} name="P95" dot={false} />
            <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={2} name="P99" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="min-w-0 p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl"
      >
        <h3 className="text-xl font-semibold text-white mb-6">Throughput & Success Rate</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={metrics.throughputData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartLabelStyle} />
            <Legend />
            <Bar dataKey="success" stackId="a" fill="#10b981" name="Success" />
            <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
            <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} name="Total Requests" />
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
};
