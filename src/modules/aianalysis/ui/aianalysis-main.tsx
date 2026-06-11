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
    <div className="min-h-screen bg-linear-to-br from-dev-bg via-dev-bg-mid to-dev-bg p-8">
      <div className="max-w-450 mx-auto">
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
