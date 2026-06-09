import { motion } from "motion/react";
import { Lightbulb } from "lucide-react";

export const AIAnalysisSummary = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 p-6 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-purple-500/20 border-l-4 border-purple-500 rounded-r-2xl backdrop-blur-lg"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-6 h-6 text-purple-300" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-purple-200 mb-2">Analysis Summary</h3>
          <p className="text-blue-100 leading-relaxed mb-3">
            Detected <strong className="text-white">3 performance issues</strong> causing the latency spike from{" "}
            <strong className="text-white">245ms to 4,120ms</strong> at 11:30 AM. Primary bottleneck:{" "}
            <strong className="text-white">Database connection pool saturation (98/100)</strong> due to missing index on
            high-traffic queries.
          </p>
          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg">1 Critical</span>
            <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-lg">1 High</span>
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-lg">1 Medium</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
