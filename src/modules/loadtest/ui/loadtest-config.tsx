import type { Dispatch, SetStateAction } from "react";
import { Clock, TrendingUp, Users, Play } from "lucide-react";
import { motion } from "motion/react";

export interface LoadTestConfigValues {
  url: string;
  method: string;
  users: number;
  duration: number;
  rampUp: number;
}

interface LoadTestConfigProps {
  testConfig: LoadTestConfigValues;
  setTestConfig: Dispatch<SetStateAction<LoadTestConfigValues>>;
  errorMessage?: string;
  isSubmitting?: boolean;
  onStart: () => void;
  successMessage?: string;
}

export const LoadTestConfig = ({
  testConfig,
  setTestConfig,
  errorMessage,
  isSubmitting = false,
  onStart,
  successMessage,
}: LoadTestConfigProps) => {
  const updateDuration = (duration: number) => {
    setTestConfig({
      ...testConfig,
      duration,
      rampUp: Math.min(testConfig.rampUp, duration),
    });
  };
  const updateRampUp = (rampUp: number) => {
    setTestConfig({
      ...testConfig,
      rampUp: Math.min(rampUp, testConfig.duration),
    });
  };

  return (
     <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
                <h3 className="text-xl font-semibold text-white mb-6">Test Configuration</h3>

                <div className="space-y-6">
                  {/* Virtual Users */}
                  <div>
                    <label className="flex items-center gap-2 text-blue-200 mb-3">
                      <Users className="w-5 h-5" />
                      Virtual Users
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="10"
                        max="100000"
                        step="10"
                        value={testConfig.users}
                        onChange={(e) => setTestConfig({ ...testConfig, users: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <input
                        type="number"
                        value={testConfig.users}
                        onChange={(e) => setTestConfig({ ...testConfig, users: parseInt(e.target.value) })}
                        className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="flex items-center gap-2 text-blue-200 mb-3">
                      <Clock className="w-5 h-5" />
                      Total Duration (seconds)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="60"
                        max="3600"
                        step="30"
                        value={testConfig.duration}
                        onChange={(e) => updateDuration(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <input
                        type="number"
                        value={testConfig.duration}
                        onChange={(e) => updateDuration(parseInt(e.target.value))}
                        className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  {/* Ramp-up */}
                  <div>
                    <label className="flex items-center gap-2 text-blue-200 mb-3">
                      <TrendingUp className="w-5 h-5" />
                      Ramp-up Time (seconds)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max={Math.min(300, testConfig.duration)}
                        step="10"
                        value={testConfig.rampUp}
                        onChange={(e) => updateRampUp(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <input
                        type="number"
                        min="0"
                        max={testConfig.duration}
                        value={testConfig.rampUp}
                        onChange={(e) => updateRampUp(parseInt(e.target.value))}
                        className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  {/* Start Button */}
                  <button
                    disabled={!testConfig.url || isSubmitting}
                    onClick={onStart}
                    className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      testConfig.url && !isSubmitting
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/50 hover:scale-105"
                        : "bg-white/5 text-white/30 cursor-not-allowed"
                    }`}
                  >
                    <Play className="w-5 h-5" />
                    {isSubmitting ? "Creating..." : "Start Load Test"}
                  </button>

                  {errorMessage && (
                    <p className="text-sm text-red-300">{errorMessage}</p>
                  )}

                  {successMessage && (
                    <p className="text-sm text-green-300">{successMessage}</p>
                  )}
                </div>
              </div>

              {/* Quick Presets */}
              <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Presets</h3>
                <div className="space-y-2">
                  {[
                    { name: "Light", users: 100, duration: 300 },
                    { name: "Medium", users: 1000, duration: 600 },
                    { name: "Heavy", users: 5000, duration: 900 },
                    { name: "Stress", users: 10000, duration: 1200 },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setTestConfig({ ...testConfig, users: preset.users, duration: preset.duration })}
                      className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-all"
                    >
                      <div className="text-white font-medium">{preset.name}</div>
                      <div className="text-sm text-blue-200/70">
                        {preset.users} users • {preset.duration}s
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
  )
}
           
