"use client";

import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { LoadTestConfig, type LoadTestConfigValues } from "./loadtest-config";
import { LoadTestTable, type LoadTestListItem } from "./table-loadtest";

const API_URL = "/api/loadtest";
const LOADTEST_WS_URL =
  process.env.NEXT_PUBLIC_LOADTEST_WS_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

type LoadTestProgressEvent = {
  type: "loadtest:progress";
  id: string;
  progress: number;
  currentUsers: number;
  status: LoadTestListItem["status"];
  latency?: string;
  duration?: number;
  errors?: number;
  errorMessage?: string | null;
};

interface CreateLoadTestProps {
  testConfig: LoadTestConfigValues;
  setTestConfig: Dispatch<SetStateAction<LoadTestConfigValues>>;
}

export const CreateLoadTest = ({
  testConfig,
  setTestConfig,
}: CreateLoadTestProps) => {
  const [tests, setTests] = useState<LoadTestListItem[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stoppingTestId, setStoppingTestId] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadTests = useCallback(async () => {
    try {
      const response = await fetch(API_URL, {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Could not load tests");
      }

      setTests(result.data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not load tests",
      );
    } finally {
      setIsLoadingTests(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTests();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTests]);

  const activeTestIds = tests
    .filter((test) => ["queued", "running"].includes(test.status))
    .map((test) => test.id)
    .join(",");

  useEffect(() => {
    if (!activeTestIds) {
      return;
    }

    const sockets = activeTestIds.split(",").map((id) => {
      const socket = new WebSocket(createLoadTestSocketUrl(id));

      socket.addEventListener("message", (message) => {
        const event = parseLoadTestProgressEvent(message.data);

        if (!event) {
          return;
        }

        setTests((currentTests) =>
          currentTests.map((test) =>
            test.id === event.id
              ? {
                  ...test,
                  progress: event.progress,
                  currentUsers: event.currentUsers,
                  status: event.status,
                  latency: event.latency ?? test.latency,
                  duration: event.duration ?? test.duration,
                  errors: event.errors ?? test.errors,
                  errorMessage: event.errorMessage ?? test.errorMessage,
                }
              : test,
          ),
        );
      });
      socket.addEventListener("error", () => {
        void loadTests();
      });

      return socket;
    });

    return () => {
      for (const socket of sockets) {
        socket.close();
      }
    };
  }, [activeTestIds, loadTests]);

  const handleStart = async () => {
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
      const response = await fetch(`${API_URL}/${encodeURIComponent(id)}/stop`, {
        method: "POST",
      });
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:col-span-2 space-y-6"
      >
        <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Create Load Test
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-blue-200 mb-3 text-sm font-medium">
                Endpoint
              </label>
              <div className="flex gap-3">
                <div className="relative">
                  <select
                    value={testConfig.method}
                    onChange={(e) =>
                      setTestConfig({ ...testConfig, method: e.target.value })
                    }
                    className="appearance-none px-4 py-3 pr-10 bg-white/10 border border-white/20 rounded-xl text-white font-medium cursor-pointer hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className={`flex-1 px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:border-transparent ${
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
          stoppingTestId={stoppingTestId}
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

function parseLoadTestProgressEvent(data: unknown) {
  if (typeof data !== "string") {
    return null;
  }

  try {
    const event = JSON.parse(data) as LoadTestProgressEvent;

    if (
      event.type !== "loadtest:progress" ||
      typeof event.id !== "string" ||
      typeof event.progress !== "number" ||
      typeof event.currentUsers !== "number" ||
      (event.duration !== undefined && typeof event.duration !== "number") ||
      !["running", "completed", "failed", "stopped"].includes(event.status)
    ) {
      return null;
    }

    return event;
  } catch {
    return null;
  }
}

function createLoadTestSocketUrl(id: string) {
  const url = new URL(LOADTEST_WS_URL);

  if (url.protocol === "http:") {
    url.protocol = "ws:";
  }

  if (url.protocol === "https:") {
    url.protocol = "wss:";
  }

  if (url.pathname === "/") {
    url.pathname = "/loadtest/events";
  }

  url.searchParams.set("id", id);

  return url;
}
