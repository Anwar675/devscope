"use client";

import { motion } from "motion/react";
import {
  Activity,
  CheckCircle2,
  Clock,
  Square,
  SquareIcon,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";

export interface LoadTestListItem {
  id: string;
  url: string;
  method: string;
  status: "queued" | "running" | "completed" | "failed" | "stopped";
  progress: number;
  currentUsers: number;
  totalUsers: number;
  latency: string;
  requestsPerSecond: number;
  errorRate: number;
  errors: number;
  realtimeSeries?: LoadTestRealtimeSample[];
  duration: number;
  errorMessage?: string | null;
}

export type LoadTestRealtimeSample = {
  duration: number;
  users: number;
  latency: number;
  errors: number;
  errorRate: number;
  requestsPerSecond: number;
};

interface LoadTestTableProps {
  tests: LoadTestListItem[];
  isLoading?: boolean;
  stoppingTestId?: string;
  deletingTestId?: string;
  onStop?: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpenRunningTest?: (id: string) => void;
}

export const LoadTestTable = ({
  tests,
  isLoading = false,
  stoppingTestId,
  deletingTestId,
  onStop,
  onDelete,
  onOpenRunningTest,
}: LoadTestTableProps) => {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const runningCount = tests.filter((test) => test.status === "running").length;
  const selectTest = (id: string) => {
    setSelectedTestId(id);
  };
  const openRealtimeMetrics = (id: string) => {
    setSelectedTestId(id);
    onOpenRunningTest?.(id);
  };

  return (
    <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">
          Active & Recent Tests
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-300">
              {runningCount} running
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-sm font-medium text-blue-200/70">
                Method
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-blue-200/70">
                Endpoint
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-blue-200/70">
                Status
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-blue-200/70">
                Progress
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-blue-200/70">
                Users
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-blue-200/70">
                Latency
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-blue-200/70">
                Errors
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-blue-200/70">
                Duration
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-blue-200/70">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td
                  colSpan={9}
                  className="py-8 px-4 text-center text-blue-200/70"
                >
                  Loading tests...
                </td>
              </tr>
            )}

            {!isLoading && tests.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="py-8 px-4 text-center text-blue-200/70"
                >
                  No load tests yet.
                </td>
              </tr>
            )}

            {!isLoading && tests.map((test, idx) => (
              <motion.tr
                key={test.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => selectTest(test.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) {
                    return;
                  }

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectTest(test.id);
                  }
                }}
                tabIndex={0}
                className={`border-b border-white/5 transition-all cursor-pointer outline-none ${
                  selectedTestId === test.id
                    ? "bg-white/10"
                    : "hover:bg-white/5"
                }`}
              >
                {/* Method */}
                <td className="py-4 px-4">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      test.method === "GET"
                        ? "bg-blue-500/20 text-blue-300"
                        : test.method === "POST"
                          ? "bg-green-500/20 text-green-300"
                          : test.method === "PUT"
                            ? "bg-orange-500/20 text-orange-300"
                            : "bg-purple-500/20 text-purple-300"
                    }`}
                  >
                    {test.method}
                  </span>
                </td>

                {/* Endpoint */}
                <td className="py-4 px-4">
                  <span className="text-white text-sm font-mono">
                    {test.url}
                  </span>
                </td>

                {/* Status */}
                <td className="py-4 px-4">
                  <div className="max-w-64">
                    <div className="flex items-center gap-2">
                      {test.status === "running" && (
                        <>
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          <span className="text-green-300 text-sm">Running</span>
                        </>
                      )}
                      {test.status === "completed" && (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-green-300 text-sm">
                            Completed
                          </span>
                        </>
                      )}
                      {test.status === "failed" && (
                        <>
                          <XCircle className="w-4 h-4 text-red-400" />
                          <span className="text-red-300 text-sm">Failed</span>
                        </>
                      )}
                      {test.status === "stopped" && (
                        <span className="text-orange-300 flex items-center gap-2 text-sm">
                          <SquareIcon size="14" />
                          Stopped
                        </span>
                      )}
                      {test.status === "queued" && (
                        <>
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-300 text-sm">Queued</span>
                        </>
                      )}
                    </div>

                    {test.status !== "stopped" && test.errorMessage && (
                      <p
                        className="mt-2 line-clamp-2 text-xs text-red-200/80"
                        title={test.errorMessage}
                      >
                        {test.errorMessage}
                      </p>
                    )}
                  </div>
                </td>

                {/* Progress */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden max-w-[100px]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${test.progress}%` }}
                        className={`h-full ${
                          test.status === "completed"
                            ? "bg-green-500"
                            : test.status === "failed"
                              ? "bg-red-500"
                              : test.status === "stopped"
                                ? "bg-orange-500"
                                : test.status === "running"
                                  ? "bg-blue-500"
                                  : "bg-gray-500"
                        }`}
                      />
                    </div>
                    <span className="text-xs text-blue-200/70 w-10">
                      {test.progress}%
                    </span>
                  </div>
                </td>

                {/* Users */}
                <td className="py-4 px-4">
                  <span className="text-white text-sm">
                    {test.currentUsers}/{test.totalUsers}
                  </span>
                </td>

                {/* Latency */}
                <td className="py-4 px-4">
                  <span
                    className={`text-sm ${
                      test.latency === "-"
                        ? "text-blue-200/50"
                        : parseFloat(test.latency) > 1000
                          ? "text-red-400"
                          : parseFloat(test.latency) > 500
                            ? "text-orange-400"
                            : "text-green-400"
                    }`}
                  >
                    {test.latency}
                  </span>
                </td>

                {/* Errors */}
                <td className="py-4 px-4">
                  <span
                    className={`text-sm ${
                      test.errors === 0
                        ? "text-green-400"
                        : test.errors < 10
                          ? "text-orange-400"
                          : "text-red-400"
                    }`}
                  >
                    {test.errors}
                  </span>
                </td>

                <td className="py-4 px-4 ">
                  <span className="text-blue-200/70 text-sm">
                    {formatDuration(test.duration)}
                  </span>
                </td>

                <td className="py-4 px-4">
                  <div
                    className="flex items-center justify-end gap-2"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openRealtimeMetrics(test.id)}
                      disabled={!onOpenRunningTest}
                      title="Open realtime metrics"
                      aria-label="Open realtime metrics"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-400/30 bg-blue-500/20 text-blue-200 transition-all hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Activity className="h-4 w-4" />
                    </button>

                    {["queued", "running"].includes(test.status) ? (
                      <button
                        type="button"
                        onClick={() => onStop?.(test.id)}
                        disabled={!onStop || stoppingTestId === test.id}
                        title="Stop load test"
                        aria-label="Stop load test"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-400/30 bg-red-500/20 text-red-200 transition-all hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Square className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onDelete?.(test.id)}
                        disabled={!onDelete || deletingTestId === test.id}
                        title="Delete load test"
                        aria-label="Delete load test"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-400/30 bg-red-500/20 text-red-200 transition-all hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function formatDuration(duration: number) {
  if (duration < 60) {
    return `${duration}s`;
  }

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}
