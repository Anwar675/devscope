import { AlertCircle, ChevronRight, XCircle } from "lucide-react";
import type { DetectedIssue } from "./aianalysis-data";

interface AIAnalysisRootCauseProps {
  issue: DetectedIssue;
}

export const AIAnalysisRootCause = ({ issue }: AIAnalysisRootCauseProps) => {
  return (
    <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-400" />
        Root Cause Analysis
      </h3>

      <div className="mb-6 p-5 bg-red-500/10 border-l-4 border-red-500 rounded-r-xl">
        <div className="flex items-start gap-3">
          <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-300 font-semibold mb-2">Primary Cause</h4>
            <p className="text-blue-100">{issue.rootCause.primary}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-blue-200 font-medium text-sm">Contributing Factors:</h4>
        {issue.rootCause.secondary.map((cause) => (
          <div key={cause} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
            <ChevronRight className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <span className="text-blue-200/80 text-sm">{cause}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
