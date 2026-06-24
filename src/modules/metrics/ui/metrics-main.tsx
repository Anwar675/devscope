"use client";

import { useEffect, useState } from "react";
import { MetricsDistributionCharts } from "./metrics-distribution-charts";
import { MetricsEndpointTable } from "./metrics-endpoint-table";
import { MetricsHeader } from "./metrics-header";
import { MetricsPrimaryCharts } from "./metrics-primary-charts";
import { MetricsResourceDatabase } from "./metrics-resource-database";
import { MetricsSummaryCards } from "./metrics-summary-cards";
import {
  fallbackMetricsData,
  type MetricsAnalyticsData,
  type MetricsTimeRange,
} from "./metrics-data";

export function MetricsAnalytics() {
  const [timeRange, setTimeRange] = useState<MetricsTimeRange>("24h");
  const [metrics, setMetrics] =
    useState<MetricsAnalyticsData>(fallbackMetricsData);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMetrics() {
      try {
        const response = await fetch(`/api/metrics?range=${timeRange}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();

        if (!response.ok || !result.success || !isMetricsAnalyticsData(result.data)) {
          throw new Error(result.message ?? "Could not load metrics");
        }

        setMetrics(result.data);
      } catch {
        if (!controller.signal.aborted) {
          setMetrics({
            ...fallbackMetricsData,
            timeRange,
          });
        }
      }
    }

    void loadMetrics();

    return () => {
      controller.abort();
    };
  }, [timeRange]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 px-4 py-6 pt-20 sm:px-6 lg:p-8 lg:pt-30">
      <div className="mx-auto max-w-450">
        <MetricsHeader timeRange={timeRange} setTimeRange={setTimeRange} />
        <MetricsSummaryCards metrics={metrics} />
        <MetricsPrimaryCharts metrics={metrics} />
        <MetricsDistributionCharts metrics={metrics} />
        <MetricsResourceDatabase metrics={metrics} />
        <MetricsEndpointTable metrics={metrics} />
      </div>
    </div>
  );
}

function isMetricsAnalyticsData(value: unknown): value is MetricsAnalyticsData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const metrics = value as MetricsAnalyticsData;

  return (
    metrics.summary !== undefined &&
    Array.isArray(metrics.latencyTimeSeriesData) &&
    Array.isArray(metrics.throughputData) &&
    Array.isArray(metrics.errorRateData) &&
    Array.isArray(metrics.endpointBreakdown)
  );
}
