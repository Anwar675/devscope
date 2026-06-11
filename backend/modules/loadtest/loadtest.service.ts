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
  errors: number;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  log?: string | null;
  logExpiresAt?: string | null;
  summary?: unknown;
}

type DbLoadTestRun = typeof loadTestRun.$inferSelect;

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
  httpReqDuration: {
    avg: number;
    "p(90)": number;
    "p(95)": number;
    "p(99)": number;
  };
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
    duration: getActualDurationSeconds(stoppedRecord) ?? stoppedRecord.duration,
    errors: stoppedRecord.errors,
    errorMessage: stoppedRecord.errorMessage,
  });

  return mapLoadTestRecord(stoppedRecord);
}

async function runLoadTest(record: DbLoadTestRun) {
  let liveProgress: ReturnType<typeof createLiveProgressUpdater> | undefined;
  let startedAt: Date | null = null;
  const tempDir = join(tmpdir(), "devscope-k6");
  const scriptPath = join(tempDir, `${record.id}.js`);
  const summaryPath = join(tempDir, `${record.id}.summary.json`);
  const logLines: string[] = [
    `Load test: ${record.id}`,
    `Target: ${record.method} ${record.url}`,
    `Users: ${record.users}`,
    `Duration: ${record.duration}s`,
    `Ramp-up: ${record.rampUp}s`,
    `Started: ${new Date().toISOString()}`,
    "",
  ];

  try {
    await mkdir(tempDir, { recursive: true });
    const script = createK6Script(record);
    await writeFile(scriptPath, script, "utf8");

    if (await isLoadTestStopped(record.id)) {
      return;
    }

    startedAt = new Date();
    await markRunning(record.id, startedAt);
    const progressUpdater = createLiveProgressUpdater(record);
    liveProgress = progressUpdater;

    await executeK6(scriptPath, summaryPath, logLines, record, (output) => {
      progressUpdater.handleOutput(output);
    });
    await liveProgress.flush();

    const summary = await readK6Summary(summaryPath);
    const metrics = extractK6Metrics(summary);
    const failedRate = summary.metrics?.http_req_failed?.values?.rate ?? 0;
    logLines.push(
      "Final metrics:",
      JSON.stringify(
        {
          http_req_duration: metrics.httpReqDuration,
          duration: metrics.duration,
          errors: metrics.errors,
          failedRate,
        },
        null,
        2,
      ),
      "",
    );
    const failureMessage =
      failedRate > 0
        ? `k6 completed with ${metrics.errors} failed requests`
        : null;

    await db
      .update(loadTestRun)
      .set({
        status: failedRate > 0 ? "failed" : "completed",
        progress: 100,
        currentUsers: record.totalUsers,
        latency: metrics.latency,
        duration: metrics.duration,
        errors: metrics.errors,
        summary,
        log: logLines.join("\n"),
        logExpiresAt: getLogExpiresAt(),
        errorMessage: failureMessage,
        completedAt: new Date(),
      })
      .where(eq(loadTestRun.id, record.id));

    publishLoadTestProgress({
      type: "loadtest:progress",
      id: record.id,
      progress: 100,
      currentUsers: record.totalUsers,
      status: failedRate > 0 ? "failed" : "completed",
      latency: metrics.latency,
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
      const stoppedRecord = await markStopped(record.id, logLines.join("\n"));

      publishLoadTestProgress({
        type: "loadtest:progress",
        id: record.id,
        progress: stoppedRecord.progress,
        currentUsers: 0,
        status: "stopped",
        latency: stoppedRecord.latency,
        duration:
          getActualDurationSeconds(stoppedRecord) ?? stoppedRecord.duration,
        errors: stoppedRecord.errors,
        errorMessage: stoppedRecord.errorMessage,
      });

      return;
    }

    const message = error instanceof Error ? error.message : "Load test failed";
    logLines.push("[devscope]", message, "");

    await db
      .update(loadTestRun)
      .set({
        status: "failed",
        progress: 100,
        currentUsers: 0,
        log: logLines.join("\n"),
        logExpiresAt: getLogExpiresAt(),
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
      log: existingLog
        ? `${existingLog}\n[devscope] Load test stopped by user`
        : "[devscope] Load test stopped by user",
      logExpiresAt: getLogExpiresAt(),
      errorMessage: "Load test stopped by user",
      completedAt: stoppedAt,
    })
    .where(eq(loadTestRun.id, id))
    .returning();

  return record;
}

function createLiveProgressUpdater(record: DbLoadTestRun) {
  let progress = 1;
  let currentUsers = 0;
  let lastPersistedAt = 0;
  let pendingPersist: Promise<unknown> = Promise.resolve();

  const persist = () => {
    lastPersistedAt = Date.now();
    const snapshot = {
      progress,
      currentUsers,
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
      console.log("[loadtest:progress] parse:success", {
        id: record.id,
        parsedProgress,
        progress,
        currentUsers,
      });
      publishLoadTestProgress({
        type: "loadtest:progress",
        id: record.id,
        progress,
        currentUsers,
        status: "running",
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
  };
}

function executeK6(
  scriptPath: string,
  summaryPath: string,
  logLines: string[],
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
      stderr += output;
      logLines.push(output.trim());
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

function parseK6Progress(output: string, record: DbLoadTestRun) {
  const latestMatch = extractK6ProgressMessages(output).at(-1);

  if (!latestMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(latestMatch) as {
      progress?: unknown;
      currentUsers?: unknown;
      progressType?: unknown;
    };
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

function extractK6ProgressMessages(output: string) {
  const cleanOutput = stripAnsi(output);
  const messages: string[] = [];
  const rawMatches = cleanOutput.match(
    /\{[^\r\n]*"level":"devscope-progress"[^\r\n]*\}/g,
  );

  if (rawMatches) {
    messages.push(...rawMatches);
  }

  for (const line of cleanOutput.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine.includes("devscope-progress")) {
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
    avg: roundMetric(durationValues?.avg),
    "p(90)": roundMetric(durationValues?.["p(90)"]),
    "p(95)": roundMetric(durationValues?.["p(95)"]),
    "p(99)": roundMetric(durationValues?.["p(99)"]),
  };
  const averageLatency = httpReqDuration.avg;
  const failedRate = failedValues?.rate ?? 0;
  const requestCount = requestValues?.count ?? 0;

  return {
    latency: averageLatency > 0 ? `${averageLatency}ms` : "-",
    errors: Math.round(failedRate * requestCount),
    duration:
      testRunDurationMs && testRunDurationMs > 0
        ? Math.max(1, Math.round(testRunDurationMs / 1000))
        : 1,
    httpReqDuration,
  };
}

function roundMetric(value: number | undefined) {
  return Math.round(value ?? 0);
}

function createK6Script(record: DbLoadTestRun) {
  const hasRampUp = record.rampUp > 0;
  const duration = formatK6Duration(record.duration);
  const rampUp = formatK6Duration(record.rampUp);
  const options = hasRampUp
    ? `{
  stages: [
    { duration: ${JSON.stringify(rampUp)}, target: Number(__ENV.DEVSCOPE_USERS) },
    { duration: ${JSON.stringify(duration)}, target: Number(__ENV.DEVSCOPE_USERS) },
    { duration: "1s", target: 0 },
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
  reportProgress();
  const response = http.request(__ENV.DEVSCOPE_METHOD, __ENV.DEVSCOPE_TARGET_URL);

  if (response.error || response.status >= 400 || response.status === 0) {
    console.error(JSON.stringify({
      level: "error",
      method: __ENV.DEVSCOPE_METHOD,
      url: __ENV.DEVSCOPE_TARGET_URL,
      status: response.status,
      error: response.error,
      body: response.body ? String(response.body).slice(0, 500) : "",
    }));
  }

  sleep(1);
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
    errors: record.errors,
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
