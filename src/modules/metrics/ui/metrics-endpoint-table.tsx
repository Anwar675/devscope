import { motion } from "motion/react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { endpointBreakdown } from "./metrics-data";

const getLatencyColor = (value: number, warning: number, critical: number) => {
  if (value < warning) {
    return "text-green-400";
  }

  if (value < critical) {
    return "text-orange-400";
  }

  return "text-red-400";
};

const getErrorColor = (value: number) => {
  if (value === 0) {
    return "text-green-400";
  }

  if (value < 100) {
    return "text-orange-400";
  }

  return "text-red-400";
};

const getErrorRateColor = (value: number) => {
  if (value < 1) {
    return "text-green-400";
  }

  if (value < 5) {
    return "text-orange-400";
  }

  return "text-red-400";
};

export const MetricsEndpointTable = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.0 }}
      className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl"
    >
      <h3 className="text-xl font-semibold text-white mb-6">Endpoint Performance Breakdown</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-4 px-4 text-sm font-medium text-blue-200/70">Endpoint</th>
              <th className="text-left py-4 px-4 text-sm font-medium text-blue-200/70">Requests</th>
              <th className="text-left py-4 px-4 text-sm font-medium text-blue-200/70">Avg Latency</th>
              <th className="text-left py-4 px-4 text-sm font-medium text-blue-200/70">P95 Latency</th>
              <th className="text-left py-4 px-4 text-sm font-medium text-blue-200/70">Errors</th>
              <th className="text-left py-4 px-4 text-sm font-medium text-blue-200/70">Error Rate</th>
              <th className="text-left py-4 px-4 text-sm font-medium text-blue-200/70">Status</th>
            </tr>
          </thead>
          <tbody>
            {endpointBreakdown.map((endpoint, idx) => {
              const errorRateValue = (endpoint.errors / endpoint.requests) * 100;
              const errorRate = errorRateValue.toFixed(2);

              return (
                <motion.tr
                  key={endpoint.endpoint}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1 + idx * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-all"
                >
                  <td className="py-4 px-4">
                    <span className="text-white font-mono text-sm">{endpoint.endpoint}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-blue-200">{endpoint.requests.toLocaleString()}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={getLatencyColor(endpoint.avgLatency, 300, 800)}>{endpoint.avgLatency}ms</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={getLatencyColor(endpoint.p95, 500, 1500)}>{endpoint.p95}ms</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={getErrorColor(endpoint.errors)}>{endpoint.errors}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={getErrorRateColor(errorRateValue)}>{errorRate}%</span>
                  </td>
                  <td className="py-4 px-4">
                    {errorRateValue < 1 ? (
                      <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" />
                        Healthy
                      </span>
                    ) : errorRateValue < 5 ? (
                      <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full flex items-center gap-1 w-fit">
                        <AlertCircle className="w-3 h-3" />
                        Warning
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-red-500/20 text-red-300 text-xs rounded-full flex items-center gap-1 w-fit">
                        <AlertCircle className="w-3 h-3" />
                        Critical
                      </span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
