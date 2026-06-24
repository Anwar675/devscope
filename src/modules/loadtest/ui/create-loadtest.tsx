"use client";

import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { LoadTestConfig, type LoadTestConfigValues } from "./loadtest-config";
import { LoadTestTable, type LoadTestListItem } from "./table-loadtest";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";


const API_URL = "/api/loadtest";

interface CreateLoadTestProps {
  testConfig: LoadTestConfigValues;
  setTestConfig: Dispatch<SetStateAction<LoadTestConfigValues>>;
  onOpenRunningTest?: (id: string) => void;
  onOpenResults?: (id: string) => void;
}

export const CreateLoadTest = ({
  testConfig,
  setTestConfig,
  onOpenRunningTest,
  onOpenResults,
}: CreateLoadTestProps) => {
  const [tests, setTests] = useState<LoadTestListItem[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stoppingTestId, setStoppingTestId] = useState<string | undefined>();
  const [deletingTestId, setDeletingTestId] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const isLoadingTestsRef = useRef(false);
  const router = useRouter();
  const loadTests = useCallback(async () => {
    if (isLoadingTestsRef.current) {
      return;
    }

    isLoadingTestsRef.current = true;

    try {
      const response = await fetch(API_URL, {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Could not load tests");
      }

      setTests((currentTests) =>
        areLoadTestListsEqual(currentTests, result.data)
          ? currentTests
          : result.data,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not load tests",
      );
    } finally {
      isLoadingTestsRef.current = false;
      setIsLoadingTests(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTests();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTests]);

  useEffect(() => {
    if (!tests.some(isLoadTestActive)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadTests();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [loadTests, tests]);

  const handleStart = async () => {
    const { data: session } = await authClient.getSession();

    if (!session) {
      router.push("/sign-in");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testConfig),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Could not create load test");
      }

      setTests((currentTests) => [result.data, ...currentTests]);
      setSuccessMessage("Load test created and started with k6.");
      window.setTimeout(() => {
        void loadTests();
      }, 500);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not create load test",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStop = async (id: string) => {
    setErrorMessage("");
    setSuccessMessage("");
    setStoppingTestId(id);

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(id)}/stop`,
        {
          method: "POST",
        },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Could not stop load test");
      }

      setTests((currentTests) =>
        currentTests.map((test) => (test.id === id ? result.data : test)),
      );
      setSuccessMessage("Load test stopped.");
      window.setTimeout(() => {
        void loadTests();
      }, 500);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not stop load test",
      );
    } finally {
      setStoppingTestId(undefined);
    }
  };

  const handleDelete = async (id: string) => {
    setErrorMessage("");
    setSuccessMessage("");
    setDeletingTestId(id);

    try {
      const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Could not delete load test");
      }

      setTests((currentTests) =>
        currentTests.filter((test) => test.id !== id),
      );
      setSuccessMessage("Load test deleted.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not delete load test",
      );
    } finally {
      setDeletingTestId(undefined);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="min-w-0 space-y-6 lg:col-span-2"
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg sm:p-6">
          <h2 className="mb-6 text-xl font-semibold text-white sm:text-2xl">
            Create Load Test
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-blue-200 mb-3 text-sm font-medium">
                Endpoint
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <select
                    value={testConfig.method}
                    onChange={(e) =>
                      setTestConfig({ ...testConfig, method: e.target.value })
                    }
                    className="w-full appearance-none rounded-xl border border-white/20 bg-white/10 px-4 py-3 pr-10 font-medium text-white transition-all hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
                  >
                    <option value="GET" className="bg-slate-800">
                      GET
                    </option>
                    <option value="POST" className="bg-slate-800">
                      POST
                    </option>
                    <option value="PUT" className="bg-slate-800">
                      PUT
                    </option>
                    <option value="PATCH" className="bg-slate-800">
                      PATCH
                    </option>
                    <option value="DELETE" className="bg-slate-800">
                      DELETE
                    </option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300 pointer-events-none" />
                </div>

                <input
                  type="text"
                  value={testConfig.url}
                  onChange={(e) =>
                    setTestConfig({ ...testConfig, url: e.target.value })
                  }
                  placeholder="https://api.example.com/endpoint"
                  className={`min-w-0 flex-1 rounded-xl border bg-white/10 px-4 py-3 text-white placeholder-blue-300/50 focus:border-transparent focus:outline-none focus:ring-2 ${
                    errorMessage
                      ? "border-red-400/60 focus:ring-red-500"
                      : "border-white/20 focus:ring-blue-500"
                  }`}
                />
              </div>
              {errorMessage ? (
                <p className="text-xs text-red-300 mt-2">{errorMessage}</p>
              ) : (
                <p className="text-xs text-blue-300/70 mt-2">
                  Enter the full URL of the endpoint you want to test
                </p>
              )}
            </div>
          </div>
        </div>

        <LoadTestTable
          tests={tests}
          isLoading={isLoadingTests}
          onStop={handleStop}
          onDelete={handleDelete}
          onOpenRunningTest={onOpenRunningTest}
          onOpenResults={onOpenResults}
          stoppingTestId={stoppingTestId}
          deletingTestId={deletingTestId}
        />
      </motion.div>

      <LoadTestConfig
        testConfig={testConfig}
        setTestConfig={setTestConfig}
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        onStart={handleStart}
        successMessage={successMessage}
      />
    </div>
  );
};

function areLoadTestListsEqual(
  currentTests: LoadTestListItem[],
  nextTests: LoadTestListItem[],
) {
  if (currentTests.length !== nextTests.length) {
    return false;
  }

  return currentTests.every((test, index) =>
    areLoadTestRecordsEqual(test, nextTests[index]),
  );
}

function areLoadTestRecordsEqual(
  currentTest: LoadTestListItem,
  nextTest: LoadTestListItem,
) {
  return (
    currentTest.id === nextTest.id &&
    currentTest.url === nextTest.url &&
    currentTest.method === nextTest.method &&
    currentTest.status === nextTest.status &&
    currentTest.progress === nextTest.progress &&
    currentTest.currentUsers === nextTest.currentUsers &&
    currentTest.totalUsers === nextTest.totalUsers &&
    currentTest.latency === nextTest.latency &&
    currentTest.requestsPerSecond === nextTest.requestsPerSecond &&
    currentTest.errorRate === nextTest.errorRate &&
    currentTest.errors === nextTest.errors &&
    currentTest.duration === nextTest.duration &&
    currentTest.errorMessage === nextTest.errorMessage
  );
}

function isLoadTestActive(test: LoadTestListItem) {
  return test.status === "queued" || test.status === "running";
}
