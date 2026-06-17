import type { Request, Response } from "express";
import { auth } from "../../../src/lib/auth";
import {
  getBackendMetrics,
  MetricsValidationError,
} from "./metrics.service";

export class MetricsAuthError extends Error {
  constructor(message = "You must sign in to view metrics") {
    super(message);
    this.name = "MetricsAuthError";
  }
}

export async function getMetrics(req: Request, res: Response) {
  try {
    const userId = await getRequiredUserId(req);

    res.json({
      success: true,
      data: await getBackendMetrics(userId, getQueryString(req.query.range)),
    });
  } catch (error) {
    handleMetricsError(error, res);
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
    throw new MetricsAuthError();
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

function handleMetricsError(error: unknown, res: Response) {
  if (error instanceof MetricsAuthError) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
    return;
  }

  if (error instanceof MetricsValidationError) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    success: false,
    message: "Could not load backend metrics",
  });
}
