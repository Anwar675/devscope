import { Activity } from "lucide-react";
import type { DetectedIssue } from "./aianalysis-data";

interface AIAnalysisCorrelationsProps {
  issue: DetectedIssue;
}

export const AIAnalysisCorrelations = ({ issue }: AIAnalysisCorrelationsProps) => {
  return (
    <div className="p-6 bg-dev-panel backdrop-blur-lg border border-dev-border rounded-2xl">
      <h3 className="text-xl font-semibold text-dev-text mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5 text-dev-purple" />
        Metric Correlations
      </h3>
      <div className="space-y-4">
        {issue.correlations.map((corr) => {
          const strength = Math.abs(corr.correlation);
          const isStrong = strength > 0.8;

          return (
            <div key={corr.metric} className="p-4 bg-dev-panel rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-dev-text font-medium">{corr.metric}</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    isStrong ? "bg-dev-danger/20 text-dev-danger" : "bg-dev-accent/20 text-dev-accent-muted"
                  }`}
                >
                  {(corr.correlation * 100).toFixed(0)}% correlation
                </span>
              </div>
              <div className="w-full h-2 bg-dev-overlay rounded-full overflow-hidden mb-2">
                <div className={`h-full ${isStrong ? "bg-dev-danger" : "bg-dev-accent"}`} style={{ width: `${strength * 100}%` }} />
              </div>
              <p className="text-dev-text-muted/70 text-sm">{corr.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
