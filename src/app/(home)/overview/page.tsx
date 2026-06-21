import type { Metadata } from "next";
import { OverviewDashboard } from "@/modules/overview/ui/overview";

export const metadata: Metadata = {
  title: "Traffic Test Overview",
  description:
    "Track traffic testing projects, recent load test activity, performance trends, and backend health from the DevScope AI overview dashboard.",
  alternates: {
    canonical: "/overview",
  },
};

const OverView = () => {
  return (
    <div className="pt-18">
      <OverviewDashboard />
    </div>
  );
};

export default OverView;
