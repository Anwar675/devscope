import { Activity, Brain, Database, Lightbulb, Server } from "lucide-react";
import { motion } from "motion/react";

const bottlenecks = [
    {
      title: "Database connection pool exhausted",
      severity: "critical",
      impact: "100% pool usage at 10k users. Queries queuing. Missing index on orders table.",
      recommendation: "Add index on orders.created_at",
      icon: Database,
      progress: 95
    },
    {
      title: "Missing Redis cache layer",
      severity: "high",
      impact: "Product reads hit DB on every request. Cache hit rate = 0%. 70% of queries are identical.",
      recommendation: "Implement Redis for read-heavy operations",
      icon: Server,
      progress: 75
    },
    {
      title: "No read replica for analytics",
      severity: "medium",
      impact: "Search queries run on primary DB, competing with writes under load.",
      recommendation: "Add read replica to offload analytics queries",
      icon: Activity,
      progress: 55
    },
  ];

export const AiAnalish = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="p-6 bg-dev-surface/5 backdrop-blur-lg border border-dev-border rounded-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-dev-purple" />
                <h3 className="text-xl font-semibold text-dev-text">AI Bottleneck Analysis</h3>
              </div>
              <span className="px-3 py-1 bg-dev-purple/20 text-dev-purple text-sm rounded-full">
                3 found
              </span>
            </div>

            {/* AI Insight Box */}
            <div className="mb-6 p-4 bg-linear-to-r from-dev-purple/20 to-dev-accent/20 border-l-4 border-dev-purple rounded-r-xl">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-dev-purple" />
                <h4 className="font-semibold text-dev-purple text-sm">Root cause identified</h4>
              </div>
              <p className="text-sm text-dev-text-soft leading-relaxed">
                Traffic spike → DB connection pool saturated (98/100). Queries lack index on{' '}
                <code className="px-2 py-0.5 bg-dev-purple/20 rounded text-dev-text-muted text-xs">orders.created_at</code>.
                CPU is low (32%) — bottleneck is I/O, not compute.
              </p>
            </div>

            <div className="space-y-4">
              {bottlenecks.map((bottleneck, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + idx * 0.1 }}
                  className="flex gap-4 p-4 bg-dev-surface/5 rounded-xl border border-dev-border"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    bottleneck.severity === 'critical' ? 'bg-dev-danger/20' :
                    bottleneck.severity === 'high' ? 'bg-dev-orange/20' :
                    'bg-dev-yellow/20'
                  }`}>
                    <bottleneck.icon className={`w-6 h-6 ${
                      bottleneck.severity === 'critical' ? 'text-dev-danger' :
                      bottleneck.severity === 'high' ? 'text-dev-orange' :
                      'text-dev-yellow'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-dev-text text-sm">{bottleneck.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        bottleneck.severity === 'critical' ? 'bg-dev-danger/20 text-dev-danger' :
                        bottleneck.severity === 'high' ? 'bg-dev-orange/20 text-dev-orange' :
                        'bg-dev-yellow/20 text-dev-yellow'
                      }`}>
                        {bottleneck.severity === 'critical' ? 'Critical' : bottleneck.severity === 'high' ? 'High' : 'Medium'}
                      </span>
                    </div>
                    <p className="text-xs text-dev-text-muted/70 mb-3 leading-relaxed">{bottleneck.impact}</p>
                    {/* Severity bar */}
                    <div className="w-full h-1 bg-dev-surface/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${bottleneck.progress}%` }}
                        transition={{ delay: 1 + idx * 0.1, duration: 0.8 }}
                        className={`h-full ${
                          bottleneck.severity === 'critical' ? 'bg-dev-danger' :
                          bottleneck.severity === 'high' ? 'bg-dev-orange' :
                          'bg-dev-yellow'
                        }`}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
    )
}
