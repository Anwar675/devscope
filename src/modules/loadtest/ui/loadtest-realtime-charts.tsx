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
import type { LoadTestRealtimePoint } from "./running-loadtest";

const tooltipStyle = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
};

interface LoadTestRealtimeChartsProps {
  data: LoadTestRealtimePoint[];
}

export const LoadTestRealtimeCharts = ({ data }: LoadTestRealtimeChartsProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl ">
        <h3 className="text-xl font-semibold text-white mb-4">Active Users & Latency</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="time" stroke="#94a3b8" />
            <YAxis
              yAxisId="left"
              stroke="#3b82f6"
              allowDecimals={false}
              label={{ value: "Users", angle: -90, position: "insideLeft" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#8b5cf6"
              tickFormatter={(value) => `${value}ms`}
              label={{
                value: "Latency",
                angle: 90,
                position: "insideRight",
              }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) =>
                name === "Latency (ms)"
                  ? [`${value}ms`, name]
                  : [value, name]
              }
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="users"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Users"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="latency"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              name="Latency (ms)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
        <h3 className="text-xl font-semibold text-white mb-4">Error Rate</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="time" stroke="#94a3b8" />
            <YAxis
              stroke="#94a3b8"
              tickFormatter={(value) => `${formatMetric(Number(value))}%`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [
                `${formatMetric(Number(value))}%`,
                "Error Rate",
              ]}
            />
            <Area type="monotone" dataKey="errorRate" stroke="#f59e0b" fill="url(#errorGrad)" strokeWidth={2} name="Error Rate (%)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

function formatMetric(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: value < 10 ? 2 : value < 100 ? 1 : 0,
  });
}
