import { AlertCircle, ChevronRight, XCircle } from "lucide-react";
import type { DetectedIssue } from "./aianalysis-data";

interface AIAnalysisRootCauseProps {
  issue: DetectedIssue;
}

export const AIAnalysisRootCause = ({ issue }: AIAnalysisRootCauseProps) => {
  return (
    <div className="p-6 bg-dev-panel backdrop-blur-lg border border-dev-border rounded-2xl">
      <h3 className="text-xl font-semibold text-dev-text mb-6 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-dev-danger" />
        Root Cause Analysis
      </h3>

      <div className="mb-6 p-5 bg-dev-danger/10 border-l-4 border-dev-danger rounded-r-xl">
        <div className="flex items-start gap-3">
          <XCircle className="w-6 h-6 text-dev-danger shrink-0 mt-0.5" />
          <div>
            <h4 className="text-dev-danger font-semibold mb-2">Primary Cause</h4>
            <p className="text-dev-text-soft">{issue.rootCause.primary}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-dev-text-muted font-medium text-sm">Contributing Factors:</h4>
        {issue.rootCause.secondary.map((cause) => (
          <div key={cause} className="flex items-start gap-3 p-3 bg-dev-panel rounded-lg">
            <ChevronRight className="w-4 h-4 text-dev-orange shrink-0 mt-0.5" />
            <span className="text-dev-text-muted/80 text-sm">{cause}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
