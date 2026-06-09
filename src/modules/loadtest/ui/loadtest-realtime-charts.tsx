import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const realTimeData = [
  { time: "0s", users: 0, latency: 120, errors: 0 },
  { time: "30s", users: 25, latency: 145, errors: 0 },
  { time: "60s", users: 50, latency: 180, errors: 1 },
  { time: "90s", users: 75, latency: 220, errors: 2 },
  { time: "120s", users: 100, latency: 245, errors: 3 },
  { time: "150s", users: 100, latency: 260, errors: 4 },
  { time: "180s", users: 100, latency: 255, errors: 3 },
];

const tooltipStyle = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
};

export const LoadTestRealtimeCharts = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
        <h3 className="text-xl font-semibold text-white mb-4">Active Users & Latency</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={realTimeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="time" stroke="#94a3b8" />
            <YAxis yAxisId="left" stroke="#94a3b8" />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} name="Users" />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="latency"
              stroke="#8b5cf6"
              strokeWidth={2}
              name="Latency (ms)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
        <h3 className="text-xl font-semibold text-white mb-4">Error Rate</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={realTimeData}>
            <defs>
              <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="time" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="errors" stroke="#f59e0b" fill="url(#errorGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
