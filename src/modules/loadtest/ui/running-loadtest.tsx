"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { LoadTestLiveStats } from "./loadtest-live-stats";
import { LoadTestProgress } from "./loadtest-progress";
import { LoadTestRealtimeCharts } from "./loadtest-realtime-charts";
import type { LoadTestListItem } from "./table-loadtest";

const API_URL = "/api/loadtest";
const LOADTEST_WS_URL =
  process.env.NEXT_PUBLIC_LOADTEST_WS_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

type LoadTestProgressEvent = {
  type: "loadtest:progress";
  id: string;
  progress: number;
  currentUsers: number;
  status: LoadTestListItem["status"];
  latency?: string;
  latencyMs?: number;
  requestsPerSecond?: number;
  errorRate?: number;
  duration?: number;
  errors?: number;
  errorMessage?: string | null;
};

export type LoadTestRealtimePoint = {
  time: string;
  users: number;
  latency: number;
  errors: number;
  errorRate: number;
  requestsPerSecond: number;
};

export type LoadTestLiveSnapshot = {
  progress: number;
  currentUsers: number;
  totalUsers: number;
  latency: string;
  latencyMs?: number;
  requestsPerSecond: number;
  errorRate: number;
  errors: number;
  duration: number;
  status: LoadTestListItem["status"];
};

interface RunningLoadTestProps {
  selectedRunId?: string;
}

export const RunningLoadTest = ({ selectedRunId }: RunningLoadTestProps) => {
  const [tests, setTests] = useState<LoadTestListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<
    Record<string, LoadTestLiveSnapshot>
  >({});
  const [seriesByRunId, setSeriesByRunId] = useState<
    Record<string, LoadTestRealtimePoint[]>
  >({});

  useEffect(() => {
    if (!selectedRunId) {
      return;
    }

    const runId = selectedRunId;
    let isMounted = true;

    async function loadSelectedTest() {
      const selectedTest = await loadTestById(runId);

      if (!isMounted || !selectedTest) {
        return;
      }

      setTests((currentTests) =>
        putSelectedTestFirst(currentTests, selectedTest),
      );
      setSelectedTestId(runId);
      setSnapshots((currentSnapshots) =>
        upsertSnapshot(currentSnapshots, runId, createSnapshotFromRecord(selectedTest)),
      );
      setSeriesByRunId((currentSeries) =>
        upsertRealtimeSeries(
          currentSeries,
          runId,
          createRealtimeSeriesFromRecord(selectedTest),
        ),
      );
      setIsLoading(false);
    }

    void loadSelectedTest();

    return () => {
      isMounted = false;
    };
  }, [selectedRunId]);

  useEffect(() => {
    let isMounted = true;

    async function loadRunningTests() {
      try {
        const response = await fetch(API_URL, {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message ?? "Could not load running tests");
        }

        if (!isMounted) {
          return;
        }

        const visibleTests = (result.data as LoadTestListItem[]).filter((test) =>
          ["queued", "running"].includes(test.status),
        );

        setTests((currentTests) => {
          const selectedTest = selectedRunId
            ? currentTests.find((test) => test.id === selectedRunId)
            : undefined;

          if (
            selectedTest &&
            !visibleTests.some((test) => test.id === selectedTest.id)
          ) {
            const nextTests = [selectedTest, ...visibleTests];

            return areLoadTestListsEqual(currentTests, nextTests)
              ? currentTests
              : nextTests;
          }

          return areLoadTestListsEqual(currentTests, visibleTests)
            ? currentTests
            : visibleTests;
        });
        setSelectedTestId(
          (currentId) => selectedRunId ?? currentId ?? visibleTests[0]?.id ?? null,
        );
        setSnapshots((currentSnapshots) => {
          let nextSnapshots = currentSnapshots;

          for (const test of visibleTests) {
            nextSnapshots = upsertSnapshot(
              nextSnapshots,
              test.id,
              nextSnapshots[test.id] ?? createSnapshotFromRecord(test),
            );
          }

          return nextSnapshots;
        });
        setSeriesByRunId((currentSeries) => {
          let nextSeries = currentSeries;

          for (const test of visibleTests) {
            const realtimeSeries = createRealtimeSeriesFromRecord(test);

            if (realtimeSeries.length === 0) {
              continue;
            }

            nextSeries = upsertRealtimeSeries(
              nextSeries,
              test.id,
              realtimeSeries,
            );
          }

          return nextSeries;
        });
      } catch {
        if (isMounted) {
          setTests([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRunningTests();

    return () => {
      isMounted = false;
    };
  }, [selectedRunId]);

  const selectedTest = useMemo(
    () => tests.find((test) => test.id === selectedTestId) ?? tests[0],
    [selectedTestId, tests],
  );
  const selectedSnapshot = selectedTest
    ? snapshots[selectedTest.id] ?? createSnapshotFromRecord(selectedTest)
    : undefined;
  const selectedSeries = selectedTest
    ? seriesByRunId[selectedTest.id] ?? []
    : [];
  const selectedActiveTestId =
    selectedTest && ["queued", "running"].includes(selectedTest.status)
      ? selectedTest.id
      : "";

  useEffect(() => {
    if (!selectedActiveTestId) {
      return;
    }

    const socket = new WebSocket(createLoadTestSocketUrl(selectedActiveTestId));

    socket.addEventListener("message", (message) => {
      const event = parseLoadTestProgressEvent(message.data);

      if (!event) {
        return;
      }

      setTests((currentTests) => {
        const updatedTests = applyLoadTestProgressToRecords(
          currentTests,
          event,
        ).filter(
          (test) =>
            ["queued", "running"].includes(test.status) ||
            test.id === selectedRunId,
        );

        return updatedTests === currentTests ||
          areLoadTestListsEqual(currentTests, updatedTests)
          ? currentTests
          : updatedTests;
      });
      setSnapshots((currentSnapshots) => {
        const previous = currentSnapshots[event.id];
        const nextSnapshot = {
          progress: event.progress,
          currentUsers: event.currentUsers,
          totalUsers: previous?.totalUsers ?? event.currentUsers,
          latency: event.latency ?? previous?.latency ?? "-",
          latencyMs: event.latencyMs ?? previous?.latencyMs,
          requestsPerSecond:
            event.requestsPerSecond ?? previous?.requestsPerSecond ?? 0,
          errorRate: event.errorRate ?? previous?.errorRate ?? 0,
          errors: event.errors ?? previous?.errors ?? 0,
          duration: event.duration ?? previous?.duration ?? 0,
          status: event.status,
        };

        return upsertSnapshot(currentSnapshots, event.id, nextSnapshot);
      });
      setSeriesByRunId((currentSeries) => {
        const previousSeries = currentSeries[event.id] ?? [];
        const previousPoint = previousSeries.at(-1);
        const point = createRealtimePoint(event, previousPoint);

        if (previousPoint && areRealtimePointsEqual(previousPoint, point)) {
          return currentSeries;
        }

        return {
          ...currentSeries,
          [event.id]: [...previousSeries, point].slice(-80),
        };
      });
    });

    return () => {
      socket.close();
    };
  }, [selectedActiveTestId, selectedRunId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap gap-2">
        {tests.map((test) => (
          <button
            key={test.id}
            type="button"
            onClick={() => setSelectedTestId(test.id)}
            className={`max-w-full rounded-lg px-4 py-2 text-sm transition-all ${
              selectedTest?.id === test.id
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-blue-200/70 hover:bg-white/10"
            }`}
          >
            <span className="font-medium">{test.method}</span>{" "}
            <span className="font-mono">{test.url}</span>
          </button>
        ))}
      </div>

      {(selectedTest || selectedRunId) && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-blue-200/60">
            Selected Run
          </div>
          <div className="mt-1 break-all font-mono text-sm text-white">
            {selectedTest?.id ?? selectedRunId}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl text-blue-200/70">
          Loading running tests...
        </div>
      )}

      {!isLoading && !selectedTest && (
        <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl text-blue-200/70">
          No tests are running right now.
        </div>
      )}

      {selectedTest && selectedSnapshot && (
        <>
          <LoadTestLiveStats snapshot={selectedSnapshot} />
          <LoadTestRealtimeCharts data={selectedSeries} />
          <LoadTestProgress
            duration={selectedSnapshot.duration}
            progress={selectedSnapshot.progress}
            totalDuration={estimateTotalDuration(
              selectedSnapshot.duration,
              selectedSnapshot.progress,
            )}
          />
        </>
      )}
    </motion.div>
  );
};

async function loadTestById(id: string) {
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      return null;
    }

    return result.data as LoadTestListItem;
  } catch {
    return null;
  }
}

function putSelectedTestFirst(
  currentTests: LoadTestListItem[],
  selectedTest: LoadTestListItem,
) {
  const nextTests = [
    selectedTest,
    ...currentTests.filter((test) => test.id !== selectedTest.id),
  ];

  return areLoadTestListsEqual(currentTests, nextTests)
    ? currentTests
    : nextTests;
}

function createSnapshotFromRecord(test: LoadTestListItem): LoadTestLiveSnapshot {
  return {
    progress: test.progress,
    currentUsers: test.currentUsers,
    totalUsers: test.totalUsers,
    latency: test.latency,
    latencyMs: parseLatencyMs(test.latency),
    requestsPerSecond: test.requestsPerSecond,
    errorRate: test.errorRate,
    errors: test.errors,
    duration: test.duration,
    status: test.status,
  };
}

function createRealtimeSeriesFromRecord(test: LoadTestListItem) {
  if (!Array.isArray(test.realtimeSeries)) {
    return [];
  }

  return test.realtimeSeries.map((point) => ({
    time: formatDuration(point.duration),
    users: point.users,
    latency: point.latency,
    errors: point.errors,
    errorRate: point.errorRate,
    requestsPerSecond: point.requestsPerSecond,
  }));
}

function createRealtimePoint(
  event: LoadTestProgressEvent,
  previousPoint: LoadTestRealtimePoint | undefined,
): LoadTestRealtimePoint {
  return {
    time: formatDuration(event.duration ?? 0),
    users: event.currentUsers,
    latency: event.latencyMs ?? previousPoint?.latency ?? 0,
    errors: event.errors ?? previousPoint?.errors ?? 0,
    errorRate: event.errorRate ?? previousPoint?.errorRate ?? 0,
    requestsPerSecond:
      event.requestsPerSecond ?? previousPoint?.requestsPerSecond ?? 0,
  };
}

function applyLoadTestProgressToRecords(
  tests: LoadTestListItem[],
  event: LoadTestProgressEvent,
) {
  let changed = false;
  const nextTests = tests.map((test) => {
    if (test.id !== event.id) {
      return test;
    }

    const nextTest = {
      ...test,
      progress: event.progress,
      currentUsers: event.currentUsers,
      status: event.status,
      latency: event.latency ?? test.latency,
      requestsPerSecond: event.requestsPerSecond ?? test.requestsPerSecond,
      errorRate: event.errorRate ?? test.errorRate,
      duration: event.duration ?? test.duration,
      errors: event.errors ?? test.errors,
      errorMessage: event.errorMessage ?? test.errorMessage,
    };

    if (areLoadTestRecordsEqual(test, nextTest)) {
      return test;
    }

    changed = true;
    return nextTest;
  });

  return changed ? nextTests : tests;
}

function upsertSnapshot(
  snapshots: Record<string, LoadTestLiveSnapshot>,
  id: string,
  snapshot: LoadTestLiveSnapshot,
) {
  const currentSnapshot = snapshots[id];

  if (currentSnapshot && areSnapshotsEqual(currentSnapshot, snapshot)) {
    return snapshots;
  }

  return {
    ...snapshots,
    [id]: snapshot,
  };
}

function upsertRealtimeSeries(
  seriesByRunId: Record<string, LoadTestRealtimePoint[]>,
  id: string,
  series: LoadTestRealtimePoint[],
) {
  const currentSeries = seriesByRunId[id] ?? [];

  if (areRealtimeSeriesEqual(currentSeries, series)) {
    return seriesByRunId;
  }

  return {
    ...seriesByRunId,
    [id]: series,
  };
}

function areLoadTestListsEqual(
  currentTests: LoadTestListItem[],
  nextTests: LoadTestListItem[],
) {
  if (currentTests.length !== nextTests.length) {
    return false;
  }

  return currentTests.every((test, index) =>
    areLoadTestRecordsEqual(test, nextTests[index]),
  );
}

function areLoadTestRecordsEqual(
  currentTest: LoadTestListItem,
  nextTest: LoadTestListItem,
) {
  return (
    currentTest.id === nextTest.id &&
    currentTest.url === nextTest.url &&
    currentTest.method === nextTest.method &&
    currentTest.status === nextTest.status &&
    currentTest.progress === nextTest.progress &&
    currentTest.currentUsers === nextTest.currentUsers &&
    currentTest.totalUsers === nextTest.totalUsers &&
    currentTest.latency === nextTest.latency &&
    currentTest.requestsPerSecond === nextTest.requestsPerSecond &&
    currentTest.errorRate === nextTest.errorRate &&
    currentTest.errors === nextTest.errors &&
    currentTest.duration === nextTest.duration &&
    currentTest.errorMessage === nextTest.errorMessage
  );
}

function areSnapshotsEqual(
  currentSnapshot: LoadTestLiveSnapshot,
  nextSnapshot: LoadTestLiveSnapshot,
) {
  return (
    currentSnapshot.progress === nextSnapshot.progress &&
    currentSnapshot.currentUsers === nextSnapshot.currentUsers &&
    currentSnapshot.totalUsers === nextSnapshot.totalUsers &&
    currentSnapshot.latency === nextSnapshot.latency &&
    currentSnapshot.latencyMs === nextSnapshot.latencyMs &&
    currentSnapshot.requestsPerSecond === nextSnapshot.requestsPerSecond &&
    currentSnapshot.errorRate === nextSnapshot.errorRate &&
    currentSnapshot.errors === nextSnapshot.errors &&
    currentSnapshot.duration === nextSnapshot.duration &&
    currentSnapshot.status === nextSnapshot.status
  );
}

function areRealtimePointsEqual(
  currentPoint: LoadTestRealtimePoint,
  nextPoint: LoadTestRealtimePoint,
) {
  return (
    currentPoint.time === nextPoint.time &&
    currentPoint.users === nextPoint.users &&
    currentPoint.latency === nextPoint.latency &&
    currentPoint.errors === nextPoint.errors &&
    currentPoint.errorRate === nextPoint.errorRate &&
    currentPoint.requestsPerSecond === nextPoint.requestsPerSecond
  );
}

function areRealtimeSeriesEqual(
  currentSeries: LoadTestRealtimePoint[],
  nextSeries: LoadTestRealtimePoint[],
) {
  if (currentSeries.length !== nextSeries.length) {
    return false;
  }

  return currentSeries.every((point, index) =>
    areRealtimePointsEqual(point, nextSeries[index]),
  );
}

function parseLoadTestProgressEvent(data: unknown) {
  if (typeof data !== "string") {
    return null;
  }

  try {
    const event = JSON.parse(data) as LoadTestProgressEvent;

    if (
      event.type !== "loadtest:progress" ||
      typeof event.id !== "string" ||
      typeof event.progress !== "number" ||
      typeof event.currentUsers !== "number" ||
      (event.duration !== undefined && typeof event.duration !== "number") ||
      (event.latencyMs !== undefined && typeof event.latencyMs !== "number") ||
      (event.requestsPerSecond !== undefined &&
        typeof event.requestsPerSecond !== "number") ||
      (event.errorRate !== undefined && typeof event.errorRate !== "number") ||
      !["running", "completed", "failed", "stopped"].includes(event.status)
    ) {
      return null;
    }

    return event;
  } catch {
    return null;
  }
}

function createLoadTestSocketUrl(id: string) {
  const url = new URL(LOADTEST_WS_URL);

  if (url.protocol === "http:") {
    url.protocol = "ws:";
  }

  if (url.protocol === "https:") {
    url.protocol = "wss:";
  }

  if (url.pathname === "/") {
    url.pathname = "/loadtest/events";
  }

  url.searchParams.set("id", id);

  return url;
}

function parseLatencyMs(latency: string) {
  const value = Number.parseFloat(latency);

  return Number.isFinite(value) ? roundLatencyMs(value) : undefined;
}

function roundLatencyMs(value: number) {
  if (value < 1) {
    return Number(value.toFixed(3));
  }

  if (value < 100) {
    return Number(value.toFixed(2));
  }

  return Number(value.toFixed(1));
}

function formatDuration(duration: number) {
  if (duration < 60) {
    return `${Math.max(0, duration)}s`;
  }

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

function estimateTotalDuration(duration: number, progress: number) {
  if (progress <= 0) {
    return duration;
  }

  return Math.max(duration, Math.round(duration / (progress / 100)));
}
