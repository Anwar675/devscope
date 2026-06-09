import type { Dispatch, SetStateAction } from "react";
import { Download, Filter } from "lucide-react";
import { Headers } from "@/modules/home/headers";
import { metricsTimeRanges, type MetricsTimeRange } from "./metrics-data";

interface MetricsHeaderProps {
  timeRange: MetricsTimeRange;
  setTimeRange: Dispatch<SetStateAction<MetricsTimeRange>>;
}

export const MetricsHeader = ({ timeRange, setTimeRange }: MetricsHeaderProps) => {
  return (
    <Headers title="Metrics Analytics" description="Real-time performance metrics and insights">
      <div className="flex gap-3">
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
          {metricsTimeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === range
                  ? "bg-blue-600 text-white"
                  : "text-blue-200/70 hover:text-blue-200"
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-blue-200 hover:bg-white/10 transition-all flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </button>

        <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:scale-105 transition-transform flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
    </Headers>
  );
};
