import type { Metadata } from "next";
import { AIAnalysis } from "@/modules/aianalysis/ui/aianalysis-main";

export const metadata: Metadata = {
    title: "AI Performance Analysis",
    description:
        "Use AI to analyze traffic test results, detect bottlenecks, explain root causes, and recommend backend scaling improvements.",
    alternates: {
        canonical: "/aianalysis",
    },
};

const AiAnalysisPage = () => {
    return (
        <div>
            <AIAnalysis />
        </div>
    )

}

export default AiAnalysisPage;
