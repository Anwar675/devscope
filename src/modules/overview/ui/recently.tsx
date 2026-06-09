import {motion} from "motion/react";
import { Sparkles, LogIn, Package, Search, ShoppingCart, CreditCard } from "lucide-react";


const testScenarios = [
    { id: 1, name: "Login", icon: LogIn, endpoint: "POST /auth/login", latency: "320ms", status: "pass", color: "purple" },
    { id: 2, name: "View Product", icon: Package, endpoint: "GET /products/:id", latency: "890ms", status: "warning", color: "teal" },
    { id: 3, name: "Search Products", icon: Search, endpoint: "GET /search", latency: "2,400ms", status: "fail", color: "blue" },
    { id: 4, name: "Create Order", icon: ShoppingCart, endpoint: "POST /orders", latency: "4,120ms", status: "fail", color: "coral" },
    { id: 5, name: "Checkout", icon: CreditCard, endpoint: "POST /checkout", latency: "5,200ms", status: "fail", color: "amber" },
  ];

export const Recently = () => {
    return (
         <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 bg-dev-surface/5 backdrop-blur-lg border border-dev-border rounded-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-dev-text">Test Scenarios</h3>
              <button className="px-3 py-1 bg-linear-to-r from-dev-purple to-dev-accent text-dev-text text-xs rounded-lg flex items-center gap-1 hover:scale-105 transition-transform">
                <Sparkles className="w-3 h-3" />
                AI Generate
              </button>
            </div>
            <div className="space-y-3">
              {testScenarios.map((scenario, idx) => (
                <motion.div
                  key={scenario.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-dev-surface/5 rounded-xl border border-dev-border hover:border-dev-border-strong transition-all"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    scenario.color === 'purple' ? 'bg-dev-purple/20' :
                    scenario.color === 'teal' ? 'bg-dev-teal/20' :
                    scenario.color === 'blue' ? 'bg-dev-accent/20' :
                    scenario.color === 'coral' ? 'bg-dev-orange/20' :
                    'bg-dev-amber/20'
                  }`}>
                    <scenario.icon className={`w-5 h-5 ${
                      scenario.color === 'purple' ? 'text-dev-purple' :
                      scenario.color === 'teal' ? 'text-dev-teal' :
                      scenario.color === 'blue' ? 'text-dev-accent' :
                      scenario.color === 'coral' ? 'text-dev-orange' :
                      'text-dev-amber'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-dev-text text-sm">{scenario.name}</div>
                    <div className="text-xs text-dev-text-muted/70 truncate">{scenario.endpoint} · {scenario.latency} P95</div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    scenario.status === 'pass' ? 'bg-dev-success/20 text-dev-success' :
                    scenario.status === 'warning' ? 'bg-dev-orange/20 text-dev-orange' :
                    'bg-dev-danger/20 text-dev-danger'
                  }`}>
                    {scenario.status === 'pass' ? 'Pass' : scenario.status === 'warning' ? 'Slow' : 'Fail'}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
    )
}
