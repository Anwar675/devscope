import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Info, Lightbulb, Zap } from "lucide-react";
import type { DetectedIssue, RecommendationPriority } from "./aianalysis-data";

interface AIAnalysisRecommendationsProps {
  issue: DetectedIssue;
}

const getPriorityClass = (priority: RecommendationPriority) => {
  if (priority === "immediate") {
    return "bg-red-500/20 text-red-300";
  }

  if (priority === "short-term") {
    return "bg-orange-500/20 text-orange-300";
  }

  if (priority === "medium-term") {
    return "bg-yellow-500/20 text-yellow-300";
  }

  return "bg-blue-500/20 text-blue-300";
};

export const AIAnalysisRecommendations = ({ issue }: AIAnalysisRecommendationsProps) => {
  return (
    <div className="p-6 bg-linear-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="w-6 h-6 text-green-400" />
        <h3 className="text-xl font-semibold text-white">AI Recommendations (For Reference Only)</h3>
      </div>

      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-2">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-blue-200 text-sm">
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
            className="p-5 bg-white/5 rounded-xl border border-white/10"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityClass(rec.priority)}`}>
                    {rec.priority}
                  </span>
                  <span className="text-blue-200/70 text-sm">{rec.effort}</span>
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">{rec.title}</h4>
                <p className="text-blue-200/80 mb-3">{rec.description}</p>

                {rec.command && (
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-white/10 mb-3">
                    <code className="text-green-400 text-sm font-mono">{rec.command}</code>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-300">{rec.impact}</span>
                </div>

                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-blue-200">Trade-offs:</h5>
                  {rec.tradeoffs.map((tradeoff) => (
                    <div key={tradeoff.text} className="flex items-start gap-2">
                      {tradeoff.type === "pro" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                      )}
                      <span className="text-sm text-blue-200/70">{tradeoff.text}</span>
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
