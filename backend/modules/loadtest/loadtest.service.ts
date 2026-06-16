import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { and, desc, eq } from "drizzle-orm";

import { db } from "../../db";
import { loadTestRun } from "../../db/schema";
import { publishLoadTestProgress } from "./loadtest.events";

const allowedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const MAX_USERS = 100_000;
const MAX_DURATION_SECONDS = 3_600;
const LOG_TTL_MS = 24 * 60 * 60 * 1_000;
const LIVE_PROGRESS_UPDATE_MS = 3_000;
const URL_PRECHECK_TIMEOUT_MS = 5_000;
const MAX_LATENCY_LOG_LINES = 100;
const MAX_ERROR_LOG_LINES = 100;
const LATENCY_ANOMALY_MIN_DELTA_MS = 100;
const LATENCY_SPIKE_RATIO = 2.5;
const LATENCY_DROP_RATIO = 0.4;
const MAX_K6_STDERR_BUFFER_LENGTH = 4_000;
const MAX_REALTIME_SERIES_POINTS = 80;
const MAX_AI_SIGNAL_LINES = 50;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

type LoadTestMethod = (typeof allowedMethods)[number];

export type LoadTestStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "stopped";

export interface CreateLoadTestInput {
  url: string;
  method: LoadTestMethod;
  users: number;
  duration: number;
  rampUp: number;
}

export interface LoadTestHealthInput {
  url?: string;
  status?: string;
  latencyMs?: number;
  previousLatencyMs?: number;
  errorRate?: number;
}

export interface LoadTestRecord extends CreateLoadTestInput {
  id: string;
  status: LoadTestStatus;
  progress: number;
  currentUsers: number;
  totalUsers: number;
  latency: string;
  requestsPerSecond: number;
  errorRate: number;
  errors: number;
  realtimeSeries: LoadTestRealtimeSample[];
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  log?: string | null;
  logExpiresAt?: string | null;
  summary?: unknown;
}

type DbLoadTestRun = typeof loadTestRun.$inferSelect;
type RunningDbLoadTestRun = DbLoadTestRun & { startedAt: Date };

type K6Summary = {
  state?: {
    testRunDurationMs?: number;
  };
  metrics?: Record<
    string,
    {
      values?: Record<string, number>;
    }
  >;
};

type LoadTestMetrics = {
  latency: string;
  errors: number;
  duration: number;
  requests: number;
  errorRate: number;
  finalSummary: LoadTestFinalSummary;
  httpReqDuration: {
    avg: number;
    "p(90)": number;
    "p(95)": number;
    "p(99)": number;
  };
};

type LoadTestFinalSummary = {
  avgLatency: number;
  p90: number;
  p95: number;
  p99: number;
  requests: number;
  errors: number;
  errorRate: number;
  duration: number;
  maxThroughput: number;
  aiInsights?: LoadTestAiInsight[];
  aiAnalysisStatus?: "generated" | "fallback" | "skipped";
  infrastructure?: LoadTestInfrastructureSnapshot;
};

type LoadTestInfrastructureSnapshot = {
  cpu: {
    status: "not_collected";
    source: string;
    note: string;
  };
  ram: {
    status: "sampled";
    source: string;
    rssMb: number;
    heapUsedMb: number;
  };
  pods: {
    status: "not_collected";
    source: string;
    note: string;
  };
  containers: {
    status: "not_collected";
    source: string;
    note: string;
  };
};

type LoadTestAiInsight = {
  type: "success" | "warning" | "recommendation";
  title: string;
  description: string;
};

type LoadTestAiPayload = {
  runId: string;
  target: {
    url: string;
    method: string;
    users: number;
    duration: number;
    rampUp: number;
    status: LoadTestStatus;
  };
  metrics: LoadTestFinalSummary;
  signals: {
    errorMessage: string | null;
    latencyAnomalies: string[];
    errorSamples: string[];
    bottlenecks: string[];
  };
};

type K6Sample = {
  latencyMs: number;
  failed: boolean;
  status?: number;
  currentUsers: number;
};

type LoadTestRealtimeSample = {
  duration: number;
  users: number;
  latency: number;
  errors: number;
  errorRate: number;
  requestsPerSecond: number;
};

type ActiveLoadTest = {
  child: ChildProcess;
  stopped: boolean;
};

const activeLoadTests = new Map<string, ActiveLoadTest>();

export class LoadTestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoadTestValidationError";
  }
}

export class LoadTestAuthError extends Error {
  constructor(message = "You must sign in to run load tests") {
    super(message);
    this.name = "LoadTestAuthError";
  }
}

class LoadTestStoppedError extends Error {
  constructor() {
    super("Load test stopped by user");
    this.name = "LoadTestStoppedError";
  }
}

export async function listLoadTestRecords(userId: string) {
  const records = await db
    .select()
    .from(loadTestRun)
    .where(eq(loadTestRun.userId, userId))
    .orderBy(desc(loadTestRun.createdAt))
    .limit(50);

  return records.map(mapLoadTestRecord);
}

export async function getLoadTestRecord(userId: string, id: string) {
  const [record] = await db
    .select()
    .from(loadTestRun)
    .where(and(eq(loadTestRun.userId, userId), eq(loadTestRun.id, id)))
    .limit(1);

  if (!record) {
    return null;
  }

  const recordWithAi = await ensureLoadTestAiAnalysis(record);

  return mapLoadTestRecord(recordWithAi);
}

export async function getLoadTestLog(userId: string, id: string) {
  const [record] = await db
    .select({ log: loadTestRun.log })
    .from(loadTestRun)
    .where(and(eq(loadTestRun.userId, userId), eq(loadTestRun.id, id)))
    .limit(1);

  if (!record) {
    return null;
  }

  return record.log ?? "No log was recorded for this load test.";
}

export async function getLoadTestHealth(input: LoadTestHealthInput = {}) {
  const target = input.url
    ? await testTargetUrl(input.url)
    : null;

  const diagnostics = evaluateLoadTestHealth(input);

  return {
    ok: diagnostics.state !== "error" && target?.ok !== false,
    target,
    diagnostics,
  };
}

export async function createLoadTestRecord(userId: string, input: unknown) {
  const payload = parseLoadTestInput(input);
  await validateReachableUrl(payload.url);
  const id = `lt_${randomUUID()}`;

  const [record] = await db
    .insert(loadTestRun)
    .values({
      id,
      userId,
      ...payload,
      status: "queued",
      progress: 0,
      currentUsers: 0,
      totalUsers: payload.users,
      latency: "-",
      errors: 0,
    })
    .returning();

  void runLoadTest(record);

  return mapLoadTestRecord(record);
}

export async function stopLoadTestRecord(userId: string, id: string) {
  const [record] = await db
    .select()
    .from(loadTestRun)
    .where(and(eq(loadTestRun.userId, userId), eq(loadTestRun.id, id)))
    .limit(1);

  if (!record) {
    return null;
  }

  if (!["queued", "running"].includes(record.status)) {
    throw new LoadTestValidationError("Only queued or running tests can stop");
  }

  const activeLoadTest = activeLoadTests.get(id);

  if (activeLoadTest) {
    activeLoadTest.stopped = true;
    activeLoadTest.child.kill("SIGTERM");
  }

  const stoppedRecord = await markStopped(id, record.log ?? undefined);

  publishLoadTestProgress({
    type: "loadtest:progress",
    id,
    progress: stoppedRecord.progress,
    currentUsers: 0,
    status: "stopped",
    latency: stoppedRecord.latency,
    latencyMs: parseLatencyMs(stoppedRecord.latency),
    duration: getActualDurationSeconds(stoppedRecord) ?? stoppedRecord.duration,
    errors: stoppedRecord.errors,
    errorMessage: stoppedRecord.errorMessage,
  });

  return mapLoadTestRecord(stoppedRecord);
}

export async function deleteLoadTestRecord(userId: string, id: string) {
  const [record] = await db
    .select({ status: loadTestRun.status })
    .from(loadTestRun)
    .where(and(eq(loadTestRun.userId, userId), eq(loadTestRun.id, id)))
    .limit(1);

  if (!record) {
    return null;
  }

  if (["queued", "running"].includes(record.status)) {
    throw new LoadTestValidationError("Stop active tests before deleting");
  }

  const [deletedRecord] = await db
    .delete(loadTestRun)
    .where(and(eq(loadTestRun.userId, userId), eq(loadTestRun.id, id)))
    .returning();

  return deletedRecord ? mapLoadTestRecord(deletedRecord) : null;
}

async function runLoadTest(record: DbLoadTestRun) {
  let liveProgress: ReturnType<typeof createLiveProgressUpdater> | undefined;
  let startedAt: Date | null = null;
  const tempDir = join(tmpdir(), "devscope-k6");
  const scriptPath = join(tempDir, `${record.id}.js`);
  const summaryPath = join(tempDir, `${record.id}.summary.json`);
  const latencyLogLines: string[] = [];
  const errorLogLines: string[] = [];

  try {
    await mkdir(tempDir, { recursive: true });
    const script = createK6Script(record);
    await writeFile(scriptPath, script, "utf8");

    if (await isLoadTestStopped(record.id)) {
      return;
    }

    startedAt = new Date();
    await markRunning(record.id, startedAt);
    const runningRecord = { ...record, startedAt };
    const progressUpdater = createLiveProgressUpdater(
      runningRecord,
      latencyLogLines,
      errorLogLines,
    );
    liveProgress = progressUpdater;

    await executeK6(scriptPath, summaryPath, record, (output) => {
      progressUpdater.handleOutput(output);
    });
    await liveProgress.flush();

    const summary = await readK6Summary(summaryPath);
    const metrics = extractK6Metrics(summary);
    const failureMessage =
      metrics.errorRate > 0
        ? `k6 completed with ${metrics.errors} failed requests`
        : null;
    const latencyLog = formatDiagnosticLog(latencyLogLines, errorLogLines);
    const finalRequestsPerSecond = roundRealtimeMetric(
      metrics.requests / metrics.duration,
    );
    const finalErrorRate = roundRealtimeMetric(metrics.errorRate * 100);
    const finalRealtimeSeries = appendRealtimeSample(
      liveProgress.getRealtimeSeries(),
      createRealtimeSample({
        duration: metrics.duration,
        users: record.totalUsers,
        latency: parseLatencyMs(metrics.latency) ?? 0,
        errors: metrics.errors,
        errorRate: finalErrorRate,
        requestsPerSecond: finalRequestsPerSecond,
      }),
    );
    const finalStatus: LoadTestStatus =
      metrics.errorRate > 0 ? "failed" : "completed";
    const aiAnalysis = await analyzeCompletedLoadTest({
      runId: record.id,
      target: {
        url: record.url,
        method: record.method,
        users: record.users,
        duration: metrics.duration,
        rampUp: record.rampUp,
        status: finalStatus,
      },
      metrics: metrics.finalSummary,
      signals: {
        errorMessage: failureMessage,
        latencyAnomalies: latencyLogLines.slice(-MAX_AI_SIGNAL_LINES),
        errorSamples: errorLogLines.slice(-MAX_AI_SIGNAL_LINES),
        bottlenecks: detectLoadTestBottlenecks(metrics.finalSummary),
      },
    });
    const finalSummary = {
      ...metrics.finalSummary,
      infrastructure: createLoadTestInfrastructureSnapshot(),
      aiInsights: aiAnalysis.insights,
      aiAnalysisStatus: aiAnalysis.status,
    };
    logLoadTestSummary(record.id, {
      status: finalStatus,
      target: `${record.method} ${record.url}`,
      metrics: metrics.finalSummary,
      signals: {
        errors: errorLogLines.length,
        latencyAnomalies: latencyLogLines.length,
        bottlenecks: detectLoadTestBottlenecks(metrics.finalSummary),
      },
      aiAnalysisStatus: aiAnalysis.status,
    });

    await db
      .update(loadTestRun)
      .set({
        status: finalStatus,
        progress: 100,
        currentUsers: record.totalUsers,
        latency: metrics.latency,
        requestsPerSecond: finalRequestsPerSecond,
        errorRate: finalErrorRate,
        duration: metrics.duration,
        errors: metrics.errors,
        realtimeSeries: finalRealtimeSeries,
        summary: finalSummary,
        log: latencyLog,
        logExpiresAt: latencyLog ? getLogExpiresAt() : null,
        errorMessage: failureMessage,
        completedAt: new Date(),
      })
      .where(eq(loadTestRun.id, record.id));

    publishLoadTestProgress({
      type: "loadtest:progress",
      id: record.id,
      progress: 100,
      currentUsers: record.totalUsers,
      status: finalStatus,
      latency: metrics.latency,
      latencyMs: parseLatencyMs(metrics.latency),
      requestsPerSecond: finalRequestsPerSecond,
      errorRate: finalErrorRate,
      duration: metrics.duration,
      errors: metrics.errors,
      errorMessage: failureMessage,
    });
  } catch (error) {
    await liveProgress?.flush();

    if (
      error instanceof LoadTestStoppedError ||
      (await isLoadTestStopped(record.id))
    ) {
      const stoppedRecord = await markStopped(
        record.id,
        formatDiagnosticLog(latencyLogLines, errorLogLines) ?? undefined,
      );

      publishLoadTestProgress({
        type: "loadtest:progress",
        id: record.id,
        progress: stoppedRecord.progress,
        currentUsers: 0,
        status: "stopped",
        latency: stoppedRecord.latency,
        latencyMs: parseLatencyMs(stoppedRecord.latency),
        duration:
          getActualDurationSeconds(stoppedRecord) ?? stoppedRecord.duration,
        errors: stoppedRecord.errors,
        errorMessage: stoppedRecord.errorMessage,
      });

      return;
    }

    const message = error instanceof Error ? error.message : "Load test failed";
    const latencyLog = formatDiagnosticLog(latencyLogLines, errorLogLines);

    logLoadTestSummary(record.id, {
      status: "failed",
      target: `${record.method} ${record.url}`,
      errorMessage: message,
      signals: {
        errors: errorLogLines.length,
        latencyAnomalies: latencyLogLines.length,
      },
    });

    await db
      .update(loadTestRun)
      .set({
        status: "failed",
        progress: 100,
        currentUsers: 0,
        log: latencyLog,
        logExpiresAt: latencyLog ? getLogExpiresAt() : null,
        errorMessage: message,
        completedAt: new Date(),
      })
      .where(eq(loadTestRun.id, record.id));

    publishLoadTestProgress({
      type: "loadtest:progress",
      id: record.id,
      progress: 100,
      currentUsers: 0,
      status: "failed",
      duration: getElapsedDurationSeconds(startedAt, new Date()),
      errorMessage: message,
    });
  } finally {
    await Promise.allSettled([unlink(scriptPath), unlink(summaryPath)]);
  }
}

function getLogExpiresAt() {
  return new Date(Date.now() + LOG_TTL_MS);
}

async function markRunning(id: string, startedAt: Date) {
  await db
    .update(loadTestRun)
    .set({
      status: "running",
      progress: 1,
      startedAt,
    })
    .where(eq(loadTestRun.id, id));
}

async function isLoadTestStopped(id: string) {
  const [record] = await db
    .select({ status: loadTestRun.status })
    .from(loadTestRun)
    .where(eq(loadTestRun.id, id))
    .limit(1);

  return record?.status === "stopped";
}

async function markStopped(id: string, log?: string) {
  const existingLog = log?.trim();
  const stoppedAt = new Date();
  const [record] = await db
    .update(loadTestRun)
    .set({
      status: "stopped",
      progress: 100,
      currentUsers: 0,
      log: existingLog || null,
      logExpiresAt: existingLog ? getLogExpiresAt() : null,
      errorMessage: "Load test stopped by user",
      completedAt: stoppedAt,
    })
    .where(eq(loadTestRun.id, id))
    .returning();

  return record;
}

function createLiveProgressUpdater(
  record: RunningDbLoadTestRun,
  latencyLogLines: string[],
  errorLogLines: string[],
) {
  let progress = 1;
  let currentUsers = 0;
  let latencySum = 0;
  let requestCount = 0;
  let previousLatencyMs: number | undefined;
  let errorCount = 0;
  let latency = "-";
  let requestsPerSecond = 0;
  let errorRate = 0;
  let realtimeSeries = getRealtimeSeries(record.realtimeSeries);
  let lastPersistedAt = 0;
  let pendingPersist: Promise<unknown> = Promise.resolve();

  const persist = () => {
    lastPersistedAt = Date.now();
    const snapshot = {
      progress,
      currentUsers,
      latency,
      requestsPerSecond,
      errorRate,
      errors: errorCount,
      realtimeSeries,
      status: "running",
    };

    pendingPersist = pendingPersist
      .catch(() => undefined)
      .then(async () => {
        await db
          .update(loadTestRun)
          .set(snapshot)
          .where(eq(loadTestRun.id, record.id));
      });
  };

  return {
    handleOutput(output: string) {
      const parsedProgress = parseK6Progress(output, record);
      const samples = parseK6Samples(output, record);

      for (const sample of samples) {
        trackLatencyAnomaly(
          latencyLogLines,
          sample.latencyMs,
          previousLatencyMs,
        );
        previousLatencyMs = sample.latencyMs;
        latencySum += sample.latencyMs;
        requestCount += 1;

        if (sample.failed) {
          errorCount += 1;
          trackErrorSample(errorLogLines, sample);
        }

        currentUsers = sample.currentUsers;
      }

      if (!parsedProgress) {
        if (output.includes("devscope-progress")) {
          console.warn("[loadtest:progress] parse:failed", {
            id: record.id,
            output: stripAnsi(output).trim(),
          });
        }

        return;
      }

      progress = parsedProgress.progress ?? progress;
      currentUsers = parsedProgress.currentUsers ?? currentUsers;
      const liveMetrics = getLiveMetrics();
      latency = liveMetrics.latency;
      requestsPerSecond = liveMetrics.requestsPerSecond;
      errorRate = liveMetrics.errorRate;
      const duration = getElapsedDurationSeconds(record.startedAt, new Date()) ?? 0;
      realtimeSeries = appendRealtimeSample(
        realtimeSeries,
        createRealtimeSample({
          duration,
          users: currentUsers,
          latency: liveMetrics.latencyMs ?? 0,
          errors: errorCount,
          errorRate,
          requestsPerSecond,
        }),
      );
      console.log("[loadtest:progress] parse:success", {
        id: record.id,
        parsedProgress,
        progress,
        currentUsers,
        liveMetrics,
      });
      publishLoadTestProgress({
        type: "loadtest:progress",
        id: record.id,
        progress,
        currentUsers,
        status: "running",
        latency: liveMetrics.latency,
        latencyMs: liveMetrics.latencyMs,
        requestsPerSecond: liveMetrics.requestsPerSecond,
        errorRate: liveMetrics.errorRate,
        errors: errorCount,
        duration,
      });

      if (Date.now() - lastPersistedAt >= LIVE_PROGRESS_UPDATE_MS) {
        persist();
      }
    },
    async flush() {
      if (progress > 1 || currentUsers > 0) {
        persist();
      }

      await pendingPersist;
    },
    getRealtimeSeries() {
      return realtimeSeries;
    },
  };

  function getLiveMetrics() {
    const now = Date.now();
    const elapsedSeconds = Math.max(
      (now - record.startedAt.getTime()) / 1000,
      1,
    );
    const latencyMs =
      requestCount > 0 ? roundLatencyMs(latencySum / requestCount) : undefined;
    const requestsPerSecond = roundRealtimeMetric(requestCount / elapsedSeconds);
    const errorRate =
      requestCount > 0
        ? roundRealtimeMetric((errorCount / requestCount) * 100)
        : 0;

    return {
      latency: latencyMs !== undefined ? formatLatencyMs(latencyMs) : "-",
      latencyMs,
      requestsPerSecond,
      errorRate,
    };
  }
}

function executeK6(
  scriptPath: string,
  summaryPath: string,
  record: DbLoadTestRun,
  onOutput: (output: string) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("k6", ["run", "--log-format", "raw", scriptPath], {
      env: {
        ...process.env,
        DEVSCOPE_TARGET_URL: record.url,
        DEVSCOPE_METHOD: record.method,
        DEVSCOPE_USERS: String(record.users),
        DEVSCOPE_SUMMARY_PATH: summaryPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const activeLoadTest: ActiveLoadTest = {
      child,
      stopped: false,
    };
    let stderr = "";

    activeLoadTests.set(record.id, activeLoadTest);

    const cleanup = () => {
      if (activeLoadTests.get(record.id) === activeLoadTest) {
        activeLoadTests.delete(record.id);
      }
    };

    child.stdout.on("data", (chunk: Buffer) => {
      const output = chunk.toString();

      if (output.includes("devscope-progress")) {
        console.log("[loadtest:k6:stdout]", stripAnsi(output).trim());
      }

      onOutput(output);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const output = chunk.toString();

      if (output.includes("devscope-progress")) {
        console.log("[loadtest:k6:stderr]", stripAnsi(output).trim());
      }

      onOutput(output);
      stderr = appendBoundedK6Stderr(stderr, output);
    });

    child.on("error", (error) => {
      cleanup();

      if (error.message.includes("ENOENT")) {
        reject(new Error("k6 is not installed or not available in PATH"));
        return;
      }

      reject(error);
    });

    child.on("close", (code) => {
      cleanup();

      if (activeLoadTest.stopped) {
        reject(new LoadTestStoppedError());
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `k6 exited with code ${code}`));
    });
  });
}

function appendBoundedK6Stderr(current: string, next: string) {
  const combined = current + next;

  if (combined.length <= MAX_K6_STDERR_BUFFER_LENGTH) {
    return combined;
  }

  return combined.slice(-MAX_K6_STDERR_BUFFER_LENGTH);
}

function parseK6Progress(output: string, record: DbLoadTestRun) {
  const latestMatch = extractK6TelemetryMessages(
    output,
    "devscope-progress",
  ).at(-1);

  if (!latestMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(latestMatch) as Record<string, unknown>;
    const progress = Number(parsed.progress);
    const currentUsers = Number(parsed.currentUsers);
    const normalizedProgress = normalizeK6Progress(progress);

    if (normalizedProgress === undefined) {
      console.warn("[loadtest:progress] progress:invalid", {
        id: record.id,
        progress: parsed.progress,
        progressType: parsed.progressType,
        message: latestMatch,
      });
    }

    return {
      progress: normalizedProgress,
      currentUsers: Number.isFinite(currentUsers)
        ? Math.min(record.totalUsers, Math.max(0, Math.round(currentUsers)))
        : undefined,
    };
  } catch (error) {
    console.warn("[loadtest:progress] json:failed", {
      id: record.id,
      message: latestMatch,
      error,
    });

    return null;
  }
}

function parseK6Samples(output: string, record: DbLoadTestRun) {
  const messages = extractK6TelemetryMessages(output, "devscope-sample");
  const samples: K6Sample[] = [];

  for (const message of messages) {
    try {
      const parsed = JSON.parse(message) as Record<string, unknown>;
      const latencyMs = Number(parsed.latencyMs);
      const currentUsers = Number(parsed.currentUsers);
      const status = Number(parsed.status);

      if (!Number.isFinite(latencyMs)) {
        continue;
      }

      samples.push({
        latencyMs: Math.max(0, latencyMs),
        failed: parsed.failed === true,
        status: Number.isFinite(status) ? Math.round(status) : undefined,
        currentUsers: Number.isFinite(currentUsers)
          ? Math.min(record.totalUsers, Math.max(0, Math.round(currentUsers)))
          : 0,
      });
    } catch {
      continue;
    }
  }

  return samples;
}

function trackLatencyAnomaly(
  latencyLogLines: string[],
  latencyMs: number,
  previousLatencyMs: number | undefined,
) {
  if (
    latencyLogLines.length >= MAX_LATENCY_LOG_LINES ||
    previousLatencyMs === undefined ||
    previousLatencyMs <= 0
  ) {
    return;
  }

  const deltaMs = Math.abs(latencyMs - previousLatencyMs);

  if (deltaMs < LATENCY_ANOMALY_MIN_DELTA_MS) {
    return;
  }

  if (latencyMs >= previousLatencyMs * LATENCY_SPIKE_RATIO) {
    latencyLogLines.push(
      `Latency spike: ${formatLatencyMs(previousLatencyMs)} -> ${formatLatencyMs(
        latencyMs,
      )}`,
    );
    return;
  }

  if (latencyMs <= previousLatencyMs * LATENCY_DROP_RATIO) {
    latencyLogLines.push(
      `Latency drop: ${formatLatencyMs(previousLatencyMs)} -> ${formatLatencyMs(
        latencyMs,
      )}`,
    );
  }
}

function trackErrorSample(errorLogLines: string[], sample: K6Sample) {
  if (errorLogLines.length >= MAX_ERROR_LOG_LINES) {
    return;
  }

  const status = sample.status ? `HTTP ${sample.status}` : "request failed";

  errorLogLines.push(`${status} at ${formatLatencyMs(sample.latencyMs)}`);
}

function formatDiagnosticLog(
  latencyLogLines: string[],
  errorLogLines: string[],
) {
  const lines = [
    ...errorLogLines.map((line) => `Error sample: ${line}`),
    ...latencyLogLines,
  ];

  return lines.length > 0 ? lines.join("\n") : null;
}

function logLoadTestSummary(id: string, summary: Record<string, unknown>) {
  console.info(
    "[loadtest:summary]",
    JSON.stringify(
      {
        id,
        completedAt: new Date().toISOString(),
        ...summary,
      },
      null,
      2,
    ),
  );
}

function createLoadTestInfrastructureSnapshot(): LoadTestInfrastructureSnapshot {
  const memory = process.memoryUsage();

  return {
    cpu: {
      status: "not_collected",
      source: "k6/http summary",
      note: "CPU usage is not collected by this k6 runner yet.",
    },
    ram: {
      status: "sampled",
      source: "node_process_memory",
      rssMb: bytesToMb(memory.rss),
      heapUsedMb: bytesToMb(memory.heapUsed),
    },
    pods: {
      status: "not_collected",
      source: "devscope-infra-agent",
      note: "Kubernetes pod metrics are collected only when the optional infra agent posts them.",
    },
    containers: {
      status: "not_collected",
      source: "devscope-infra-agent",
      note: "Container metrics are collected only when Docker or Kubernetes metrics are available to the optional infra agent.",
    },
  };
}

function bytesToMb(value: number) {
  return Number((value / 1024 / 1024).toFixed(2));
}

async function ensureLoadTestAiAnalysis(record: DbLoadTestRun) {
  if (!["completed", "failed"].includes(record.status)) {
    return record;
  }

  if (summaryHasAiInsights(record.summary)) {
    return record;
  }

  const metrics = parseStoredFinalSummary(record);

  if (!metrics) {
    return record;
  }

  const diagnosticLog = record.log ?? "";
  const aiAnalysis = await analyzeCompletedLoadTest({
    runId: record.id,
    target: {
      url: record.url,
      method: record.method,
      users: record.users,
      duration: metrics.duration,
      rampUp: record.rampUp,
      status: record.status as LoadTestStatus,
    },
    metrics,
    signals: {
      errorMessage: record.errorMessage,
      latencyAnomalies: extractDiagnosticLines(diagnosticLog, "Latency"),
      errorSamples: extractDiagnosticLines(diagnosticLog, "Error sample"),
      bottlenecks: detectLoadTestBottlenecks(metrics),
    },
  });
  const nextSummary = {
    ...(isRecord(record.summary) ? record.summary : {}),
    ...metrics,
    infrastructure: isRecord(record.summary) && isRecord(record.summary.infrastructure)
      ? record.summary.infrastructure
      : createLoadTestInfrastructureSnapshot(),
    aiInsights: aiAnalysis.insights,
    aiAnalysisStatus: aiAnalysis.status,
  };
  const [updatedRecord] = await db
    .update(loadTestRun)
    .set({
      summary: nextSummary,
    })
    .where(eq(loadTestRun.id, record.id))
    .returning();

  return updatedRecord ?? record;
}

function summaryHasAiInsights(summary: unknown) {
  return (
    isRecord(summary) &&
    Array.isArray(summary.aiInsights) &&
    summary.aiInsights.length > 0
  );
}

function parseStoredFinalSummary(record: DbLoadTestRun) {
  const summary = isRecord(record.summary) ? record.summary : {};
  const duration =
    getFiniteNumber(summary.duration) ??
    getActualDurationSeconds(record) ??
    record.duration;
  const requests = getFiniteNumber(summary.requests) ?? 0;
  const errors = getFiniteNumber(summary.errors) ?? record.errors;
  const errorRate =
    getFiniteNumber(summary.errorRate) ?? record.errorRate / 100;
  const avgLatency =
    getFiniteNumber(summary.avgLatency) ?? parseLatencyMs(record.latency) ?? 0;
  const p90 = getFiniteNumber(summary.p90) ?? avgLatency;
  const p95 = getFiniteNumber(summary.p95) ?? avgLatency;
  const p99 = getFiniteNumber(summary.p99) ?? p95;
  const maxThroughput =
    getFiniteNumber(summary.maxThroughput) ??
    record.requestsPerSecond ??
    (duration > 0 ? roundRealtimeMetric(requests / duration) : 0);

  if (avgLatency <= 0 && requests <= 0 && errors <= 0) {
    return null;
  }

  return {
    avgLatency,
    p90,
    p95,
    p99,
    requests,
    errors,
    errorRate,
    duration,
    maxThroughput,
  };
}

function extractDiagnosticLines(log: string, prefix: string) {
  return log
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes(prefix))
    .slice(-MAX_AI_SIGNAL_LINES);
}

async function analyzeCompletedLoadTest(payload: LoadTestAiPayload) {
  const key = process.env.OPENAI_API_KEY ?? process.env.OPENAI_KEY;

  if (!key) {
    return {
      insights: createFallbackAiInsights(payload),
      status: "fallback" as const,
    };
  }

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        store: false,
        input: [
          {
            role: "developer",
            content:
              "You are a senior performance engineer. Analyze only the provided summarized k6 metrics, error message, filtered error samples, latency anomalies, and bottleneck signals. Do not invent CPU, RAM, container, pod, or infrastructure facts. Return concise Vietnamese insights.",
          },
          {
            role: "user",
            content: JSON.stringify(payload),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "loadtest_ai_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                insights: {
                  type: "array",
                  minItems: 1,
                  maxItems: 3,
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["success", "warning", "recommendation"],
                      },
                      title: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["type", "title", "description"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["insights"],
              additionalProperties: false,
            },
          },
        },
        max_output_tokens: 700,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI analysis failed with status ${response.status}`);
    }

    const data = (await response.json()) as unknown;
    const parsed = parseOpenAiAnalysisResponse(data);

    if (parsed.length > 0) {
      return {
        insights: parsed,
        status: "generated" as const,
      };
    }

    return {
      insights: createFallbackAiInsights(payload),
      status: "fallback" as const,
    };
  } catch (error) {
    console.warn("[loadtest:ai-analysis] failed", {
      id: payload.runId,
      error,
    });

    return {
      insights: createFallbackAiInsights(payload),
      status: "fallback" as const,
    };
  }
}


async function testTargetUrl(url: string) {
  const startedAt = Date.now();

  try {
    const parsedUrl = parseUrl(url);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      URL_PRECHECK_TIMEOUT_MS,
    );

    try {
      const response = await fetch(parsedUrl, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
      });
      const latencyMs = Date.now() - startedAt;

      return {
        ok: response.ok,
        status: response.ok ? "reachable" : "error",
        httpStatus: response.status,
        latencyMs,
        message: response.ok
          ? "Target URL is reachable"
          : `Target URL returned HTTP ${response.status}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return {
      ok: false,
      status: "error",
      latencyMs: Date.now() - startedAt,
      message:
        error instanceof Error ? error.message : "Target URL request failed",
    };
  }
}

function evaluateLoadTestHealth(input: LoadTestHealthInput) {
  const latencyMs = normalizeOptionalNumber(input.latencyMs);
  const previousLatencyMs = normalizeOptionalNumber(input.previousLatencyMs);
  const rawErrorRate = normalizeOptionalNumber(input.errorRate);
  const errorRate =
    rawErrorRate !== undefined && rawErrorRate > 1
      ? rawErrorRate / 100
      : rawErrorRate;
  const status = getString(input.status).toLowerCase();
  const signals: string[] = [];

  if (status === "failed" || status === "error") {
    signals.push("Run status reports an error");
  }

  if (status === "running") {
    signals.push("Run is currently active");
  }

  if (errorRate !== undefined && errorRate > 0) {
    signals.push(`Error rate ${formatPercent(errorRate)}`);
  }

  if (
    latencyMs !== undefined &&
    previousLatencyMs !== undefined &&
    previousLatencyMs > 0 &&
    latencyMs >= previousLatencyMs * LATENCY_SPIKE_RATIO &&
    latencyMs - previousLatencyMs >= LATENCY_ANOMALY_MIN_DELTA_MS
  ) {
    signals.push(
      `Latency spike ${formatLatencyMs(previousLatencyMs)} -> ${formatLatencyMs(
        latencyMs,
      )}`,
    );
  }

  if (
    signals.some(
      (signal) => signal.includes("error") || signal.includes("Error"),
    )
  ) {
    return {
      state: "error",
      signals,
    };
  }

  if (signals.some((signal) => signal.includes("Latency spike"))) {
    return {
      state: "latency_spike",
      signals,
    };
  }

  if (status === "running") {
    return {
      state: "running",
      signals,
    };
  }

  return {
    state: "ok",
    signals,
  };
}

function parseOpenAiAnalysisResponse(data: unknown) {
  const outputText = extractOpenAiOutputText(data);

  if (!outputText) {
    return [];
  }

  try {
    const parsed = JSON.parse(outputText) as unknown;

    if (!isRecord(parsed) || !Array.isArray(parsed.insights)) {
      return [];
    }

    return parsed.insights
      .map(normalizeAiInsight)
      .filter((insight): insight is LoadTestAiInsight => insight !== null)
      .slice(0, 3);
  } catch {
    return [];
  }
}

function extractOpenAiOutputText(data: unknown) {
  if (!isRecord(data)) {
    return null;
  }

  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  if (!Array.isArray(data.output)) {
    return null;
  }

  for (const item of data.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (isRecord(content) && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return null;
}

function normalizeAiInsight(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const type = getString(value.type);
  const title = getString(value.title);
  const description = getString(value.description);

  if (
    !["success", "warning", "recommendation"].includes(type) ||
    !title ||
    !description
  ) {
    return null;
  }

  return {
    type: type as LoadTestAiInsight["type"],
    title,
    description,
  };
}

function createFallbackAiInsights(payload: LoadTestAiPayload) {
  const insights: LoadTestAiInsight[] = [];

  if (payload.metrics.errorRate === 0 && payload.metrics.p95 < 500) {
    insights.push({
      type: "success",
      title: "Run ổn định theo số liệu tổng hợp",
      description: `Không ghi nhận lỗi, p95 ${formatLatencyMs(
        payload.metrics.p95,
      )}, throughput trung bình ${payload.metrics.maxThroughput} req/s.`,
    });
  } else if (payload.metrics.errorRate > 0) {
    insights.push({
      type: "warning",
      title: "Có request lỗi trong quá trình chạy",
      description: `${payload.metrics.errors} lỗi trên ${
        payload.metrics.requests
      } request, error rate ${formatPercent(payload.metrics.errorRate)}.`,
    });
  } else {
    insights.push({
      type: "warning",
      title: "Latency tail cần theo dõi",
      description: `p95 ${formatLatencyMs(payload.metrics.p95)} và p99 ${formatLatencyMs(
        payload.metrics.p99,
      )} cao hơn avg ${formatLatencyMs(payload.metrics.avgLatency)}.`,
    });
  }

  const bottleneck = payload.signals.bottlenecks[0];

  insights.push({
    type: "recommendation",
    title: bottleneck ?? "Ưu tiên kiểm tra điểm nghẽn theo latency",
    description:
      payload.signals.errorSamples[0] ??
      payload.signals.latencyAnomalies[0] ??
      "Dùng avg, p95/p99, error rate và throughput của run này để khoanh vùng endpoint chậm trước khi lưu log chi tiết.",
  });

  return insights.slice(0, 3);
}

function detectLoadTestBottlenecks(summary: LoadTestFinalSummary) {
  const bottlenecks: string[] = [];

  if (summary.errorRate > 0) {
    bottlenecks.push(
      `Error rate ${formatPercent(summary.errorRate)} with ${summary.errors} failed requests`,
    );
  }

  if (summary.p95 >= Math.max(500, summary.avgLatency * 2)) {
    bottlenecks.push(
      `Tail latency high: p95 ${formatLatencyMs(summary.p95)} vs avg ${formatLatencyMs(
        summary.avgLatency,
      )}`,
    );
  }

  if (summary.p99 >= Math.max(1_000, summary.avgLatency * 3)) {
    bottlenecks.push(
      `Severe p99 latency: ${formatLatencyMs(summary.p99)}`,
    );
  }

  if (summary.maxThroughput === 0 && summary.requests === 0) {
    bottlenecks.push("No successful request throughput recorded");
  }

  return bottlenecks.slice(0, MAX_AI_SIGNAL_LINES);
}

function formatPercent(rate: number) {
  return `${roundRealtimeMetric(rate * 100)}%`;
}

function getRealtimeSeries(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const series: LoadTestRealtimeSample[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const duration = Number(item.duration);
    const users = Number(item.users);
    const latency = Number(item.latency);
    const errors = Number(item.errors);
    const errorRate = Number(item.errorRate);
    const requestsPerSecond = Number(item.requestsPerSecond);

    if (
      !Number.isFinite(duration) ||
      !Number.isFinite(users) ||
      !Number.isFinite(latency) ||
      !Number.isFinite(errors) ||
      !Number.isFinite(errorRate) ||
      !Number.isFinite(requestsPerSecond)
    ) {
      continue;
    }

    series.push(
      createRealtimeSample({
        duration,
        users,
        latency,
        errors,
        errorRate,
        requestsPerSecond,
      }),
    );
  }

  return series.slice(-MAX_REALTIME_SERIES_POINTS);
}

function createRealtimeSample(sample: LoadTestRealtimeSample) {
  return {
    duration: Math.max(0, Math.round(sample.duration)),
    users: Math.max(0, Math.round(sample.users)),
    latency: roundLatencyMs(sample.latency),
    errors: Math.max(0, Math.round(sample.errors)),
    errorRate: roundRealtimeMetric(sample.errorRate),
    requestsPerSecond: roundRealtimeMetric(sample.requestsPerSecond),
  };
}

function appendRealtimeSample(
  series: LoadTestRealtimeSample[],
  sample: LoadTestRealtimeSample,
) {
  const nextSample = createRealtimeSample(sample);
  const previousSample = series.at(-1);

  if (previousSample && areRealtimeSamplesEqual(previousSample, nextSample)) {
    return series;
  }

  return [...series, nextSample].slice(-MAX_REALTIME_SERIES_POINTS);
}

function areRealtimeSamplesEqual(
  currentSample: LoadTestRealtimeSample,
  nextSample: LoadTestRealtimeSample,
) {
  return (
    currentSample.duration === nextSample.duration &&
    currentSample.users === nextSample.users &&
    currentSample.latency === nextSample.latency &&
    currentSample.errors === nextSample.errors &&
    currentSample.errorRate === nextSample.errorRate &&
    currentSample.requestsPerSecond === nextSample.requestsPerSecond
  );
}

function extractK6TelemetryMessages(output: string, level: string) {
  const cleanOutput = stripAnsi(output);
  const messages: string[] = [];
  const escapedLevel = escapeRegExp(level);
  const rawMatches = cleanOutput.match(
    new RegExp(`\\{[^\\r\\n]*"level":"${escapedLevel}"[^\\r\\n]*\\}`, "g"),
  );

  if (rawMatches) {
    messages.push(...rawMatches);
  }

  for (const line of cleanOutput.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine.includes(level)) {
      continue;
    }

    const parsedOuterJson = parseJsonObject(trimmedLine);

    if (typeof parsedOuterJson?.msg === "string") {
      messages.push(parsedOuterJson.msg);
      continue;
    }

    const logfmtMessage = parseLogfmtMessage(trimmedLine);

    if (logfmtMessage) {
      messages.push(logfmtMessage);
    }
  }

  return messages;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function parseLogfmtMessage(value: string) {
  const match = value.match(/\bmsg=(?:"((?:\\.|[^"\\])*)"|(\S+))/);

  if (!match) {
    return null;
  }

  if (match[1] === undefined) {
    return match[2] ?? null;
  }

  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return match[1];
  }
}

function normalizeK6Progress(progress: number) {
  if (!Number.isFinite(progress)) {
    return undefined;
  }

  const percent = progress <= 1 ? progress * 100 : progress;

  return Math.min(99, Math.max(1, Math.round(percent)));
}

function stripAnsi(value: string) {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

async function readK6Summary(summaryPath: string) {
  const rawSummary = await readFile(summaryPath, "utf8");
  return JSON.parse(rawSummary) as K6Summary;
}

function extractK6Metrics(summary: K6Summary): LoadTestMetrics {
  const durationValues = summary.metrics?.http_req_duration?.values;
  const failedValues = summary.metrics?.http_req_failed?.values;
  const requestValues = summary.metrics?.http_reqs?.values;
  const testRunDurationMs =
    summary.state?.testRunDurationMs ??
    summary.metrics?.iteration_duration?.values?.max;

  const httpReqDuration = {
    avg: roundLatencyMs(durationValues?.avg),
    "p(90)": roundLatencyMs(durationValues?.["p(90)"]),
    "p(95)": roundLatencyMs(durationValues?.["p(95)"]),
    "p(99)": roundLatencyMs(durationValues?.["p(99)"]),
  };
  const averageLatency = httpReqDuration.avg;
  const errorRate = roundRate(failedValues?.rate);
  const requestCount = Math.round(requestValues?.count ?? 0);
  const errors = Math.round(errorRate * requestCount);
  const duration =
    testRunDurationMs && testRunDurationMs > 0
      ? Math.max(1, Math.round(testRunDurationMs / 1000))
      : 1;
  const finalSummary = {
    avgLatency: httpReqDuration.avg,
    p90: httpReqDuration["p(90)"],
    p95: httpReqDuration["p(95)"],
    p99: httpReqDuration["p(99)"],
    requests: requestCount,
    errors,
    errorRate,
    duration,
    maxThroughput: roundRealtimeMetric(requestCount / duration),
  };

  return {
    latency: averageLatency > 0 ? formatLatencyMs(averageLatency) : "-",
    errors,
    duration,
    requests: requestCount,
    errorRate,
    finalSummary,
    httpReqDuration,
  };
}

function roundRealtimeMetric(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  if (value < 10) {
    return Number(value.toFixed(2));
  }

  if (value < 100) {
    return Number(value.toFixed(1));
  }

  return Math.round(value);
}

function roundLatencyMs(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  if (value < 1) {
    return Number(value.toFixed(3));
  }

  if (value < 100) {
    return Number(value.toFixed(2));
  }

  return Number(value.toFixed(1));
}

function roundRate(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(4));
}

function formatLatencyMs(value: number) {
  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: value < 1 ? 3 : value < 100 ? 2 : 1,
  })}ms`;
}

function parseLatencyMs(latency: string) {
  const value = Number.parseFloat(latency);

  return Number.isFinite(value) ? roundLatencyMs(value) : undefined;
}

function createK6Script(record: DbLoadTestRun) {
  const totalDurationSeconds = Math.max(1, Math.trunc(record.duration));
  const rampUpSeconds = Math.min(
    totalDurationSeconds,
    Math.max(0, Math.trunc(record.rampUp)),
  );
  const steadyDurationSeconds = totalDurationSeconds - rampUpSeconds;
  const hasRampUp = rampUpSeconds > 0;
  const duration = formatK6Duration(totalDurationSeconds);
  const rampUp = formatK6Duration(rampUpSeconds);
  const steadyDuration = formatK6Duration(steadyDurationSeconds);
  const steadyStage =
    steadyDurationSeconds > 0
      ? `\n    { duration: ${JSON.stringify(steadyDuration)}, target: Number(__ENV.DEVSCOPE_USERS) },`
      : "";
  const options = hasRampUp
    ? `{
  stages: [
    { duration: ${JSON.stringify(rampUp)}, target: Number(__ENV.DEVSCOPE_USERS) },${steadyStage}
  ],
}`
    : `{
  vus: Number(__ENV.DEVSCOPE_USERS),
  duration: ${JSON.stringify(duration)},
}`;

  return `
import http from "k6/http";
import exec from "k6/execution";
import { sleep } from "k6";

export const options = ${options};

let lastProgressAt = 0;

export default function () {
  const response = http.request(__ENV.DEVSCOPE_METHOD, __ENV.DEVSCOPE_TARGET_URL);
  reportSample(response);
  reportProgress();

  sleep(1);
}

function reportSample(response) {
  console.log(JSON.stringify({
    level: "devscope-sample",
    latencyMs: response.timings.duration,
    status: response.status,
    failed: Boolean(response.error || response.status >= 400 || response.status === 0),
    currentUsers: exec.instance.vusActive ?? 0,
    scenario: exec.scenario.name,
  }));
}

function reportProgress() {
  if (exec.vu.idInTest !== 1) {
    return;
  }

  const now = Date.now();

  if (now - lastProgressAt < ${LIVE_PROGRESS_UPDATE_MS}) {
    return;
  }

  lastProgressAt = now;
  console.log(JSON.stringify({
    level: "devscope-progress",
    progress: exec.scenario.progress,
    progressType: typeof exec.scenario.progress,
    currentUsers: exec.instance.vusActive ?? 0,
    currentUsersType: typeof exec.instance.vusActive,
    scenario: exec.scenario.name,
  }));
}

export function handleSummary(data) {
  return {
    [__ENV.DEVSCOPE_SUMMARY_PATH]: JSON.stringify(data, null, 2),
  };
}
`;
}

function formatK6Duration(seconds: number) {
  return `${Math.max(1, Math.trunc(seconds))}s`;
}

function parseLoadTestInput(input: unknown): CreateLoadTestInput {
  if (!isRecord(input)) {
    throw new LoadTestValidationError("Request body is required");
  }

  const url = getString(input.url);
  const method = getString(input.method).toUpperCase();
  const users = getInteger(input.users, "Users");
  const duration = getInteger(input.duration, "Duration");
  const rampUp = getInteger(input.rampUp, "Ramp-up", { allowZero: true });

  if (!url) {
    throw new LoadTestValidationError("Endpoint URL is required");
  }

  const parsedUrl = parseUrl(url);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new LoadTestValidationError("Endpoint URL must use http or https");
  }

  if (!allowedMethods.includes(method as LoadTestMethod)) {
    throw new LoadTestValidationError("HTTP method is not supported");
  }

  if (users > MAX_USERS) {
    throw new LoadTestValidationError(`Users cannot exceed ${MAX_USERS}`);
  }

  if (duration > MAX_DURATION_SECONDS || rampUp > MAX_DURATION_SECONDS) {
    throw new LoadTestValidationError(
      `Duration and ramp-up cannot exceed ${MAX_DURATION_SECONDS} seconds`,
    );
  }

  if (rampUp > duration) {
    throw new LoadTestValidationError(
      "Ramp-up cannot be greater than total duration",
    );
  }

  return {
    url,
    method: method as LoadTestMethod,
    users,
    duration,
    rampUp,
  };
}

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    throw new LoadTestValidationError(
      "Endpoint URL must be a valid absolute URL",
    );
  }
}

async function validateReachableUrl(url: string) {
  const parsedUrl = parseUrl(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), URL_PRECHECK_TIMEOUT_MS);

  try {
    const response = await fetch(parsedUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });

    if ([404, 410].includes(response.status)) {
      throw new LoadTestValidationError(
        `Endpoint URL returned ${response.status}. Please enter a valid endpoint.`,
      );
    }
  } catch (error) {
    if (error instanceof LoadTestValidationError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new LoadTestValidationError(
        "Endpoint URL did not respond before the validation timeout",
      );
    }

    throw new LoadTestValidationError(
      "Endpoint URL is not reachable. Please enter a valid URL.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function getFiniteNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function getInteger(
  value: unknown,
  label: string,
  options: { allowZero?: boolean } = {},
) {
  const numberValue = Number(value);
  const minimum = options.allowZero ? 0 : 1;

  if (!Number.isInteger(numberValue) || numberValue < minimum) {
    throw new LoadTestValidationError(
      `${label} must be ${options.allowZero ? "zero or greater" : "positive"}`,
    );
  }

  return numberValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapLoadTestRecord(record: DbLoadTestRun): LoadTestRecord {
  const actualDuration = getActualDurationSeconds(record);

  return {
    id: record.id,
    url: record.url,
    method: record.method as LoadTestMethod,
    users: record.users,
    duration: actualDuration ?? record.duration,
    rampUp: record.rampUp,
    status: record.status as LoadTestStatus,
    progress: record.progress,
    currentUsers: record.currentUsers,
    totalUsers: record.totalUsers,
    latency: record.latency,
    requestsPerSecond: record.requestsPerSecond,
    errorRate: record.errorRate,
    errors: record.errors,
    realtimeSeries: getRealtimeSeries(record.realtimeSeries),
    createdAt: record.createdAt.toISOString(),
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    errorMessage: record.errorMessage,
    log: record.log,
    logExpiresAt: record.logExpiresAt?.toISOString() ?? null,
    summary: record.summary,
  };
}

function getActualDurationSeconds(record: DbLoadTestRun) {
  const summaryDuration = getSummaryDurationSeconds(record.summary);

  if (summaryDuration) {
    return summaryDuration;
  }

  if (!record.startedAt) {
    return null;
  }

  const end = record.completedAt ?? new Date();

  return getElapsedDurationSeconds(record.startedAt, end);
}

function getElapsedDurationSeconds(start: Date | null, end: Date) {
  if (!start) {
    return undefined;
  }

  const elapsedMs = end.getTime() - start.getTime();

  return elapsedMs > 0 ? Math.max(1, Math.round(elapsedMs / 1000)) : undefined;
}

function getSummaryDurationSeconds(summary: unknown) {
  if (!isRecord(summary)) {
    return null;
  }

  const duration = Number(summary.duration);

  if (Number.isFinite(duration) && duration > 0) {
    return Math.max(1, Math.round(duration));
  }

  const state = summary.state;
  const testRunDurationMs = isRecord(state)
    ? Number(state.testRunDurationMs)
    : undefined;

  if (
    typeof testRunDurationMs === "number" &&
    Number.isFinite(testRunDurationMs) &&
    testRunDurationMs > 0
  ) {
    return Math.max(1, Math.round(testRunDurationMs / 1000));
  }

  return null;
}
