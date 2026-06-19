import { Suspense } from "react";

import { LoadTestMain } from "@/modules/loadtest/ui/loadtest-main";

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
