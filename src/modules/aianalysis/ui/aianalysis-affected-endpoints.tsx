import { motion } from "motion/react";
import { Server } from "lucide-react";
import type { DetectedIssue, IssueSeverity } from "./aianalysis-data";

interface AIAnalysisAffectedEndpointsProps {
  issue: DetectedIssue;
}

const getEndpointPanelClass = (severity: IssueSeverity) => {
  if (severity === "critical") {
    return "bg-dev-danger/10 border-dev-danger/30";
  }

  if (severity === "high") {
    return "bg-dev-orange/10 border-dev-orange/30";
  }

  return "bg-dev-yellow/10 border-dev-yellow/30";
};

const getEndpointBadgeClass = (severity: IssueSeverity) => {
  if (severity === "critical") {
    return "bg-dev-danger/20 text-dev-danger";
  }

  if (severity === "high") {
    return "bg-dev-orange/20 text-dev-orange";
  }

  return "bg-dev-yellow/20 text-dev-yellow";
};

export const AIAnalysisAffectedEndpoints = ({ issue }: AIAnalysisAffectedEndpointsProps) => {
  return (
    <div className="p-6 bg-dev-panel backdrop-blur-lg border border-dev-border rounded-2xl">
      <h3 className="text-xl font-semibold text-dev-text mb-6 flex items-center gap-2">
        <Server className="w-5 h-5 text-dev-orange" />
        Affected Endpoints
      </h3>
      <div className="space-y-3">
        {issue.affectedEndpoints.map((endpoint, idx) => (
          <motion.div
            key={endpoint.endpoint}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-4 rounded-xl border ${getEndpointPanelClass(endpoint.severity)}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-dev-text font-mono">{endpoint.endpoint}</span>
              <span className={`px-3 py-1 rounded-full text-xs ${getEndpointBadgeClass(endpoint.severity)}`}>
                {endpoint.severity}
              </span>
            </div>
            <p className="text-dev-text-muted/70 text-sm mt-2">{endpoint.impact}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
