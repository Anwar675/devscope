import { detectedIssues } from "./aianalysis-data";

interface AIAnalysisIssueSelectorProps {
  selectedIssue: number;
  setSelectedIssue: (issue: number) => void;
}

const getSelectedIssueClass = (severity: string) => {
  if (severity === "critical") {
    return "bg-red-500/20 border-red-500/50 text-white";
  }

  if (severity === "high") {
    return "bg-orange-500/20 border-orange-500/50 text-white";
  }

  return "bg-yellow-500/20 border-yellow-500/50 text-white";
};

export const AIAnalysisIssueSelector = ({
  selectedIssue,
  setSelectedIssue,
}: AIAnalysisIssueSelectorProps) => {
  return (
    <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
      {detectedIssues.map((issue, idx) => (
        <button
          key={issue.id}
          onClick={() => setSelectedIssue(idx)}
          className={`px-5 py-3 rounded-xl border transition-all flex-shrink-0 ${
            selectedIssue === idx
              ? getSelectedIssueClass(issue.severity)
              : "bg-white/5 border-white/10 text-blue-200/70 hover:border-white/30"
          }`}
        >
          <div className="text-left">
            <div className="text-sm font-semibold mb-1">{issue.title}</div>
            <div className="text-xs opacity-70">Detected at {issue.detectedAt}</div>
          </div>
        </button>
      ))}
    </div>
  );
};
