"use client";

import { useState } from "react";
import { AIAnalysisHeader } from "./aianalysis-header";
import { AIAnalysisHealth } from "./aianalysis-health";
import { AIAnalysisIssueDetail } from "./aianalysis-issue-detail";
import { AIAnalysisIssueSelector } from "./aianalysis-issue-selector";
import { AIAnalysisSpikeTimeline } from "./aianalysis-spike-timeline";
import { AIAnalysisSummary } from "./aianalysis-summary";
import { detectedIssues } from "./aianalysis-data";

export function AIAnalysis() {
  const [selectedIssue, setSelectedIssue] = useState(0);
  const currentIssue = detectedIssues[selectedIssue];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-8">
      <div className="max-w-[1800px] mx-auto">
        <AIAnalysisHeader />
        <AIAnalysisSummary />
        <AIAnalysisHealth />
        <AIAnalysisSpikeTimeline />
        <AIAnalysisIssueSelector selectedIssue={selectedIssue} setSelectedIssue={setSelectedIssue} />
        <AIAnalysisIssueDetail issue={currentIssue} selectedIssue={selectedIssue} />
      </div>
    </div>
  );
}
