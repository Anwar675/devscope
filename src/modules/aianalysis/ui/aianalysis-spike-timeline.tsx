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
import { chartTooltipStyle, type SpikeTimelinePoint } from "./aianalysis-data";

interface AIAnalysisSpikeTimelineProps {
  data: SpikeTimelinePoint[];
}

type SpikeDotProps = {
  cx?: number;
  cy?: number;
  payload?: SpikeTimelinePoint;
};

const renderSpikeDot = ({ cx, cy, payload }: SpikeDotProps) => {
  if (cx === undefined || cy === undefined || !payload) {
    return null;
  }

  if (payload.normal && !payload.spike) {
    return null;
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={payload.spike === "peak" ? 7 : 5}
      fill="var(--dev-danger)"
      stroke="var(--dev-text)"
      strokeWidth={1.5}
    />
  );
};

export const AIAnalysisSpikeTimeline = ({ data }: AIAnalysisSpikeTimelineProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-8 p-6 bg-dev-panel backdrop-blur-lg border border-dev-border rounded-2xl"
    >
      <h3 className="text-xl font-semibold text-dev-text mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-dev-orange" />
        Spike Detection Timeline
      </h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="latencySpike" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--dev-danger)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--dev-danger)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--dev-chart-grid)" />
            <XAxis dataKey="time" stroke="var(--dev-chart-axis)" style={{ fontSize: "12px" }} />
            <YAxis stroke="var(--dev-chart-axis)" style={{ fontSize: "12px" }} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${value}ms`, "Latency"]} />
            <ReferenceLine
              y={500}
              stroke="var(--dev-orange)"
              strokeDasharray="5 5"
              label={{ value: "Watch Threshold", position: "right", fill: "var(--dev-orange)", fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="latency"
              stroke="var(--dev-danger)"
              fill="url(#latencySpike)"
              strokeWidth={2}
              dot={renderSpikeDot}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-62 items-center justify-center rounded-xl border border-dev-border bg-dev-panel text-dev-text-muted">
          No realtime series available yet.
        </div>
      )}
      <div className="mt-4 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-dev-success rounded-full" />
          <span className="text-dev-text-muted/70">Normal samples</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-dev-danger rounded-full animate-pulse" />
          <span className="text-dev-text-muted/70">Spike samples</span>
        </div>
      </div>
    </motion.div>
  );
};
