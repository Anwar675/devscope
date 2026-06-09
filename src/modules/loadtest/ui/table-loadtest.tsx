"use client";

import { motion } from "motion/react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

const runningTests = [
    { id: 1, url: "/api/auth/login", method: "POST", status: "running", progress: 65, currentUsers: 650, totalUsers: 1000, latency: "245ms", errors: 3, duration: "2m 30s" },
    { id: 2, url: "/api/products", method: "GET", status: "running", progress: 45, currentUsers: 225, totalUsers: 500, latency: "120ms", errors: 0, duration: "1m 45s" },
    { id: 3, url: "/api/orders", method: "POST", status: "completed", progress: 100, currentUsers: 2000, totalUsers: 2000, latency: "890ms", errors: 12, duration: "5m 00s" },
    { id: 4, url: "/api/search", method: "GET", status: "failed", progress: 35, currentUsers: 175, totalUsers: 500, latency: "4520ms", errors: 89, duration: "1m 20s" },
    { id: 5, url: "/api/checkout", method: "POST", status: "queued", progress: 0, currentUsers: 0, totalUsers: 1000, latency: "-", errors: 0, duration: "-" },
  ];



export const LoadTestTable = () => {
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
              {runningTests.filter((t) => t.status === "running").length}{" "}
              running
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
            {runningTests.map((test, idx) => (
              <motion.tr
                key={test.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border-b border-white/5 hover:bg-white/5 transition-all"
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
                    {test.status === "queued" && (
                      <>
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-300 text-sm">Queued</span>
                      </>
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
                <td className="py-4 px-4">
                  <span className="text-blue-200/70 text-sm">
                    {test.duration}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
