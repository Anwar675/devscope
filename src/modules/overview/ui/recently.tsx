import { motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Route,
  Search,
} from "lucide-react";
import type { OverviewScenario } from "./overview-data";

type RecentlyProps = {
  scenarios: OverviewScenario[];
};

const colorStyles: Record<
  OverviewScenario["color"],
  { 
    bg: string;
    icon: string;
  }
> = {
  amber: {
    bg: "bg-dev-amber/20",
    icon: "text-dev-amber",
  },
  blue: {
    bg: "bg-dev-accent/20",
    icon: "text-dev-accent",
  },
  coral: {
    bg: "bg-dev-orange/20",
    icon: "text-dev-orange",
  },
  purple: {
    bg: "bg-dev-purple/20",
    icon: "text-dev-purple",
  },
  teal: {
    bg: "bg-dev-teal/20",
    icon: "text-dev-teal",
  },
};

const statusStyles: Record<
  OverviewScenario["status"],
  {
    label: string;
    className: string;
  }
> = {
  fail: {
    label: "Fail",
    className: "bg-dev-danger/20 text-dev-danger",
  },
  pass: {
    label: "Pass",
    className: "bg-dev-success/20 text-dev-success",
  },
  warning: {
    label: "Slow",
    className: "bg-dev-orange/20 text-dev-orange",
  },
};

const getScenarioIcon = (scenario: OverviewScenario) => {
  if (scenario.status === "fail") {
    return AlertTriangle;
  }

  if (scenario.status === "warning") {
    return Clock;
  }

  if (scenario.endpoint.toUpperCase().includes("SEARCH")) {
    return Search;
  }

  return CheckCircle2;
};

export const Recently = ({ scenarios }: RecentlyProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
      className="p-6 bg-dev-surface/5 backdrop-blur-lg border border-dev-border rounded-2xl"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-dev-text">Test Scenarios</h3>
        <Route className="w-5 h-5 text-dev-accent" />
      </div>
      <div className="space-y-3">
        {scenarios.length === 0 && (
          <div className="rounded-xl border border-dev-border bg-dev-surface/5 p-4 text-sm text-dev-text-muted">
            No endpoint scenarios available yet.
          </div>
        )}
        {scenarios.map((scenario, idx) => {
          const ScenarioIcon = getScenarioIcon(scenario);
          const colors = colorStyles[scenario.color];
          const status = statusStyles[scenario.status];

          return (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + idx * 0.05 }}
              className="flex items-center gap-3 p-3 bg-dev-surface/5 rounded-xl border border-dev-border hover:border-dev-border-strong transition-all"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg}`}>
                <ScenarioIcon className={`w-5 h-5 ${colors.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-dev-text text-sm">
                  {scenario.name}
                </div>
                <div className="text-xs text-dev-text-muted/70 truncate">
                  {scenario.endpoint} - {scenario.latency} P95
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${status.className}`}>
                {status.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
