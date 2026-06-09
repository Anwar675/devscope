import { Activity } from "lucide-react";
import { motion } from "motion/react";
const architectureCurrent = [
  { name: "Client", icon: "💻", level: 0 },
  { name: "NestJS Backend (×1)", icon: "⚙️", level: 1 },
  { name: "PostgreSQL — bottleneck", icon: "🗄️", level: 2, isBottleneck: true },
];

export const AiRecommand = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="p-6 bg-dev-surface/5 backdrop-blur-lg border border-dev-border rounded-2xl"
    >
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-6 h-6 text-dev-accent" />
        <h3 className="text-xl font-semibold text-dev-text">
          Architecture Recommendation
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-dev-border">
        <button className="px-4 py-2 text-sm font-medium text-dev-accent border-b-2 border-dev-accent">
          Current
        </button>
        <button className="px-4 py-2 text-sm font-medium text-dev-text-muted/50 hover:text-dev-text-muted">
          Recommended
        </button>
      </div>

      {/* Current Architecture */}
      <div className="space-y-3 mb-6">
        {architectureCurrent.map((node, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 + idx * 0.1 }}
            style={{ marginLeft: `${node.level * 20}px` }}
            className={`p-3 rounded-xl border flex items-center gap-3 ${
              node.isBottleneck
                ? "bg-dev-danger/10 border-dev-danger/30"
                : "bg-dev-accent/10 border-dev-accent/30"
            }`}
          >
            <span className="text-xl">{node.icon}</span>
            <span
              className={`text-sm font-medium ${
                node.isBottleneck ? "text-dev-danger" : "text-dev-text-muted"
              }`}
            >
              {node.name}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Recommended Changes */}
      <div className="p-4 bg-linear-to-r from-dev-success/10 to-dev-emerald/10 border border-dev-success/20 rounded-xl">
        <h4 className="font-semibold text-dev-success mb-3 text-sm">
          Recommended changes
        </h4>
        <div className="space-y-2 text-sm text-dev-text-muted/80">
          <div className="flex items-start gap-2">
            <span className="text-dev-success mt-0.5">+</span>
            <span>
              <strong className="text-dev-text">Redis</strong> cache — reduce DB
              reads by ~70%
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-dev-success mt-0.5">+</span>
            <span>
              <strong className="text-dev-text">Read replica</strong> — offload
              analytics queries
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-dev-success mt-0.5">+</span>
            <span>
              <strong className="text-dev-text">Scale backend ×4</strong> —
              horizontal scaling
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-dev-success mt-0.5">+</span>
            <span>
              <strong className="text-dev-text">Load balancer</strong> — distribute
              traffic
            </span>
          </div>
        </div>
      </div>

      <button className="w-full mt-4 py-3 bg-linear-to-r from-dev-purple to-dev-accent hover:from-dev-purple-hover hover:to-dev-accent-hover text-dev-text rounded-xl transition-all font-medium text-sm">
        View full recommendation with trade-offs →
      </button>
    </motion.div>
  );
};
