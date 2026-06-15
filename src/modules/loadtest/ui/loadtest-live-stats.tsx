import { motion } from "motion/react";
import { Activity, Clock, Users, Zap, type LucideIcon } from "lucide-react";
import type { LoadTestLiveSnapshot } from "./running-loadtest";

type LiveStatColor = "blue" | "purple" | "green" | "orange";

interface LiveStat {
  label: string;
  value: string;
  icon: LucideIcon;
  color: LiveStatColor;
}

const liveStatColors: Record<
  LiveStatColor,
  {
    background: string;
    icon: string;
  }
> = {
  blue: {
    background: "bg-blue-500/20",
    icon: "text-blue-400",
  },
  purple: {
    background: "bg-purple-500/20",
    icon: "text-purple-400",
  },
  green: {
    background: "bg-green-500/20",
    icon: "text-green-400",
  },
  orange: {
    background: "bg-orange-500/20",
    icon: "text-orange-400",
  },
};

interface LoadTestLiveStatsProps {
  snapshot: LoadTestLiveSnapshot;
}

export const LoadTestLiveStats = ({ snapshot }: LoadTestLiveStatsProps) => {
  const liveStats: LiveStat[] = [
    {
      label: "Active Users",
      value: `${snapshot.currentUsers} / ${snapshot.totalUsers}`,
      icon: Users,
      color: "blue",
    },
    {
      label: "Requests/sec",
      value: formatMetric(snapshot.requestsPerSecond),
      icon: Zap,
      color: "purple",
    },
    {
      label: "Avg Latency",
      value: snapshot.latency,
      icon: Clock,
      color: "green",
    },
    {
      label: "Error Rate",
      value: `${formatMetric(snapshot.errorRate)}%`,
      icon: Activity,
      color: "orange",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {liveStats.map((stat, idx) => {
        const colors = liveStatColors[stat.color];

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl"
          >
            <div className={`w-12 h-12 rounded-xl ${colors.background} flex items-center justify-center mb-4`}>
              <stat.icon className={`w-6 h-6 ${colors.icon}`} />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-sm text-blue-200/70">{stat.label}</div>
          </motion.div>
        );
      })}
    </div>
  );
};

function formatMetric(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: value < 10 ? 2 : value < 100 ? 1 : 0,
  });
}
