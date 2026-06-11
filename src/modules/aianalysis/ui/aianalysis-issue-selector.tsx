import { detectedIssues } from "./aianalysis-data";

interface AIAnalysisIssueSelectorProps {
  selectedIssue: number;
  setSelectedIssue: (issue: number) => void;
}

const getSelectedIssueClass = (severity: string) => {
  if (severity === "critical") {
    return "bg-dev-danger/20 border-dev-danger/50 text-dev-text";
  }

  if (severity === "high") {
    return "bg-dev-orange/20 border-dev-orange/50 text-dev-text";
  }

  return "bg-dev-yellow/20 border-dev-yellow/50 text-dev-text";
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
              : "bg-dev-panel border-dev-border text-dev-text-muted/70 hover:border-dev-border-strong"
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
