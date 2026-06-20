"use client";

import { useEffect, useState } from "react";
import { Headers } from "../../home/headers";
import { Status } from "./status";
import { Recently } from "./recently";
import { AiAnalish } from "./ai-anylish";
import { AiRecommand } from "./ai-recommand";
import { LatencyChart } from "./latency";
import {
  fallbackOverviewData,
  isOverviewDashboardData,
  type OverviewDashboardData,
} from "./overview-data";

export const OverviewDashboard = () => {
  const [dashboard, setDashboard] =
    useState<OverviewDashboardData>(fallbackOverviewData);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadOverview() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/overview?range=3d", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();

        if (!response.ok || !result.success || !isOverviewDashboardData(result.data)) {
          throw new Error(result.message ?? "Could not load overview dashboard");
        }

        setDashboard(result.data);
      } catch (error) {
        if (!controller.signal.aborted) {
          setDashboard(fallbackOverviewData);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not load overview dashboard",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-dev-bg via-dev-bg-mid to-dev-bg p-8">
      <div className="max-w-450 mx-auto">
        <Headers
          title={dashboard.header.title}
          description={dashboard.header.description}
        >
          <div className="flex flex-wrap justify-end gap-3">
            {dashboard.header.badges.map((badge) => (
              <span
                key={badge.label}
                className={`px-4 py-2 border rounded-lg text-sm flex items-center gap-2 ${
                  badge.tone === "danger"
                    ? "bg-dev-danger/20 border-dev-danger/30 text-dev-danger"
                    : badge.tone === "warning"
                      ? "bg-dev-orange/20 border-dev-orange/30 text-dev-orange"
                      : "bg-dev-success/20 border-dev-success/30 text-dev-success"
                }`}
              >
                {badge.tone === "danger" && (
                  <span className="w-2 h-2 bg-dev-danger rounded-full animate-pulse" />
                )}
                {badge.label}
              </span>
            ))}
          </div>
        </Headers>

        {isLoading && (
          <div className="mb-8 rounded-2xl border border-dev-border bg-dev-surface/5 p-6 text-dev-text-muted">
            Loading overview...
          </div>
        )}
        {errorMessage && (
          <div className="mb-8 rounded-2xl border border-dev-danger/30 bg-dev-danger/10 p-6 text-dev-danger">
            {errorMessage}
          </div>
        )}

        <Status metrics={dashboard.keyMetrics} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <LatencyChart data={dashboard.latencyTrend} />
          <Recently scenarios={dashboard.scenarios} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AiAnalish analysis={dashboard.aiAnalysis} />
          <AiRecommand recommendations={dashboard.recommendations} />
        </div>

        <Status metrics={dashboard.performanceSignals} className="" />
      </div>
    </div>
  );
};
