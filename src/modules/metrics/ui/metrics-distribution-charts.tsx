import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  chartTooltipStyle,
  errorRateData,
  responseTimeDistribution,
  statusCodeData,
} from "./metrics-data";

export const MetricsDistributionCharts = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="min-w-0 p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl"
      >
        <h3 className="text-xl font-semibold text-white mb-6">Error Rate Over Time</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={errorRateData}>
            <defs>
              <linearGradient id="metrics-error-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value) => [`${value}%`, "Error Rate"]}
            />
            <Area type="monotone" dataKey="rate" stroke="#ef4444" fill="url(#metrics-error-grad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="min-w-0 p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl"
      >
        <h3 className="text-xl font-semibold text-white mb-6">Status Code Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={statusCodeData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
            >
              {statusCodeData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={chartTooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {statusCodeData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-blue-200/70">{item.name}</span>
              </div>
              <span className="text-white font-medium">{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="min-w-0 p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl"
      >
        <h3 className="text-xl font-semibold text-white mb-6">Response Time Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={responseTimeDistribution} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis type="number" stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <YAxis dataKey="range" type="category" stroke="#94a3b8" style={{ fontSize: "12px" }} width={80} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
};
