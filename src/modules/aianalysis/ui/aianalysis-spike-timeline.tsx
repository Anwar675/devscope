import { motion } from "motion/react";
import { TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTooltipStyle, spikeTimelineData } from "./aianalysis-data";

export const AIAnalysisSpikeTimeline = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-8 p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl"
    >
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-orange-400" />
        Spike Detection Timeline
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={spikeTimelineData}>
          <defs>
            <linearGradient id="latencySpike" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: "12px" }} />
          <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
          <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${value}ms`, "Latency"]} />
          <ReferenceLine
            y={500}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            label={{ value: "Normal Threshold", position: "right", fill: "#f59e0b", fontSize: 11 }}
          />
          <Area type="monotone" dataKey="latency" stroke="#ef4444" fill="url(#latencySpike)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-4 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-blue-200/70">Normal: 10:00 - 10:30</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-blue-200/70">Spike Detected: 10:45 - 12:00</span>
        </div>
      </div>
    </motion.div>
  );
};
