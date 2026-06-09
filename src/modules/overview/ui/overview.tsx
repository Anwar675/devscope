"use client";

import { Headers } from "../../home/headers";
import { Status, resourceMetrics, systemMetrics } from "./status";
import { Recently } from "./recently";
import { AiAnalish } from "./ai-anylish";
import { AiRecommand } from "./ai-recommand";
import { LatencyChart } from "./latency";

export const OverviewDashboard = () => {
  return (
    <div className="min-h-screen bg-linear-to-br from-dev-bg via-dev-bg-mid to-dev-bg p-8">
      <div className="max-w-450 mx-auto">
        {/* Header */}
        <Headers
          title="Performance Dashboard"
          description="Last test run: 2 minutes ago · 10,000 virtual users · E-commerce scenario"
        >
          <div className="flex gap-3">
            <span className="px-4 py-2 bg-dev-danger/20 border border-dev-danger/30 rounded-lg text-dev-danger text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-dev-danger rounded-full animate-pulse" />
              2 critical issues
            </span>
            <span className="px-4 py-2 bg-dev-orange/20 border border-dev-orange/30 rounded-lg text-dev-orange text-sm">
              1 warning
            </span>
          </div>
        </Headers>

        {/* Key Metrics */}
        <Status metrics={systemMetrics} />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Latency Chart with Phases */}
          <LatencyChart />

          {/* Test Scenarios */}
          <Recently />
        </div>

        {/* Bottlenecks & Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* AI-Detected Bottlenecks */}
          <AiAnalish />
          {/* Architecture Recommendation */}
          <AiRecommand />
        </div>

        {/* Additional System Metrics */}
        <Status metrics={resourceMetrics} className="" />
      </div>
    </div>
  );
};
