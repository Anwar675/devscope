"use client";

import { useState } from "react";
import { Activity, Brain, Plus, type LucideIcon } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<LoadTestTab>("create");
  const [testConfig, setTestConfig] = useState<LoadTestConfigValues>({
    url: "https://api.example.com/products",
    method: "GET",
    users: 100,
    duration: 300,
    rampUp: 60,
  });

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
              onClick={() => setActiveTab(tab.id)}
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
          />
        )}

        {activeTab === "running" && <RunningLoadTest />}

        {activeTab === "results" && <LoadTestResults />}
      </div>
    </div>
  );
}
