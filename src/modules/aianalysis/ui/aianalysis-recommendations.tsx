import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Info, Lightbulb, Zap } from "lucide-react";
import type { DetectedIssue, RecommendationPriority } from "./aianalysis-data";

interface AIAnalysisRecommendationsProps {
  issue: DetectedIssue;
}

const getPriorityClass = (priority: RecommendationPriority) => {
  if (priority === "immediate") {
    return "bg-dev-danger/20 text-dev-danger";
  }

  if (priority === "short-term") {
    return "bg-dev-orange/20 text-dev-orange";
  }

  if (priority === "medium-term") {
    return "bg-dev-yellow/20 text-dev-yellow";
  }

  return "bg-dev-accent/20 text-dev-accent-muted";
};

export const AIAnalysisRecommendations = ({ issue }: AIAnalysisRecommendationsProps) => {
  return (
    <div className="p-6 bg-linear-to-br from-dev-success/10 to-dev-emerald/10 border border-dev-success/20 rounded-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="w-6 h-6 text-dev-success" />
        <h3 className="text-xl font-semibold text-dev-text">AI Recommendations (For Reference Only)</h3>
      </div>

      <div className="mb-4 p-3 bg-dev-info-soft border border-dev-accent/20 rounded-lg flex items-start gap-2">
        <Info className="w-5 h-5 text-dev-accent shrink-0 mt-0.5" />
        <p className="text-dev-text-muted text-sm">
          These are AI-generated suggestions based on detected patterns. Always test in a staging environment and
          consult with your team before implementing in production.
        </p>
      </div>

      <div className="space-y-6">
        {issue.recommendations.map((rec, idx) => (
          <motion.div
            key={rec.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-5 bg-dev-panel rounded-xl border border-dev-border"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityClass(rec.priority)}`}>
                    {rec.priority}
                  </span>
                  <span className="text-dev-text-muted/70 text-sm">{rec.effort}</span>
                </div>
                <h4 className="text-lg font-semibold text-dev-text mb-2">{rec.title}</h4>
                <p className="text-dev-text-muted/80 mb-3">{rec.description}</p>

                {rec.command && (
                  <div className="p-3 bg-dev-code rounded-lg border border-dev-border mb-3">
                    <code className="text-dev-success text-sm font-mono">{rec.command}</code>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-dev-yellow" />
                  <span className="text-sm font-medium text-dev-yellow">{rec.impact}</span>
                </div>

                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-dev-text-muted">Trade-offs:</h5>
                  {rec.tradeoffs.map((tradeoff) => (
                    <div key={tradeoff.text} className="flex items-start gap-2">
                      {tradeoff.type === "pro" ? (
                        <CheckCircle2 className="w-4 h-4 text-dev-success shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-dev-orange shrink-0 mt-0.5" />
                      )}
                      <span className="text-sm text-dev-text-muted/70">{tradeoff.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
