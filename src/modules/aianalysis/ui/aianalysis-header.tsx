import { motion } from "motion/react";
import { Brain } from "lucide-react";

export const AIAnalysisHeader = () => {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-dev-purple to-dev-accent flex items-center justify-center">
          <Brain className="w-7 h-7 text-dev-text" />
        </div>
        <h1 className="text-4xl font-bold text-dev-text">AI Performance Analysis</h1>
      </div>
      <p className="text-dev-text-muted/70 ml-15">Intelligent root cause analysis and optimization recommendations</p>
    </motion.div>
  );
};
