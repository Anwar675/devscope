import { motion } from "motion/react";
import type { DetectedIssue } from "./aianalysis-data";
import { AIAnalysisAffectedEndpoints } from "./aianalysis-affected-endpoints";
import { AIAnalysisCorrelations } from "./aianalysis-correlations";
import { AIAnalysisEventTimeline } from "./aianalysis-event-timeline";
import { AIAnalysisRecommendations } from "./aianalysis-recommendations";
import { AIAnalysisRootCause } from "./aianalysis-root-cause";

interface AIAnalysisIssueDetailProps {
  issue: DetectedIssue;
  selectedIssue: number;
}

export const AIAnalysisIssueDetail = ({ issue, selectedIssue }: AIAnalysisIssueDetailProps) => {
  return (
    <motion.div
      key={selectedIssue}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <AIAnalysisRootCause issue={issue} />
      <AIAnalysisEventTimeline issue={issue} />
      <AIAnalysisCorrelations issue={issue} />
      <AIAnalysisAffectedEndpoints issue={issue} />
      <AIAnalysisRecommendations issue={issue} />
    </motion.div>
  );
};
