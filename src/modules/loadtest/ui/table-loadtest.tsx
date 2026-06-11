"use client";

import { motion } from "motion/react";
import { CheckCircle2, Clock, Square, SquareIcon, XCircle } from "lucide-react";
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
  errors: number;
  duration: number;
  errorMessage?: string | null;
}

interface LoadTestTableProps {
  tests: LoadTestListItem[];
  isLoading?: boolean;
  stoppingTestId?: string;
  onStop?: (id: string) => void;
}

export const LoadTestTable = ({
  tests,
  isLoading = false,
  stoppingTestId,
  onStop,
}: LoadTestTableProps) => {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const runningCount = tests.filter((test) => test.status === "running").length;

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
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 px-4 text-center text-blue-200/70"
                >
                  Loading tests...
                </td>
              </tr>
            )}

            {!isLoading && tests.length === 0 && (
              <tr>
                <td
                  colSpan={8}
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
                onClick={() => setSelectedTestId(test.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedTestId(test.id);
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

                {/* Duration */}
                <td className="relative py-4 px-4 ">
                  <span className="text-blue-200/70 text-sm">
                    {formatDuration(test.duration)}
                  </span>
                  {selectedTestId === test.id &&
                    ["queued", "running"].includes(test.status) && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onStop?.(test.id);
                        }}
                        disabled={!onStop || stoppingTestId === test.id}
                        className="absolute right-4 top-1/2 inline-flex -translate-y-1/2 items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/20 px-3 py-2 text-xs font-medium text-red-200 shadow-lg shadow-black/20 backdrop-blur transition-all hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Square className="h-3.5 w-3.5" />
                        {stoppingTestId === test.id ? "Stopping" : "Stop"}
                      </button>
                    )}
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
