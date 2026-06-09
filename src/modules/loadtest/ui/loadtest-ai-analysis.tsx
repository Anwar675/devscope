import { motion } from "motion/react";
import { Activity, Brain, CheckCircle2, Sparkles } from "lucide-react";

const aiInsights = [
  {
    type: "success",
    title: "System handled 100 users smoothly",
    description: "No significant degradation in performance. CPU usage stayed below 70%.",
  },
  {
    type: "warning",
    title: "Database connections increasing",
    description: "Connection pool reached 85% capacity at peak load. Consider increasing pool size.",
  },
  {
    type: "recommendation",
    title: "Add caching layer",
    description: "40% of queries are repeated reads. Redis cache could reduce DB load by 35%.",
  },
];

export const LoadTestAiAnalysis = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="w-6 h-6 text-purple-400" />
        <h3 className="text-2xl font-semibold text-white">AI Analysis</h3>
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
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              )}
              {insight.type === "warning" && (
                <Activity className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              )}
              {insight.type === "recommendation" && (
                <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
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
