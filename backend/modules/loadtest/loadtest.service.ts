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
const MAX_LATENCY_LOG_LINES = 20;
const LATENCY_ANOMALY_MIN_DELTA_MS = 100;
const LATENCY_SPIKE_RATIO = 2.5;
const LATENCY_DROP_RATIO = 0.4;
const MAX_K6_STDERR_BUFFER_LENGTH = 4_000;
const MAX_REALTIME_SERIES_POINTS = 80;

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
};

type K6Sample = {
  latencyMs: number;
  failed: boolean;
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

  return record ? mapLoadTestRecord(record) : null;
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
    const latencyLog = formatLatencyLog(latencyLogLines);
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

    await db
      .update(loadTestRun)
      .set({
        status: metrics.errorRate > 0 ? "failed" : "completed",
        progress: 100,
        currentUsers: record.totalUsers,
        latency: metrics.latency,
        requestsPerSecond: finalRequestsPerSecond,
        errorRate: finalErrorRate,
        duration: metrics.duration,
        errors: metrics.errors,
        realtimeSeries: finalRealtimeSeries,
        summary: metrics.finalSummary,
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
      status: metrics.errorRate > 0 ? "failed" : "completed",
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
        formatLatencyLog(latencyLogLines) ?? undefined,
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
    const latencyLog = formatLatencyLog(latencyLogLines);

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

      if (!Number.isFinite(latencyMs)) {
        continue;
      }

      samples.push({
        latencyMs: Math.max(0, latencyMs),
        failed: parsed.failed === true,
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

function formatLatencyLog(latencyLogLines: string[]) {
  return latencyLogLines.length > 0 ? latencyLogLines.join("\n") : null;
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
