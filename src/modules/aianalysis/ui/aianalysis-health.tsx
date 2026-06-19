import { motion } from "motion/react";
import { Activity } from "lucide-react";
import type { AnalysisHealthComponent } from "./aianalysis-data";

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

interface AIAnalysisHealthProps {
  health: AnalysisHealthComponent[];
}

const getMetricClass = (tone: AnalysisHealthComponent["metrics"][number]["tone"]) => {
  if (tone === "danger") {
    return "text-dev-danger";
  }

  if (tone === "warning") {
    return "text-dev-orange";
  }

  if (tone === "success") {
    return "text-dev-success";
  }

  return "text-dev-text-muted";
};

export const AIAnalysisHealth = ({ health }: AIAnalysisHealthProps) => {
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
        {health.map((component, idx) => (
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
            <p className="mb-3 text-xs text-dev-text-muted/70">{component.detail}</p>
            <div className="space-y-2">
              {component.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="flex justify-between gap-3 text-xs text-dev-text-muted/70"
                >
                  <span>{metric.label}</span>
                  <span className={getMetricClass(metric.tone)}>{metric.value}</span>
                </div>
              ))}
              </div>
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
