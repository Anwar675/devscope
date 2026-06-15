import { motion } from "motion/react";

interface LoadTestProgressProps {
  progress: number;
  duration: number;
  totalDuration: number;
}

export const LoadTestProgress = ({
  progress,
  duration,
  totalDuration,
}: LoadTestProgressProps) => {
  return (
    <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Test Progress</h3>
        <span className="text-blue-300">
          {formatDuration(duration)} / {formatDuration(totalDuration)}
        </span>
      </div>
      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1 }}
          className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
        />
      </div>
    </div>
  );
};

function formatDuration(duration: number) {
  if (duration < 60) {
    return `${Math.max(0, duration)}s`;
  }

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}
