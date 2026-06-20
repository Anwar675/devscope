import { Activity, AlertTriangle, Brain, Gauge, Lightbulb } from "lucide-react";
import { motion } from "motion/react";
import type { OverviewDashboardData, OverviewIssue } from "./overview-data";

type AiAnalishProps = {
  analysis: OverviewDashboardData["aiAnalysis"];
};

const severityStyles: Record<
  OverviewIssue["severity"],
  {
    label: string;
    bg: string;
    text: string;
    bar: string;
    icon: typeof Activity;
  }
> = {
  critical: {
    label: "Critical",
    bg: "bg-dev-danger/20",
    text: "text-dev-danger",
    bar: "bg-dev-danger",
    icon: AlertTriangle,
  },
  high: {
    label: "High",
    bg: "bg-dev-orange/20",
    text: "text-dev-orange",
    bar: "bg-dev-orange",
    icon: Gauge,
  },
  medium: {
    label: "Medium",
    bg: "bg-dev-yellow/20",
    text: "text-dev-yellow",
    bar: "bg-dev-yellow",
    icon: Activity,
  },
};

export const AiAnalish = ({ analysis }: AiAnalishProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="p-6 bg-dev-surface/5 backdrop-blur-lg border border-dev-border rounded-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-dev-purple" />
                <h3 className="text-xl font-semibold text-dev-text">AI Bottleneck Analysis</h3>
              </div>
              <span className="px-3 py-1 bg-dev-purple/20 text-dev-purple text-sm rounded-full">
                {analysis.issuesFound} found
              </span>
            </div>

            <div className="mb-6 p-4 bg-linear-to-r from-dev-purple/20 to-dev-accent/20 border-l-4 border-dev-purple rounded-r-xl">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-dev-purple" />
                <h4 className="font-semibold text-dev-purple text-sm">Root cause identified</h4>
              </div>
              <p className="text-sm text-dev-text-soft leading-relaxed">
                {analysis.rootCause}
              </p>
            </div>

            <div className="space-y-4">
              {analysis.issues.length === 0 && (
                <div className="rounded-xl border border-dev-border bg-dev-surface/5 p-4 text-sm text-dev-text-muted">
                  No AI bottleneck issue is available yet.
                </div>
              )}
              {analysis.issues.map((bottleneck, idx) => {
                const styles = severityStyles[bottleneck.severity];
                const IssueIcon = styles.icon;

                return (
                <motion.div
                  key={bottleneck.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + idx * 0.1 }}
                  className="flex gap-4 p-4 bg-dev-surface/5 rounded-xl border border-dev-border"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${styles.bg}`}>
                    <IssueIcon className={`w-6 h-6 ${styles.text}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-dev-text text-sm">{bottleneck.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${styles.bg} ${styles.text}`}>
                        {styles.label}
                      </span>
                    </div>
                    <p className="text-xs text-dev-text-muted/70 mb-3 leading-relaxed">{bottleneck.impact}</p>
                    <div className="w-full h-1 bg-dev-surface/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${bottleneck.progress}%` }}
                        transition={{ delay: 1 + idx * 0.1, duration: 0.8 }}
                        className={`h-full ${styles.bar}`}
                      />
                    </div>
                  </div>
                </motion.div>
                );
              })}
            </div>
          </motion.div>
    )
}
