import { motion } from "motion/react";
import { Lightbulb } from "lucide-react";

export const AIAnalysisSummary = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 p-6 bg-gradient-to-r from-dev-purple/20 via-dev-accent/20 to-dev-purple/20 border-l-4 border-dev-purple rounded-r-2xl backdrop-blur-lg"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-dev-purple/30 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-6 h-6 text-dev-purple-hover" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-dev-purple-hover mb-2">Analysis Summary</h3>
          <p className="text-dev-text-soft leading-relaxed mb-3">
            Detected <strong className="text-dev-text">3 performance issues</strong> causing the latency spike from{" "}
            <strong className="text-dev-text">245ms to 4,120ms</strong> at 11:30 AM. Primary bottleneck:{" "}
            <strong className="text-dev-text">Database connection pool saturation (98/100)</strong> due to missing index on
            high-traffic queries.
          </p>
          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1 bg-dev-danger/20 text-dev-danger rounded-lg">1 Critical</span>
            <span className="px-3 py-1 bg-dev-orange/20 text-dev-orange rounded-lg">1 High</span>
            <span className="px-3 py-1 bg-dev-yellow/20 text-dev-yellow rounded-lg">1 Medium</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
