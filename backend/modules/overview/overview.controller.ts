import type { Request, Response } from "express";
import { auth } from "../../../src/lib/auth";
import { MetricsValidationError } from "../metrics/metrics.service";
import { getOverviewDashboard } from "./overview.service";

class OverviewAuthError extends Error {
  constructor(message = "You must sign in to view overview") {
    super(message);
    this.name = "OverviewAuthError";
  }
}

export async function getOverview(req: Request, res: Response) {
  try {
    const userId = await getRequiredUserId(req);

    res.json({
      success: true,
      data: await getOverviewDashboard(userId, getQueryString(req.query.range)),
    });
  } catch (error) {
    handleOverviewError(error, res);
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
    throw new OverviewAuthError();
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

function handleOverviewError(error: unknown, res: Response) {
  if (error instanceof OverviewAuthError) {
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
    message: "Could not load overview dashboard",
  });
}
