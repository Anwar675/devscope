import { motion } from "motion/react";
import { Activity } from "lucide-react";
import { systemHealth } from "./aianalysis-data";

const getHealthPanelClass = (status: string) => {
  if (status === "critical") {
    return "bg-red-500/10 border-red-500/30";
  }

  if (status === "degraded") {
    return "bg-orange-500/10 border-orange-500/30";
  }

  if (status === "missing") {
    return "bg-yellow-500/10 border-yellow-500/30";
  }

  return "bg-green-500/10 border-green-500/30";
};

const getHealthBadgeClass = (status: string) => {
  if (status === "critical") {
    return "bg-red-500/20 text-red-300";
  }

  if (status === "degraded") {
    return "bg-orange-500/20 text-orange-300";
  }

  if (status === "missing") {
    return "bg-yellow-500/20 text-yellow-300";
  }

  return "bg-green-500/20 text-green-300";
};

export const AIAnalysisHealth = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-8 p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl"
    >
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-400" />
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
              <span className="text-white font-medium text-sm">{component.component}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${getHealthBadgeClass(component.status)}`}>
                {component.status}
              </span>
            </div>
            {component.status !== "missing" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-blue-200/70">
                  <span>CPU</span>
                  <span className={component.cpu > 80 ? "text-red-400" : "text-blue-200"}>{component.cpu}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${component.cpu > 80 ? "bg-red-500" : "bg-blue-500"}`}
                    style={{ width: `${component.cpu}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-blue-200/70">
                  <span>Memory</span>
                  <span className={component.memory > 80 ? "text-red-400" : "text-blue-200"}>{component.memory}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${component.memory > 80 ? "bg-red-500" : "bg-green-500"}`}
                    style={{ width: `${component.memory}%` }}
                  />
                </div>
              </div>
            )}
            {component.issues > 0 && (
              <div className="mt-3 text-xs text-orange-300">
                {component.issues} issue{component.issues > 1 ? "s" : ""} detected
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
