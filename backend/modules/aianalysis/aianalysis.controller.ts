import type { Request, Response } from "express";

import { auth } from "../../../src/lib/auth";
import { getAIAnalysisReport } from "./aianalysis.service";

class AIAnalysisAuthError extends Error {
  constructor(message = "You must sign in to view AI analysis") {
    super(message);
    this.name = "AIAnalysisAuthError";
  }
}

export async function getAIAnalysis(req: Request, res: Response) {
  try {
    const userId = await getRequiredUserId(req);

    res.json({
      success: true,
      data: await getAIAnalysisReport(userId),
    });
  } catch (error) {
    handleAIAnalysisError(error, res);
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
    throw new AIAnalysisAuthError();
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

function handleAIAnalysisError(error: unknown, res: Response) {
  if (error instanceof AIAnalysisAuthError) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    success: false,
    message: "Could not load AI analysis",
  });
}
