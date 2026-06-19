import { motion } from "motion/react";
import { Clock } from "lucide-react";
import type { DetectedIssue } from "./aianalysis-data";

interface AIAnalysisEventTimelineProps {
  issue: DetectedIssue;
}

export const AIAnalysisEventTimeline = ({ issue }: AIAnalysisEventTimelineProps) => {
  return (
    <div className="p-6 bg-dev-panel backdrop-blur-lg border border-dev-border rounded-2xl">
      <h3 className="text-xl font-semibold text-dev-text mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-dev-accent" />
        Event Timeline (How the Issue Unfolded)
      </h3>
      <div className="space-y-4">
        {issue.timeline.map((event, idx) => (
          <motion.div
            key={`${event.time}-${event.event}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex gap-4"
          >
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full ${
                  idx === issue.timeline.length - 1 ? "bg-dev-danger" : idx === 0 ? "bg-dev-yellow" : "bg-dev-orange"
                }`}
              />
              {idx < issue.timeline.length - 1 && (
                <div className="w-0.5 h-full bg-linear-to-b from-dev-orange to-dev-danger mt-1" />
              )}
            </div>
            <div className="flex-1 pb-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-dev-accent-muted font-mono text-sm">{event.time}</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    event.change.startsWith("+") ? "bg-dev-danger/20 text-dev-danger" : "bg-dev-success/20 text-dev-success"
                  }`}
                >
                  {event.change}
                </span>
              </div>
              <p className="text-dev-text font-medium">{event.event}</p>
              <p className="text-dev-text-muted/70 text-sm mt-1">Metric: {event.metric}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
