import { motion } from "motion/react";
import { Server } from "lucide-react";
import type { DetectedIssue, IssueSeverity } from "./aianalysis-data";

interface AIAnalysisAffectedEndpointsProps {
  issue: DetectedIssue;
}

const getEndpointPanelClass = (severity: IssueSeverity) => {
  if (severity === "critical") {
    return "bg-red-500/10 border-red-500/30";
  }

  if (severity === "high") {
    return "bg-orange-500/10 border-orange-500/30";
  }

  return "bg-yellow-500/10 border-yellow-500/30";
};

const getEndpointBadgeClass = (severity: IssueSeverity) => {
  if (severity === "critical") {
    return "bg-red-500/20 text-red-300";
  }

  if (severity === "high") {
    return "bg-orange-500/20 text-orange-300";
  }

  return "bg-yellow-500/20 text-yellow-300";
};

export const AIAnalysisAffectedEndpoints = ({ issue }: AIAnalysisAffectedEndpointsProps) => {
  return (
    <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <Server className="w-5 h-5 text-orange-400" />
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
              <span className="text-white font-mono">{endpoint.endpoint}</span>
              <span className={`px-3 py-1 rounded-full text-xs ${getEndpointBadgeClass(endpoint.severity)}`}>
                {endpoint.severity}
              </span>
            </div>
            <p className="text-blue-200/70 text-sm mt-2">{endpoint.impact}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
