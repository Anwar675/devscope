import type { Request, Response } from "express";
import { auth } from "../../../src/lib/auth";
import {
  createLoadTestRecord,
  getLoadTestLog,
  getLoadTestRecord,
  listLoadTestRecords,
  LoadTestAuthError,
  LoadTestValidationError,
  stopLoadTestRecord,
} from "./loadtest.service";

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
