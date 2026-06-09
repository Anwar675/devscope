"use client";

import { useState } from "react";
import { MetricsDistributionCharts } from "./metrics-distribution-charts";
import { MetricsEndpointTable } from "./metrics-endpoint-table";
import { MetricsHeader } from "./metrics-header";
import { MetricsPrimaryCharts } from "./metrics-primary-charts";
import { MetricsResourceDatabase } from "./metrics-resource-database";
import { MetricsSummaryCards } from "./metrics-summary-cards";
import type { MetricsTimeRange } from "./metrics-data";

export function MetricsAnalytics() {
  const [timeRange, setTimeRange] = useState<MetricsTimeRange>("24h");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-8">
      <div className="max-w-450 mx-auto">
        <MetricsHeader timeRange={timeRange} setTimeRange={setTimeRange} />
        <MetricsSummaryCards />
        <MetricsPrimaryCharts />
        <MetricsDistributionCharts />
        <MetricsResourceDatabase />
        <MetricsEndpointTable />
      </div>
    </div>
  );
}
