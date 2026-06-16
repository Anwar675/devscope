"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, GitBranch, ServerCog } from "lucide-react";
import type { LoadTestListItem } from "./table-loadtest";

type LoadTestSummary = {
  avgLatency?: number;
  p95?: number;
  p99?: number;
  requests?: number;
  errors?: number;
  errorRate?: number;
  duration?: number;
  maxThroughput?: number;
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

interface LoadTestArchitectureProps {
  loadTest?: LoadTestListItem;
}

export const LoadTestArchitecture = ({ loadTest }: LoadTestArchitectureProps) => {
  const summary = useMemo(() => parseLoadTestSummary(loadTest), [loadTest]);
  const fallbackRecommendation = useMemo(           
    () => createFallbackRecommendation(loadTest, summary),
    [loadTest, summary],
  );
  const [openAiRecommendation, setOpenAiRecommendation] = useState<{
    runId: string;
    recommendation: ArchitectureRecommendation;
  } | null>(null);
  const [source, setSource] = useState<"openai" | "fallback">("fallback");
  const matchingOpenAiRecommendation =
    openAiRecommendation && openAiRecommendation.runId === loadTest?.id
      ? openAiRecommendation.recommendation
      : null;
  const recommendation = matchingOpenAiRecommendation ?? fallbackRecommendation;
  

  useEffect(() => {
    if (!loadTest || ["queued", "running"].includes(loadTest.status)) {
      return;
    }

    const currentLoadTest = loadTest;
    let isMounted = true;

    async function loadRecommendation() {
      try {
        const response = await fetch(
          "/api/loadtest/architecture-recommendation",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: currentLoadTest.id,
              url: currentLoadTest.url,
              method: currentLoadTest.method,
              users: currentLoadTest.users,
              status: currentLoadTest.status,
              summary,
              infrastructure: summary.infrastructure,
            }),
            cache: "no-store",
          },
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message ?? "Could not load recommendation");
        }

        if (isMounted && isArchitectureRecommendation(result.data)) {
          setOpenAiRecommendation({
            runId: currentLoadTest.id,
            recommendation: result.data,
          });
          setSource("openai");
        }
      } catch {
        if (isMounted) {
          setOpenAiRecommendation(null);
          setSource("fallback");
        }
      }
    }

    void loadRecommendation();

    return () => {
      isMounted = false;
    };
  }, [loadTest, summary]);

  return (
    <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
      <div className="mb-6 flex items-center gap-2">
        <Brain className="h-6 w-6 text-purple-300" />
        <h3 className="text-2xl font-semibold text-white">
          Architecture Recommendation
        </h3>
        <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-blue-200/70">
          {source === "openai" ? "OpenAI" : "Fallback"}
        </span>
      </div>

      {!loadTest && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-blue-200/70">
          Select a completed load test to generate architecture recommendations.
        </div>
      )}

      {loadTest && (
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-lg font-medium text-blue-300 mb-4">
              Current Signals
            </h4>
            <div className="space-y-3">
              {recommendation.currentSignals.map((signal, index) => (
                <div
                  key={signal}
                  style={{ marginLeft: `${index * 12}px` }}
                  className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg"
                >
                  <div className="flex items-start gap-2 text-sm text-white">
                    <GitBranch className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-300" />
                    <span>{signal}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-purple-400/20 bg-purple-500/10 p-4">
              <div className="text-sm font-semibold text-purple-200">
                {recommendation.confidence}
              </div>
              <p className="mt-2 text-sm text-blue-100/75">
                {recommendation.summary}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium text-green-300 mb-4">
              Recommended Direction
            </h4>
            <div className="space-y-3">
              {recommendation.recommended.map((item, index) => (
                <div
                  key={`${item.component}-${index}`}
                  style={{ marginLeft: `${index * 12}px` }}
                  className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
                >
                  <div className="flex items-start gap-2">
                    <ServerCog className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-300" />
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {item.component}
                      </div>
                      <div className="mt-1 text-xs text-blue-100/70">
                        {item.reason}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 text-sm font-semibold text-white">
                Next validation steps
              </div>
              <div className="space-y-2 text-sm text-blue-100/70">
                {recommendation.actions.map((action) => (
                  <div key={action}>+ {action}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function parseLoadTestSummary(loadTest: LoadTestListItem | undefined) {
  const summary = isRecord(loadTest?.summary) ? loadTest.summary : {};
  const avgLatency =
    getNumber(summary.avgLatency) ?? parseLatency(loadTest?.latency);
  const duration = getNumber(summary.duration) ?? loadTest?.duration ?? 0;
  const requests = getNumber(summary.requests) ?? 0;

  return {
    avgLatency,
    p95: getNumber(summary.p95) ?? avgLatency,
    p99: getNumber(summary.p99) ?? getNumber(summary.p95) ?? avgLatency,
    requests,
    errors: getNumber(summary.errors) ?? loadTest?.errors ?? 0,
    errorRate: getNumber(summary.errorRate) ?? (loadTest?.errorRate ?? 0) / 100,
    duration,
    maxThroughput:
      getNumber(summary.maxThroughput) ??
      loadTest?.requestsPerSecond ??
      (duration > 0 ? requests / duration : 0),
    infrastructure: normalizeInfrastructureSignals(summary.infrastructure),
  };
}

function createFallbackRecommendation(
  loadTest: LoadTestListItem | undefined,
  summary: LoadTestSummary,
): ArchitectureRecommendation {
  if (!loadTest) {
    return {
      confidence: "No run selected",
      summary: "Select a load test result first.",
      currentSignals: [],
      recommended: [],
      actions: [],
    };
  }

  if ((summary.avgLatency ?? 0) <= 200 && (summary.errors ?? 0) === 0) {
    return {
      confidence: "Fallback: low risk",
      summary:
        "Avg latency thấp, chưa có tín hiệu mạnh để đổi kiến trúc. Ưu tiên quan sát thêm khi tăng users hoặc duration.",
      currentSignals: createCurrentSignals(loadTest, summary),
      recommended: [
        {
          component: "Current architecture",
          reason: "Giữ nguyên vì avg latency đang ổn trong run này.",
        },
        {
          component: "Tracing / metrics",
          reason: "Thêm quan sát để xác nhận p95/p99 trước khi thêm hạ tầng.",
        },
      ],
      actions: [
        "Tăng tải từng bước và so sánh avg latency.",
        "Chỉ thử cache/replica nếu avg hoặc p95 bắt đầu tăng rõ.",
      ],
    };
  }

  return {
    confidence: "Fallback: hypothesis",
    summary:
      "Avg latency là tín hiệu chính cho thấy nên kiểm tra đường request chậm trước khi đề xuất cache, replica hoặc scale backend.",
    currentSignals: createCurrentSignals(loadTest, summary),
    recommended: [
      {
        component: "Endpoint tracing",
        reason: "Xác định thời gian nằm ở app, network hay downstream.",
      },
      {
        component: "Targeted cache test",
        reason: "Chỉ phù hợp nếu request chậm là read lặp lại.",
      },
      {
        component: "Backend scale experiment",
        reason: "Chỉ thử khi CPU/event-loop tăng cùng avg latency.",
      },
    ],
    actions: [
      "So sánh avg với p95/p99 để biết chậm đều hay tail spike.",
      "Đo lại sau từng thay đổi nhỏ bằng cùng cấu hình load test.",
    ],
  };
}

function createCurrentSignals(
  loadTest: LoadTestListItem,
  summary: LoadTestSummary,
) {
  return [
    `${loadTest.method} ${loadTest.url}`,
    `Avg latency ${formatLatency(summary.avgLatency)}`,
    `P95 ${formatLatency(summary.p95)} / P99 ${formatLatency(summary.p99)}`,
    `${summary.errors ?? 0} errors, ${formatNumber(
      summary.maxThroughput ?? 0,
    )} req/s`,
    ...formatInfrastructureSignals(summary.infrastructure),
  ];
}

function isArchitectureRecommendation(
  value: unknown,
): value is ArchitectureRecommendation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.confidence === "string" &&
    typeof value.summary === "string" &&
    Array.isArray(value.currentSignals) &&
    Array.isArray(value.recommended) &&
    Array.isArray(value.actions)
  );
}

function parseLatency(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function formatLatency(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: value < 1 ? 3 : value < 100 ? 2 : 1,
  })}ms`;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: value < 100 ? 2 : 0,
  });
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

  return value;
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
  ].filter(Boolean);
}

function formatInfrastructureSignal(
  label: string,
  signal: Record<string, unknown> | undefined,
) {
  if (!signal) {
    return "";
  }

  const status = typeof signal.status === "string" ? signal.status : "unknown";
  const source = typeof signal.source === "string" ? signal.source : "";
  const sampledValue =
    getNumber(signal.usagePercent) ??
    getNumber(signal.usedPercent) ??
    getNumber(signal.rssMb);
  const count = getNumber(signal.count);

  return `${label}: ${status}${sampledValue ? ` (${sampledValue})` : ""}${
    count !== undefined ? ` count=${count}` : ""
  }${
    source ? ` from ${source}` : ""
  }`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
