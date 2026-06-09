import { motion } from "motion/react";
import { LoadTestLiveStats } from "./loadtest-live-stats";
import { LoadTestProgress } from "./loadtest-progress";
import { LoadTestRealtimeCharts } from "./loadtest-realtime-charts";

export const RunningLoadTest = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <LoadTestLiveStats />
      <LoadTestRealtimeCharts />
      <LoadTestProgress />
    </motion.div>
  );
};
