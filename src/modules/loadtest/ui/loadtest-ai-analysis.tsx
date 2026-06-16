import { motion } from "motion/react";
import { Activity, Brain, CheckCircle2, Sparkles } from "lucide-react";
import type { LoadTestListItem } from "./table-loadtest";

type AiInsight = {
  type: "success" | "warning" | "recommendation";
  title: string;
  description: string;
};

type LoadTestSummaryWithAi = {
  avgLatency?: number;
  p95?: number;
  p99?: number;
  errors?: number;
  errorRate?: number;
  requests?: number;
  maxThroughput?: number;
  aiInsights?: AiInsight[];
  aiAnalysisStatus?: "generated" | "fallback" | "skipped";
};

interface LoadTestAiAnalysisProps {
  loadTest: LoadTestListItem;
}

export const LoadTestAiAnalysis = ({ loadTest }: LoadTestAiAnalysisProps) => {
  const summary = parseLoadTestSummary(loadTest.summary);
  const aiInsights = summary.aiInsights?.length
    ? summary.aiInsights
    : createEmptyInsights(loadTest);

  return (
    <div className="p-6 bg-linear-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="w-6 h-6 text-purple-400" />
        <h3 className="text-2xl font-semibold text-white">AI Analysis</h3>
        {summary.aiAnalysisStatus && (
          <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-blue-200/70">
            {summary.aiAnalysisStatus}
          </span>
        )}
      </div>
      <div className="space-y-4">
        {aiInsights.map((insight, idx) => (
          <motion.div
            key={insight.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-4 rounded-xl border ${
              insight.type === "success"
                ? "bg-green-500/10 border-green-500/30"
                : insight.type === "warning"
                  ? "bg-orange-500/10 border-orange-500/30"
                  : "bg-blue-500/10 border-blue-500/30"
            }`}
          >
            <div className="flex items-start gap-3">
              {insight.type === "success" && (
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              )}
              {insight.type === "warning" && (
                <Activity className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              )}
              {insight.type === "recommendation" && (
                <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="font-semibold text-white mb-1">{insight.title}</h4>
                <p className="text-sm text-blue-200/70">{insight.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

function parseLoadTestSummary(summary: unknown): LoadTestSummaryWithAi {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return {};
  }

  const value = summary as LoadTestSummaryWithAi;

  if (!Array.isArray(value.aiInsights)) {
    return value;
  }

  return {
    ...value,
    aiInsights: value.aiInsights.filter(isAiInsight),
  };
}

function isAiInsight(value: unknown): value is AiInsight {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const insight = value as AiInsight;

  return (
    ["success", "warning", "recommendation"].includes(insight.type) &&
    typeof insight.title === "string" &&
    typeof insight.description === "string"
  );
}

function createEmptyInsights(loadTest: LoadTestListItem): AiInsight[] {
  if (["queued", "running"].includes(loadTest.status)) {
    return [
      {
        type: "warning",
        title: "Run chưa hoàn tất",
        description:
          "AI analysis sẽ được tạo sau khi k6 kết thúc và backend có số liệu tổng hợp.",
      },
    ];
  }

  const summary = parseLoadTestSummary(loadTest.summary);
  const avgLatency = summary.avgLatency ?? parseFloat(loadTest.latency);
  const p95 = summary.p95 ?? avgLatency;
  const p99 = summary.p99 ?? p95;
  const errors = summary.errors ?? loadTest.errors;
  const errorRate = summary.errorRate ?? loadTest.errorRate / 100;
  const throughput = summary.maxThroughput ?? loadTest.requestsPerSecond;

  if (errors > 0 || errorRate > 0) {
    return [
      {
        type: "warning",
        title: "Run có lỗi cần xem lại",
        description: `${errors} lỗi, error rate ${formatPercent(
          errorRate,
        )}. Ưu tiên kiểm tra status code lỗi và endpoint đang chịu tải.`,
      },
    ];
  }

  if (Number.isFinite(p95) && Number.isFinite(avgLatency) && p95 > avgLatency * 2) {
    return [
      {
        type: "warning",
        title: "Tail latency cao hơn avg",
        description: `Avg ${formatLatency(avgLatency)}, p95 ${formatLatency(
          p95,
        )}, p99 ${formatLatency(
          p99,
        )}. Endpoint chạy bình nhưng có dấu hiệu spike ở nhóm request chậm.`,
      },
    ];
  }

  return [
    {
      type: "success",
      title: "Run ổn định theo summary",
      description:
        `Avg ${formatLatency(avgLatency)}, p95 ${formatLatency(
          p95,
        )}, throughput ${formatNumber(
          throughput,
        )} req/s. Không thấy lỗi đáng kể trong summary hiện có.`,
    },
  ];
}

function formatLatency(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: value < 1 ? 3 : value < 100 ? 2 : 1,
  })}ms`;
}

function formatPercent(value: number) {
  return `${(value * 100).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}%`;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: value < 100 ? 2 : 0,
  });
}
