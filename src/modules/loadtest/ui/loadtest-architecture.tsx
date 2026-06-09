const architectureRecommendation = {
  current: [
    { component: "Client", level: 0 },
    { component: "Backend API", level: 1 },
    { component: "PostgreSQL", level: 2 },
  ],
  recommended: [
    { component: "Client", level: 0 },
    { component: "Load Balancer", level: 1 },
    { component: "Backend API (x3)", level: 2 },
    { component: "Redis Cache", level: 3 },
    { component: "PostgreSQL Primary", level: 4 },
    { component: "Read Replicas (x2)", level: 4 },
  ],
};

export const LoadTestArchitecture = () => {
  return (
    <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
      <h3 className="text-2xl font-semibold text-white mb-6">Architecture Recommendation</h3>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h4 className="text-lg font-medium text-blue-300 mb-4">Current Architecture</h4>
          <div className="space-y-3">
            {architectureRecommendation.current.map((item) => (
              <div
                key={item.component}
                style={{ marginLeft: `${item.level * 20}px` }}
                className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
              >
                <div className="text-white">{item.component}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-lg font-medium text-green-300 mb-4">Recommended Architecture</h4>
          <div className="space-y-3">
            {architectureRecommendation.recommended.map((item) => (
              <div
                key={item.component}
                style={{ marginLeft: `${item.level * 20}px` }}
                className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
              >
                <div className="text-white">{item.component}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
