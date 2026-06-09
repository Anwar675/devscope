import { Activity } from "lucide-react";
import type { DetectedIssue } from "./aianalysis-data";

interface AIAnalysisCorrelationsProps {
  issue: DetectedIssue;
}

export const AIAnalysisCorrelations = ({ issue }: AIAnalysisCorrelationsProps) => {
  return (
    <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5 text-purple-400" />
        Metric Correlations
      </h3>
      <div className="space-y-4">
        {issue.correlations.map((corr) => {
          const strength = Math.abs(corr.correlation);
          const isStrong = strength > 0.8;

          return (
            <div key={corr.metric} className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-medium">{corr.metric}</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    isStrong ? "bg-red-500/20 text-red-300" : "bg-blue-500/20 text-blue-300"
                  }`}
                >
                  {(corr.correlation * 100).toFixed(0)}% correlation
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div className={`h-full ${isStrong ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${strength * 100}%` }} />
              </div>
              <p className="text-blue-200/70 text-sm">{corr.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
