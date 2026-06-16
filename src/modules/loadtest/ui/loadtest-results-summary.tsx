import { motion } from "motion/react";
import type { LoadTestListItem } from "./table-loadtest";

type LoadTestSummary = {
  avgLatency?: number;
  p90?: number;
  p95?: number;
  p99?: number;
  requests?: number;
  errors?: number;
  errorRate?: number;
  duration?: number;
  maxThroughput?: number;
};

interface LoadTestResultsSummaryProps {
  loadTest: LoadTestListItem;
}

type ResultTone = "good" | "warn" | "bad" | "neutral";

const toneStyles: Record<ResultTone, { card: string; value: string; detail: string }> = {
  good: {
    card: "border-green-400/25 bg-green-500/10",
    value: "text-green-300",
    detail: "text-green-200/70",
  },
  warn: {
    card: "border-orange-400/25 bg-orange-500/10",
    value: "text-orange-300",
    detail: "text-orange-200/70",
  },
  bad: {
    card: "border-red-400/30 bg-red-500/10",
    value: "text-red-300",
    detail: "text-red-200/70",
  },
  neutral: {
    card: "border-white/10 bg-white/5",
    value: "text-blue-100/70",
    detail: "text-blue-200/60",
  },
};

export const LoadTestResultsSummary = ({
  loadTest,
}: LoadTestResultsSummaryProps) => {
  const summary = parseLoadTestSummary(loadTest.summary);
  const requestCount = summary.requests ?? 0;
  const errorRate = summary.errorRate ?? loadTest.errorRate / 100;
  const successRate = Math.max(0, 1 - errorRate);
  const resultsData = [
    {
      metric: "Total Requests",
      value: formatNumber(requestCount),
      rawValue: requestCount,
      detail: `${loadTest.method} ${loadTest.status}`,
      tone: getRequestTone(requestCount, loadTest.status),
    },
    {
      metric: "Success Rate",
      value: formatPercent(successRate),
      rawValue: errorRate,
      detail: `${loadTest.errors} errors`,
      tone: getSuccessTone(successRate),
    },
    {
      metric: "Avg Latency",
      value: formatLatency(summary.avgLatency, loadTest.latency),
      rawValue: summary.avgLatency ?? parseFloat(loadTest.latency) ?? 0,
      detail: "average",
      tone: getLatencyTone(summary.avgLatency ?? parseFloat(loadTest.latency)),
    },
    {
      metric: "P95 Latency",
      value: formatLatency(summary.p95),
      rawValue: summary.p95 ?? 0,
      detail: "tail latency",
      tone: getLatencyTone(summary.p95),
    },
    {
      metric: "P99 Latency",
      value: formatLatency(summary.p99),
      rawValue: summary.p99 ?? 0,
      detail: "worst tail",
      tone: getLatencyTone(summary.p99),
    },
    {
      metric: "Max Throughput",
      value: `${formatNumber(
        summary.maxThroughput ?? loadTest.requestsPerSecond,
      )} req/s`,
      rawValue: summary.maxThroughput ?? loadTest.requestsPerSecond,
      detail: formatDuration(summary.duration ?? loadTest.duration),
      tone: getThroughputTone(
        summary.maxThroughput ?? loadTest.requestsPerSecond,
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {resultsData.map((result, idx) => (
        <motion.div
          key={result.metric}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className={`p-4 backdrop-blur-lg border rounded-xl ${
            toneStyles[result.tone].card
          }`}
        >
          <div className="text-sm text-blue-200/70 mb-1">{result.metric}</div>
          <div className={`text-2xl font-bold mb-1 ${toneStyles[result.tone].value}`}>
            {result.value}
          </div>
          <div className={`text-sm ${toneStyles[result.tone].detail}`}>
            {result.detail}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

function getRequestTone(
  requests: number,
  status: LoadTestListItem["status"],
): ResultTone {
  if (requests <= 0) {
    return status === "failed" ? "bad" : "neutral";
  }

  return status === "completed" ? "good" : "warn";
}

function getSuccessTone(successRate: number): ResultTone {
  if (successRate >= 0.99) {
    return "good";
  }

  if (successRate >= 0.95) {
    return "warn";
  }

  return "bad";
}

function getLatencyTone(latency?: number): ResultTone {
  if (latency === undefined || !Number.isFinite(latency) || latency <= 0) {
    return "neutral";
  }

  if (latency <= 200) {
    return "good";
  }

  if (latency <= 500) {
    return "warn";
  }

  return "bad";
}

function getThroughputTone(requestsPerSecond: number): ResultTone {
  if (requestsPerSecond <= 0) {
    return "neutral";
  }

  if (requestsPerSecond >= 50) {
    return "good";
  }

  if (requestsPerSecond >= 10) {
    return "warn";
  }

  return "bad";
}

function parseLoadTestSummary(summary: unknown): LoadTestSummary {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return {};
  }

  return summary as LoadTestSummary;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: value < 100 ? 2 : 0,
  });
}

function formatPercent(value: number) {
  return `${(value * 100).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}%`;
}

function formatLatency(value?: number, fallback = "-") {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  if (value >= 1000) {
    return `${(value / 1000).toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })}s`;
  }

  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: value < 1 ? 3 : value < 100 ? 2 : 1,
  })}ms`;
}

function formatDuration(duration: number) {
  if (duration < 60) {
    return `${duration}s`;
  }

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}
