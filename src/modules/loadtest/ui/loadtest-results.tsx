import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { LoadTestAiAnalysis } from "./loadtest-ai-analysis";
import { LoadTestArchitecture } from "./loadtest-architecture";
import { LoadTestResultsSummary } from "./loadtest-results-summary";
import type { LoadTestListItem } from "./table-loadtest";

const API_URL = "/api/loadtest";

interface LoadTestResultsProps {
  selectedRunId?: string;
}

export const LoadTestResults = ({ selectedRunId }: LoadTestResultsProps) => {
  const [loadTest, setLoadTest] = useState<LoadTestListItem | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(selectedRunId));
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!selectedRunId) {
      return;
    }

    let isMounted = true;

    async function loadResults() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          `${API_URL}/${encodeURIComponent(selectedRunId ?? "")}`,
          {
            cache: "no-store",
          },
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message ?? "Could not load results");
        }

        if (isMounted) {
          setLoadTest(result.data as LoadTestListItem);
        }
      } catch (error) {
        if (isMounted) {
          setLoadTest(null);
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load results",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadResults();

    return () => {
      isMounted = false;
    };
  }, [selectedRunId]);
  const visibleIsLoading = Boolean(selectedRunId && isLoading);
  const visibleLoadTest = selectedRunId ? loadTest : null;
  const visibleErrorMessage = selectedRunId ? errorMessage : "";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {!selectedRunId && (
        <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl text-blue-200/70">
          Select a completed row from the load test table to view its results.
        </div>
      )}

      {visibleIsLoading && (
        <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl text-blue-200/70">
          Loading results...
        </div>
      )}

      {visibleErrorMessage && (
        <div className="p-6 bg-red-500/10 backdrop-blur-lg border border-red-400/30 rounded-2xl text-red-200">
          {visibleErrorMessage}
        </div>
      )}

      {visibleLoadTest && (
        <>
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-blue-200/60">
              Selected Result
            </div>
            <div className="mt-1 break-all font-mono text-sm text-white">
              {visibleLoadTest.id}
            </div>
          </div>
          <LoadTestResultsSummary loadTest={visibleLoadTest} />
          <LoadTestAiAnalysis loadTest={visibleLoadTest} />
        </>
      )}
      <LoadTestArchitecture loadTest={visibleLoadTest ?? undefined} />
    </motion.div>
  );
};
