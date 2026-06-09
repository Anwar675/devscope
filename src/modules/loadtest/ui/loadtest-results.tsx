import { motion } from "motion/react";
import { LoadTestAiAnalysis } from "./loadtest-ai-analysis";
import { LoadTestArchitecture } from "./loadtest-architecture";
import { LoadTestResultsSummary } from "./loadtest-results-summary";

export const LoadTestResults = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <LoadTestResultsSummary />
      <LoadTestAiAnalysis />
      <LoadTestArchitecture />
    </motion.div>
  );
};
