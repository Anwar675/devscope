import { Activity, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import type { OverviewRecommendation } from "./overview-data";

type AiRecommandProps = {
  recommendations: OverviewRecommendation[];
};

const priorityStyles: Record<
  OverviewRecommendation["priority"],
  {
    label: string;
    className: string;
  }
> = {
  immediate: {
    label: "Immediate",
    className: "bg-dev-danger/20 text-dev-danger",
  },
  "short-term": {
    label: "Short term",
    className: "bg-dev-orange/20 text-dev-orange",
  },
  "medium-term": {
    label: "Medium term",
    className: "bg-dev-yellow/20 text-dev-yellow",
  },
  "long-term": {
    label: "Long term",
    className: "bg-dev-accent/20 text-dev-accent",
  },
};

export const AiRecommand = ({ recommendations }: AiRecommandProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="p-6 bg-dev-surface/5 backdrop-blur-lg border border-dev-border rounded-2xl"
    >
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-6 h-6 text-dev-accent" />
        <h3 className="text-xl font-semibold text-dev-text">
          Architecture Recommendation
        </h3>
      </div>

      <div className="p-4 bg-linear-to-r from-dev-success/10 to-dev-emerald/10 border border-dev-success/20 rounded-xl">
        <h4 className="font-semibold text-dev-success mb-3 text-sm">
          Recommended changes
        </h4>
        <div className="space-y-3 text-sm text-dev-text-muted/80">
          {recommendations.length === 0 && (
            <div className="text-dev-text-muted">
              No AI recommendation is available yet.
            </div>
          )}
          {recommendations.map((recommendation, index) => {
            const priority = priorityStyles[recommendation.priority];

            return (
              <motion.div
                key={`${recommendation.issueId}-${recommendation.title}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="rounded-xl border border-dev-success/10 bg-dev-surface/5 p-3"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-dev-success" />
                    <strong className="text-dev-text">{recommendation.title}</strong>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${priority.className}`}>
                    {priority.label}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-dev-text-muted/75">
                  {recommendation.description}
                </p>
                <div className="mt-3 grid gap-2 text-xs text-dev-text-muted/70 sm:grid-cols-2">
                  <span>Impact: {recommendation.impact}</span>
                  <span>Effort: {recommendation.effort}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
