import { motion } from "motion/react";
import { Brain } from "lucide-react";

export const AIAnalysisHeader = () => {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-dev-purple to-dev-accent sm:h-12 sm:w-12">
          <Brain className="h-6 w-6 text-dev-text sm:h-7 sm:w-7" />
        </div>
        <h1 className="text-3xl font-bold text-dev-text sm:text-4xl">AI Performance Analysis</h1>
      </div>
      <p className="text-dev-text-muted/70 sm:ml-15">Intelligent root cause analysis and optimization recommendations</p>
    </motion.div>
  );
};
