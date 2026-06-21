import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadTestMain } from "@/modules/loadtest/ui/loadtest-main";

export const metadata: Metadata = {
  title: "Load Testing",
  description:
    "Build and run traffic test scenarios to measure how backend services perform under realistic concurrent user load.",
  alternates: {
    canonical: "/loadtest",
  },
};

const LoadTestPage = () => {
  return (
    <div>
      <Suspense fallback={null}>
        <LoadTestMain />
      </Suspense>
    </div>
  );
};

export default LoadTestPage;
