import { motion } from "motion/react";

export const LoadTestProgress = () => {
  return (
    <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Test Progress</h3>
        <span className="text-blue-300">2m 30s / 5m 00s</span>
      </div>
      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "50%" }}
          transition={{ duration: 1 }}
          className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
        />
      </div>
    </div>
  );
};
