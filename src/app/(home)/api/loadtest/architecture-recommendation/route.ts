import { auth } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { db } from "../../../../../../backend/db";
import { loadTestRun } from "../../../../../../backend/db/schema";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

type LoadTestArchitectureInput = {
  id?: string;
  url?: string;
  method?: string;
  users?: number;
  status?: string;
  summary?: {
    avgLatency?: number;
    p95?: number;
    p99?: number;
    requests?: number;
    errors?: number;
    errorRate?: number;
    duration?: number;
    maxThroughput?: number;
  };
  infrastructure?: InfrastructureSignals;
};

type InfrastructureSignals = {
  cpu?: Record<string, unknown>;
  ram?: Record<string, unknown>;
  pods?: Record<string, unknown>;
  containers?: Record<string, unknown>;
};

type ArchitectureRecommendation = {
  confidence: string;
  summary: string;
  currentSignals: string[];
  recommended: {
    component: string;
    reason: string;
  }[];
  actions: string[];
};

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
    query: {
      disableCookieCache: true,
    },
  });

  if (!session?.user.id) {
    return Response.json(
      {
        success: false,
        message: "You must sign in to generate architecture recommendations",
      },
      {
        status: 401,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }

  let input: LoadTestArchitectureInput;

  try {
    input = normalizeInput(await request.json());
  } catch {
    return Response.json(
      {
        success: false,
        message: "Invalid recommendation payload",
      },
      {
        status: 400,
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }

  const recommendation = await generateArchitectureRecommendation(input);
  await persistArchitectureRecommendationLog(session.user.id, input, recommendation);

  return Response.json(
    {
      success: true,
      data: recommendation,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

async function generateArchitectureRecommendation(input: LoadTestArchitectureInput) {
  const key = process.env.OPENAI_API_KEY ?? process.env.OPENAI_KEY;

  if (!key) {
    return createFallbackRecommendation(input);
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
              "You are a senior performance architecture advisor. Recommend architecture as a hypothesis based mainly on avg latency. Use p95, p99, errors, throughput, users, duration, CPU, RAM, Kubernetes pod metrics, and container metrics as supporting signals. If an infrastructure signal is marked not_collected or unknown, explicitly treat it as missing evidence and do not infer a proven bottleneck from it. Do not claim any unmeasured service or architecture layer is a proven bottleneck. Return concise Vietnamese recommendations.",
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "loadtest_architecture_recommendation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                confidence: { type: "string" },
                summary: { type: "string" },
                currentSignals: {
                  type: "array",
                  minItems: 2,
                  maxItems: 4,
                  items: { type: "string" },
                },
                recommended: {
                  type: "array",
                  minItems: 2,
                  maxItems: 4,
                  items: {
                    type: "object",
                    properties: {
                      component: { type: "string" },
                      reason: { type: "string" },
                    },
                    required: ["component", "reason"],
                    additionalProperties: false,
                  },
                },
                actions: {
                  type: "array",
                  minItems: 2,
                  maxItems: 3,
                  items: { type: "string" },
                },
              },
              required: [
                "confidence",
                "summary",
                "currentSignals",
                "recommended",
                "actions",
              ],
              additionalProperties: false,
            },
          },
        },
        max_output_tokens: 750,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI returned ${response.status}`);
    }

    const parsed = parseOpenAiRecommendation(await response.json());

    return parsed ?? createFallbackRecommendation(input);
  } catch (error) {
    console.warn("[loadtest:architecture-recommendation] openai failed", error);

    return createFallbackRecommendation(input);
  }
}

async function persistArchitectureRecommendationLog(
  userId: string,
  input: LoadTestArchitectureInput,
  recommendation: ArchitectureRecommendation,
) {
  if (!input.id) {
    return;
  }

  const [record] = await db
    .select({ summary: loadTestRun.summary })
    .from(loadTestRun)
    .where(and(eq(loadTestRun.userId, userId), eq(loadTestRun.id, input.id)))
    .limit(1);

  if (!record) {
    return;
  }

  await db
    .update(loadTestRun)
    .set({
      summary: {
        ...(isRecord(record.summary) ? record.summary : {}),
        infrastructure: input.infrastructure,
        architectureRecommendation: recommendation,
        architectureRecommendationLog: {
          generatedAt: new Date().toISOString(),
          input: {
            id: input.id,
            url: input.url,
            method: input.method,
            users: input.users,
            status: input.status,
            summary: input.summary,
            infrastructure: input.infrastructure,
          },
          output: recommendation,
        },
      },
    })
    .where(and(eq(loadTestRun.userId, userId), eq(loadTestRun.id, input.id)));
}

function parseOpenAiRecommendation(data: unknown) {
  const outputText = extractOpenAiOutputText(data);

  if (!outputText) {
    return null;
  }

  try {
    const parsed = JSON.parse(outputText) as Partial<ArchitectureRecommendation>;

    if (
      typeof parsed.confidence !== "string" ||
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.currentSignals) ||
      !Array.isArray(parsed.recommended) ||
      !Array.isArray(parsed.actions)
    ) {
      return null;
    }

    const recommended = parsed.recommended.filter(
      (item): item is ArchitectureRecommendation["recommended"][number] =>
        isRecord(item) &&
        typeof item.component === "string" &&
        typeof item.reason === "string",
    );

    if (recommended.length === 0) {
      return null;
    }

    return {
      confidence: parsed.confidence,
      summary: parsed.summary,
      currentSignals: parsed.currentSignals.filter(isString).slice(0, 4),
      recommended: recommended.slice(0, 4),
      actions: parsed.actions.filter(isString).slice(0, 3),
    };
  } catch {
    return null;
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

function createFallbackRecommendation(
  input: LoadTestArchitectureInput,
): ArchitectureRecommendation {
  const avgLatency = input.summary?.avgLatency ?? 0;
  const p95 = input.summary?.p95 ?? avgLatency;
  const errors = input.summary?.errors ?? 0;
  const throughput = input.summary?.maxThroughput ?? 0;
  const infrastructureSignals = formatInfrastructureSignals(input.infrastructure);

  if (avgLatency <= 200 && errors === 0) {
    return {
      confidence: "fallback: low risk",
      summary:
        "Avg latency đang thấp, kiến trúc hiện tại có vẻ đủ cho run này. Chưa nên thêm hạ tầng nếu chưa có tín hiệu tăng tải rõ hơn.",
      currentSignals: [
        `Avg latency ${formatLatency(avgLatency)}`,
        `P95 latency ${formatLatency(p95)}`,
        `${errors} errors`,
        ...infrastructureSignals.slice(0, 2),
      ],
      recommended: [
        {
          component: "Keep current path",
          reason: "Avg latency thấp, chưa có bằng chứng cần scale kiến trúc.",
        },
        {
          component: "Tracing / metrics",
          reason: "Dùng để xác nhận tail latency trước khi thêm cache hoặc replica.",
        },
      ],
      actions: [
        "Theo dõi avg latency khi tăng users hoặc duration.",
        "Chỉ thử cache/replica nếu p95 hoặc error tăng trong run tiếp theo.",
      ],
    };
  }

  return {
    confidence: "fallback: hypothesis",
    summary:
      "Avg latency là tín hiệu chính cho thấy cần kiểm tra đường request chậm trước khi quyết định thay đổi kiến trúc.",
    currentSignals: [
      `Avg latency ${formatLatency(avgLatency)}`,
      `P95 latency ${formatLatency(p95)}`,
      `${errors} errors`,
      `${throughput} req/s`,
      ...infrastructureSignals,
    ],
    recommended: [
      {
        component: "Endpoint tracing",
        reason: "Tách thời gian app, network và downstream trước khi đổi kiến trúc.",
      },
      {
        component: "Targeted cache experiment",
        reason: "Chỉ thử nếu avg cao đến từ read lặp lại hoặc endpoint có dữ liệu ít đổi.",
      },
      {
        component: "Backend scale test",
        reason: "Chỉ có ý nghĩa nếu CPU/event-loop tăng cùng avg latency.",
      },
    ],
    actions: [
      "Chạy lại test với trace để biết avg latency nằm ở app hay downstream.",
      "So sánh avg với p95/p99 để phân biệt chậm đều hay spike tail.",
      "Đo lại sau từng thay đổi nhỏ thay vì đổi nhiều lớp kiến trúc cùng lúc.",
    ],
  };
}

function normalizeInput(value: unknown): LoadTestArchitectureInput {
  if (!isRecord(value)) {
    return {};
  }

  const summary = isRecord(value.summary) ? value.summary : {};

  return {
    id: getString(value.id),
    url: getString(value.url),
    method: getString(value.method),
    users: getNumber(value.users),
    status: getString(value.status),
    summary: {
      avgLatency: getNumber(summary.avgLatency),
      p95: getNumber(summary.p95),
      p99: getNumber(summary.p99),
      requests: getNumber(summary.requests),
      errors: getNumber(summary.errors),
      errorRate: getNumber(summary.errorRate),
      duration: getNumber(summary.duration),
      maxThroughput: getNumber(summary.maxThroughput),
    },
    infrastructure: normalizeInfrastructureSignals(value.infrastructure),
  };
}

function normalizeInfrastructureSignals(value: unknown): InfrastructureSignals {
  const infrastructure = isRecord(value) ? value : {};

  return {
    cpu: normalizeSignal(infrastructure.cpu),
    ram: normalizeSignal(infrastructure.ram),
    pods: normalizeSignal(infrastructure.pods),
    containers: normalizeSignal(infrastructure.containers),
  };
}

function normalizeSignal(value: unknown) {
  if (!isRecord(value)) {
    return {
      status: "unknown",
      source: "not_provided",
    };
  }

  const sanitized = Object.fromEntries(
    Object.entries(value).filter(([, item]) =>
      ["string", "number", "boolean"].includes(typeof item),
    ),
  );

  if (Array.isArray(value.items)) {
    return {
      ...sanitized,
      items: value.items
        .filter(isRecord)
        .slice(0, 25)
        .map((item) =>
          Object.fromEntries(
            Object.entries(item).filter(([, childValue]) =>
              ["string", "number", "boolean"].includes(typeof childValue),
            ),
          ),
        ),
    };
  }

  return sanitized;
}

function formatInfrastructureSignals(
  infrastructure: InfrastructureSignals | undefined,
) {
  if (!infrastructure) {
    return [];
  }

  return [
    formatInfrastructureSignal("CPU", infrastructure.cpu),
    formatInfrastructureSignal("RAM", infrastructure.ram),
    formatInfrastructureSignal("Pods", infrastructure.pods),
    formatInfrastructureSignal("Containers", infrastructure.containers),
  ].filter(isString);
}

function formatInfrastructureSignal(
  label: string,
  signal: Record<string, unknown> | undefined,
) {
  if (!signal) {
    return "";
  }

  const status = getString(signal.status) ?? "unknown";
  const source = getString(signal.source);
  const usage =
    getNumber(signal.usagePercent) ??
    getNumber(signal.usedPercent) ??
    getNumber(signal.rssMb);
  const count = getNumber(signal.count);

  return `${label}: ${status}${usage ? ` (${usage})` : ""}${
    count !== undefined ? ` count=${count}` : ""
  }${
    source ? ` from ${source}` : ""
  }`;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function formatLatency(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: value < 1 ? 3 : value < 100 ? 2 : 1,
  })}ms`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
