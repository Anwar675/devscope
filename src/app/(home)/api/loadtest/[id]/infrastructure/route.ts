import { auth } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { db } from "../../../../../../../backend/db";
import { loadTestRun } from "../../../../../../../backend/db/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = getBearerToken(request);
  const expectedToken = process.env.LOADTEST_AGENT_TOKEN;
  const isAgentAuthorized =
    Boolean(expectedToken) && token && token === expectedToken;

  let userId: string | undefined;

  if (!isAgentAuthorized) {
    const session = await auth.api.getSession({
      headers: request.headers,
      query: {
        disableCookieCache: true,
      },
    });

    userId = session?.user.id;

    if (!userId) {
      return Response.json(
        {
          success: false,
          message: "Unauthorized infrastructure metrics request",
        },
        {
          status: 401,
          headers: {
            "cache-control": "no-store",
          },
        },
      );
    }
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        success: false,
        message: "Invalid infrastructure metrics payload",
      },
      {
        status: 400,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }

  const infrastructure = normalizeInfrastructurePayload(body);
  const whereClause = userId
    ? and(eq(loadTestRun.userId, userId), eq(loadTestRun.id, id))
    : eq(loadTestRun.id, id);
  const [record] = await db
    .select({ summary: loadTestRun.summary })
    .from(loadTestRun)
    .where(whereClause)
    .limit(1);

  if (!record) {
    return Response.json(
      {
        success: false,
        message: "Load test not found",
      },
      {
        status: 404,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }

  await db
    .update(loadTestRun)
    .set({
      summary: {
        ...(isRecord(record.summary) ? record.summary : {}),
        infrastructure,
        infrastructureLog: {
          receivedAt: new Date().toISOString(),
          source: "devscope-infra-agent",
          infrastructure,
        },
      },
    })
    .where(whereClause);

  return Response.json(
    {
      success: true,
      data: {
        id,
        infrastructure,
      },
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

function normalizeInfrastructurePayload(body: unknown) {
  const payload = isRecord(body) ? body : {};
  const infrastructure = isRecord(payload.infrastructure)
    ? payload.infrastructure
    : payload;

  return {
    cpu: normalizeSignal(infrastructure.cpu),
    ram: normalizeSignal(infrastructure.ram),
    pods: normalizeSignal(infrastructure.pods),
    containers: normalizeSignal(infrastructure.containers),
    collectedAt: getString(infrastructure.collectedAt),
    agent: normalizeSignal(infrastructure.agent),
  };
}

function normalizeSignal(value: unknown) {
  if (!isRecord(value)) {
    return {
      status: "unknown",
      source: "not_provided",
    };
  }

  return value;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
