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
      <div className="flex w-full flex-wrap gap-3 sm:w-auto sm:justify-end">
        <div className="flex max-w-full gap-2 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1">
          {metricsTimeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                timeRange === range
                  ? "bg-blue-600 text-white"
                  : "text-blue-200/70 hover:text-blue-200"
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-blue-200 transition-all hover:bg-white/10">
          <Filter className="w-4 h-4" />
          Filter
        </button>

        <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-white transition-transform hover:scale-105">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
    </Headers>
  );
};
