"use client";

import { useEffect, useMemo, useState } from "react";
import { AIAnalysisHeader } from "./aianalysis-header";
import { AIAnalysisHealth } from "./aianalysis-health";
import { AIAnalysisIssueDetail } from "./aianalysis-issue-detail";
import { AIAnalysisIssueSelector } from "./aianalysis-issue-selector";
import { AIAnalysisSpikeTimeline } from "./aianalysis-spike-timeline";
import { AIAnalysisSummary } from "./aianalysis-summary";
import type { AIAnalysisReport } from "./aianalysis-data";

const API_URL = "/api/aianalysis";

export function AIAnalysis() {
  const [selectedIssue, setSelectedIssue] = useState(0);
  const [report, setReport] = useState<AIAnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const issues = useMemo(() => report?.issues ?? [], [report]);
  const currentIssue = issues[selectedIssue] ?? issues[0];

  useEffect(() => {
    let isMounted = true;

    async function loadAnalysis() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(API_URL, {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message ?? "Could not load AI analysis");
        }

        if (isMounted) {
          setReport(result.data as AIAnalysisReport);
          setSelectedIssue(0);
        }
      } catch (error) {
        if (isMounted) {
          setReport(null);
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load AI analysis",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalysis();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-dev-bg via-dev-bg-mid to-dev-bg p-8 pt-30">
      <div className="max-w-450 mx-auto">
        <AIAnalysisHeader />
        {isLoading && (
          <div className="mb-8 rounded-2xl border border-dev-border bg-dev-panel p-6 text-dev-text-muted">
            Loading AI analysis...
          </div>
        )}
        {errorMessage && (
          <div className="mb-8 rounded-2xl border border-dev-danger/30 bg-dev-danger/10 p-6 text-dev-danger">
            {errorMessage}
          </div>
        )}
        {report && (
          <>
            <AIAnalysisSummary summary={report.summary} />
            <AIAnalysisHealth health={report.health} />
            <AIAnalysisSpikeTimeline data={report.spikeTimeline} />
            {issues.length > 0 ? (
              <>
                <AIAnalysisIssueSelector
                  issues={issues}
                  selectedIssue={selectedIssue}
                  setSelectedIssue={setSelectedIssue}
                />
                {currentIssue && (
                  <AIAnalysisIssueDetail
                    issue={currentIssue}
                    selectedIssue={selectedIssue}
                  />
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dev-border bg-dev-panel p-6 text-dev-text-muted">
                No completed load test data is available for AI analysis yet.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
