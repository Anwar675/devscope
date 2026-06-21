import type { Metadata } from "next";
import { MetricsAnalytics } from "@/modules/metrics/ui/metrics-main";

export const metadata: Metadata = {
    title: "Metrics Analytics",
    description:
        "Review CPU, memory, latency, database, cache, and traffic metrics collected from performance and load testing sessions.",
    alternates: {
        canonical: "/metrics",
    },
};

const MetricsPage = () => {
    return (
        <div>
            <MetricsAnalytics />
        </div>
    )
}

export default MetricsPage;
