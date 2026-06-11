import { motion } from "motion/react";
import { Activity } from "lucide-react";
import { systemHealth } from "./aianalysis-data";

const getHealthPanelClass = (status: string) => {
  if (status === "critical") {
    return "bg-dev-danger/10 border-dev-danger/30";
  }

  if (status === "degraded") {
    return "bg-dev-orange/10 border-dev-orange/30";
  }

  if (status === "missing") {
    return "bg-dev-yellow/10 border-dev-yellow/30";
  }

  return "bg-dev-success/10 border-dev-success/30";
};

const getHealthBadgeClass = (status: string) => {
  if (status === "critical") {
    return "bg-dev-danger/20 text-dev-danger";
  }

  if (status === "degraded") {
    return "bg-dev-orange/20 text-dev-orange";
  }

  if (status === "missing") {
    return "bg-dev-yellow/20 text-dev-yellow";
  }

  return "bg-dev-success/20 text-dev-success";
};

export const AIAnalysisHealth = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-8 p-6 bg-dev-panel backdrop-blur-lg border border-dev-border rounded-2xl"
    >
      <h3 className="text-xl font-semibold text-dev-text mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5 text-dev-accent" />
        System Component Health
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemHealth.map((component, idx) => (
          <motion.div
            key={component.component}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + idx * 0.05 }}
            className={`p-4 rounded-xl border ${getHealthPanelClass(component.status)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-dev-text font-medium text-sm">{component.component}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${getHealthBadgeClass(component.status)}`}>
                {component.status}
              </span>
            </div>
            {component.status !== "missing" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-dev-text-muted/70">
                  <span>CPU</span>
                  <span className={component.cpu > 80 ? "text-dev-danger" : "text-dev-text-muted"}>{component.cpu}%</span>
                </div>
                <div className="w-full h-1.5 bg-dev-overlay rounded-full overflow-hidden">
                  <div
                    className={`h-full ${component.cpu > 80 ? "bg-dev-danger" : "bg-dev-accent"}`}
                    style={{ width: `${component.cpu}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-dev-text-muted/70">
                  <span>Memory</span>
                  <span className={component.memory > 80 ? "text-dev-danger" : "text-dev-text-muted"}>{component.memory}%</span>
                </div>
                <div className="w-full h-1.5 bg-dev-overlay rounded-full overflow-hidden">
                  <div
                    className={`h-full ${component.memory > 80 ? "bg-dev-danger" : "bg-dev-success"}`}
                    style={{ width: `${component.memory}%` }}
                  />
                </div>
              </div>
            )}
            {component.issues > 0 && (
              <div className="mt-3 text-xs text-dev-orange">
                {component.issues} issue{component.issues > 1 ? "s" : ""} detected
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
