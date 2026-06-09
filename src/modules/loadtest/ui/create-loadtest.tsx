import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";
import { LoadTestConfig, type LoadTestConfigValues } from "./loadtest-config";
import { LoadTestTable } from "./table-loadtest";

interface CreateLoadTestProps {
  testConfig: LoadTestConfigValues;
  setTestConfig: Dispatch<SetStateAction<LoadTestConfigValues>>;
}

export const CreateLoadTest = ({
  testConfig,
  setTestConfig,
}: CreateLoadTestProps) => {
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
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-blue-300/70 mt-2">
                Enter the full URL of the endpoint you want to test
              </p>
            </div>

            <div>
              <label className="block text-blue-200 mb-3 text-sm font-medium">
                Headers (Optional)
              </label>
              <textarea
                placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                rows={3}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            {(testConfig.method === "POST" ||
              testConfig.method === "PUT" ||
              testConfig.method === "PATCH") && (
              <div>
                <label className="block text-blue-200 mb-3 text-sm font-medium">
                  Request Body
                </label>
                <textarea
                  placeholder='{"name": "Product", "price": 99.99}'
                  rows={4}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>
            )}
          </div>
        </div>
        <LoadTestTable />
      </motion.div>
      <LoadTestConfig
        testConfig={testConfig}
        setTestConfig={setTestConfig}
      />
    </div>
  );
};
