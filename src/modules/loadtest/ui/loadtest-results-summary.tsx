import { motion } from "motion/react";

const resultsData = [
  { metric: "Total Requests", value: "45,230", change: "+12%" },
  { metric: "Success Rate", value: "98.5%", change: "+2.1%" },
  { metric: "Avg Latency", value: "245ms", change: "-8%" },
  { metric: "P95 Latency", value: "420ms", change: "-5%" },
  { metric: "P99 Latency", value: "1.2s", change: "+3%" },
  { metric: "Max Throughput", value: "850 req/s", change: "+15%" },
];

const getChangeColor = (metric: string, change: string) => {
  if (change.startsWith("+") && metric.includes("Latency")) {
    return "text-red-400";
  }

  return "text-green-400";
};

export const LoadTestResultsSummary = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {resultsData.map((result, idx) => (
        <motion.div
          key={result.metric}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="p-4 bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl"
        >
          <div className="text-sm text-blue-200/70 mb-1">{result.metric}</div>
          <div className="text-2xl font-bold text-white mb-1">{result.value}</div>
          <div className={`text-sm ${getChangeColor(result.metric, result.change)}`}>{result.change}</div>
        </motion.div>
      ))}
    </div>
  );
};
