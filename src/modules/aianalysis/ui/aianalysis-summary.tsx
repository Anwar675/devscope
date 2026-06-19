import { motion } from "motion/react";
import { Lightbulb } from "lucide-react";
import type { AIAnalysisReport } from "./aianalysis-data";

interface AIAnalysisSummaryProps {
  summary: AIAnalysisReport["summary"];
}

export const AIAnalysisSummary = ({ summary }: AIAnalysisSummaryProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 p-6 bg-linear-to-r from-dev-purple/20 via-dev-accent/20 to-dev-purple/20 border-l-4 border-dev-purple rounded-r-2xl backdrop-blur-lg"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-dev-purple/30 flex items-center justify-center shrink-0">
          <Lightbulb className="w-6 h-6 text-dev-purple-hover" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-dev-purple-hover mb-2">Analysis Summary</h3>
          <p className="text-dev-text-soft leading-relaxed mb-3">
            Analyzed <strong className="text-dev-text">{summary.analyzedRuns} load test run{summary.analyzedRuns === 1 ? "" : "s"}</strong> and found{" "}
            <strong className="text-dev-text">{summary.issueCount} issue{summary.issueCount === 1 ? "" : "s"}</strong>. Latency range from{" "}
            <strong className="text-dev-text">{formatLatency(summary.minLatencyMs)} </strong> to{" "}
            <strong className="text-dev-text">{formatLatency(summary.maxLatencyMs)}</strong>. Primary signal:{" "}
            <strong className="text-dev-text">{summary.primaryBottleneck}</strong>
          </p>
          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1 bg-dev-danger/20 text-dev-danger rounded-lg">{summary.criticalCount} Critical</span>
            <span className="px-3 py-1 bg-dev-orange/20 text-dev-orange rounded-lg">{summary.highCount} High</span>
            <span className="px-3 py-1 bg-dev-yellow/20 text-dev-yellow rounded-lg">{summary.mediumCount} Medium</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

function formatLatency(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: value < 100 ? 2 : 1,
  })}ms`;
}
