import type { Request, Response } from "express";
import { auth } from "../../../src/lib/auth";
import {
  createLoadTestRecord,
  deleteLoadTestRecord,
  getLoadTestHealth,
  getLoadTestLog,
  getLoadTestRecord,
  listLoadTestRecords,
  LoadTestAuthError,
  LoadTestValidationError,
  stopLoadTestRecord,
} from "./loadtest.service";

export async function healthLoadTest(req: Request, res: Response) {
  try {
    await getRequiredUserId(req);

    const health = await getLoadTestHealth({
      url: getQueryString(req.query.url),
      status: getQueryString(req.query.status),
      latencyMs: getQueryNumber(req.query.latencyMs),
      previousLatencyMs: getQueryNumber(req.query.previousLatencyMs),
      errorRate: getQueryNumber(req.query.errorRate),
    });

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    handleLoadTestError(error, res, "Could not check load test health");
  }
}

export async function listLoadTests(req: Request, res: Response) {
  try {
    const userId = await getRequiredUserId(req);

    res.json({
      success: true,
      data: await listLoadTestRecords(userId),
    });
  } catch (error) {
    handleLoadTestError(error, res, "Could not load tests");
  }
}

export async function getLoadTest(req: Request, res: Response) {
  try {
    const userId = await getRequiredUserId(req);
    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Load test id is required",
      });
      return;
    }

    const loadTest = await getLoadTestRecord(userId, id);

    if (!loadTest) {
      res.status(404).json({
        success: false,
        message: "Load test not found",
      });
      return;
    }

    res.json({
      success: true,
      data: loadTest,
    });
  } catch (error) {
    handleLoadTestError(error, res, "Could not load test");
  }
}

export async function getLoadTestLogText(req: Request, res: Response) {
  try {
    const userId = await getRequiredUserId(req);
    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).type("text/plain").send("Load test id is required");
      return;
    }

    const log = await getLoadTestLog(userId, id);

    if (!log) {
      res.status(404).type("text/plain").send("Load test not found");
      return;
    }

    res.type("text/plain").send(log);
  } catch (error) {
    if (error instanceof LoadTestAuthError) {
      res.status(401).type("text/plain").send(error.message);
      return;
    }

    console.error(error);
    res.status(500).type("text/plain").send("Could not load test log");
  }
}

export async function createLoadTest(req: Request, res: Response) {
  try {
    const userId = await getRequiredUserId(req);
    const loadTest = await createLoadTestRecord(userId, req.body);

    res.status(201).json({
      success: true,
      data: loadTest,
    });
  } catch (error) {
    handleLoadTestError(error, res, "Could not create load test");
  }
}

export async function stopLoadTest(req: Request, res: Response) {
  try {
    const userId = await getRequiredUserId(req);
    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Load test id is required",
      });
      return;
    }

    const loadTest = await stopLoadTestRecord(userId, id);

    if (!loadTest) {
      res.status(404).json({
        success: false,
        message: "Load test not found",
      });
      return;
    }

    res.json({
      success: true,
      data: loadTest,
    });
  } catch (error) {
    handleLoadTestError(error, res, "Could not stop load test");
  }
}

export async function deleteLoadTest(req: Request, res: Response) {
  try {
    const userId = await getRequiredUserId(req);
    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Load test id is required",
      });
      return;
    }

    const loadTest = await deleteLoadTestRecord(userId, id);

    if (!loadTest) {
      res.status(404).json({
        success: false,
        message: "Load test not found",
      });
      return;
    }

    res.json({
      success: true,
      data: loadTest,
    });
  } catch (error) {
    handleLoadTestError(error, res, "Could not delete load test");
  }
}

async function getRequiredUserId(req: Request) {
  const session = await auth.api.getSession({
    headers: createRequestHeaders(req),
    query: {
      disableCookieCache: true,
    },
  });

  if (!session?.user.id) {
    throw new LoadTestAuthError();
  }

  return session.user.id;
}

function createRequestHeaders(req: Request) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  return headers;
}

function getQueryString(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return typeof value === "string" ? value : undefined;
}

function getQueryNumber(value: unknown) {
  const stringValue = getQueryString(value);

  if (!stringValue) {
    return undefined;
  }

  const numberValue = Number(stringValue);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function handleLoadTestError(error: unknown, res: Response, fallback: string) {
  if (error instanceof LoadTestAuthError) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
    return;
  }

  if (error instanceof LoadTestValidationError) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    success: false,
    message: fallback,
  });
}
