"use client";

import { useState } from "react";
import { Activity, Brain, Plus, type LucideIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Headers } from "@/modules/home/headers";
import { CreateLoadTest } from "./create-loadtest";
import { LoadTestResults } from "./loadtest-results";
import { RunningLoadTest } from "./running-loadtest";
import type { LoadTestConfigValues } from "./loadtest-config";

type LoadTestTab = "create" | "running" | "results";

const tabs: {
  id: LoadTestTab;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "create", label: "Create Test", icon: Plus },
  { id: "running", label: "Running Tests", icon: Activity },
  { id: "results", label: "Results & Insights", icon: Brain },
];

export const LoadTestMain = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parseLoadTestTab(searchParams.get("tab"));
  const selectedLoadTestId = searchParams.get("id") ?? undefined;
  const [testConfig, setTestConfig] = useState<LoadTestConfigValues>({
    url: "https://api.example.com/products",
    method: "GET",
    users: 100,
    duration: 300,
    rampUp: 60,
  });
  const openTab = (tab: LoadTestTab) => {
    const params = new URLSearchParams(searchParams.toString());

    if (tab === "create") {
      params.delete("tab");
      params.delete("id");
    } else {
      params.set("tab", tab);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };
  const openRunningTest = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("tab", "running");
    params.set("id", id);
    router.push(`${pathname}?${params.toString()}`);
  };
  const openResults = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("tab", "results");
    params.set("id", id);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-blue-950 to-slate-950 p-8">
      <div className="max-w-450 mx-auto">
        {/* Header */}
        <Headers title="Load Testing" description="Create, run, and analyze load tests with AI-powered insights" />
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => openTab(tab.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-white/5 text-blue-200/70 hover:bg-white/10"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Create Test Tab */}
        {activeTab === "create" && (
          <CreateLoadTest
            testConfig={testConfig}
            setTestConfig={setTestConfig}
            onOpenRunningTest={openRunningTest}
            onOpenResults={openResults}
          />
        )}

        {activeTab === "running" && (
          <RunningLoadTest selectedRunId={selectedLoadTestId} />
        )}

        {activeTab === "results" && (
          <LoadTestResults selectedRunId={selectedLoadTestId} />
        )}
      </div>
    </div>
  );
}

function parseLoadTestTab(value: string | null): LoadTestTab {
  return value === "running" || value === "results" ? value : "create";
}
