"use client"
import { motion } from "motion/react";
import { useState } from "react";
import {
  Activity,
  Zap,
  TrendingUp,
  Database,
  Server,
  GitBranch,
  Cpu,
  BarChart3,
  Brain,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Gauge,
  Target,
 
} from "lucide-react";

export const HomePage = () => {
  

  return (
    <div className="size-full overflow-auto bg-linear-to-br from-dev-bg via-dev-bg-mid to-dev-bg">
      

     
          <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 pt-20">
            {/* Animated background grid */}
            <div className="absolute inset-0 bg-dev-grid" />

            {/* Gradient orbs */}
            <motion.div
              className="absolute top-1/4 left-1/4 w-96 h-96 bg-dev-accent/30 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-dev-purple/30 rounded-full blur-3xl"
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.5, 0.3, 0.5],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            <div className="relative z-10 max-w-6xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-dev-accent-soft border border-dev-accent/20 rounded-full backdrop-blur-sm"
              >
                <Sparkles className="w-4 h-4 text-dev-accent" />
                <span className="text-sm text-dev-accent-muted">
                  AI-Powered System Design Advisor
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-6xl md:text-8xl font-bold mb-6 bg-linear-to-r from-dev-text via-dev-text-muted to-dev-purple-hover bg-clip-text text-transparent"
              >
                DevScope AI
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-xl md:text-2xl text-dev-text-soft mb-8 max-w-3xl mx-auto"
              >
                Transform raw metrics into actionable insights. Understand your
                system, detect bottlenecks, and make confident scaling
                decisions.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-wrap gap-4 justify-center"
              >
                <button
                 
                  className="px-8 py-4 bg-linear-to-r from-dev to-dev-purple hover:from-dev-accent-hover hover:to-dev-purple-hover text-dev-text rounded-xl transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg shadow-dev-accent/50"
                >
                  Get Started <ArrowRight className="w-5 h-5" />
                </button>
                <button className="px-8 py-4 bg-dev-surface/10 hover:bg-dev-surface/20 backdrop-blur-sm text-dev-text rounded-xl border border-dev-border-strong transition-all">
                  Watch Demo
                </button>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="grid grid-cols-3 gap-8 mt-20 max-w-2xl mx-auto"
              >
                {[
                  { label: "Faster Analysis", value: "10x" },
                  { label: "Cost Reduction", value: "40%" },
                  { label: "Uptime", value: "99.9%" },
                ].map((stat, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-4xl font-bold text-dev-text mb-2">
                      {stat.value}
                    </div>
                    <div className="text-sm text-dev-accent-muted">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Core Capabilities */}
          <section className="relative py-32 px-6">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-20"
              >
                <h2 className="text-5xl font-bold text-dev-text mb-4">
                  Core Capabilities
                </h2>
                <p className="text-xl text-dev-text-muted/70">
                  Everything you need to understand and optimize your backend
                  systems
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    icon: Activity,
                    title: "Load Testing",
                    description:
                      "Simulate real-world traffic patterns and stress test your infrastructure at scale",
                    gradient: "from-dev-accent to-dev-cyan",
                  },
                  {
                    icon: BarChart3,
                    title: "Metrics Analysis",
                    description:
                      "Deep dive into CPU, memory, database connections, and cache performance",
                    gradient: "from-dev-purple to-dev-pink",
                  },
                  {
                    icon: Target,
                    title: "Bottleneck Detection",
                    description:
                      "AI-powered identification of performance bottlenecks before they impact users",
                    gradient: "from-dev-orange to-dev-danger",
                  },
                  {
                    icon: TrendingUp,
                    title: "Capacity Planning",
                    description:
                      "Predict resource needs and plan infrastructure growth with confidence",
                    gradient: "from-dev-green to-dev-emerald",
                  },
                  {
                    icon: GitBranch,
                    title: "Architecture Advisor",
                    description:
                      "Get intelligent recommendations for scaling strategies and system design",
                    gradient: "from-dev-indigo to-dev-accent",
                  },
                  {
                    icon: Brain,
                    title: "Root Cause Analysis",
                    description:
                      "Let AI trace issues from symptoms to underlying causes in seconds",
                    gradient: "from-dev-pink to-dev-rose",
                  },
                ].map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="p-8 bg-dev-surface/5 backdrop-blur-lg border border-dev-border rounded-2xl hover:border-dev-border-strong transition-all group"
                  >
                    <div
                      className={`w-14 h-14 rounded-xl bg-linear-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                    >
                      <feature.icon className="w-7 h-7 text-dev-text" />
                    </div>
                    <h3 className="text-xl font-semibold text-dev-text mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-dev-text-muted/70">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="relative py-32 px-6 bg-linear-to-b from-transparent via-dev-bg-mid/30 to-transparent">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-20"
              >
                <h2 className="text-5xl font-bold text-dev-text mb-4">
                  How DevScope Works
                </h2>
                <p className="text-xl text-dev-text-muted/70">
                  From data collection to actionable insights in 5 steps
                </p>
              </motion.div>

              <div className="space-y-12">
                {[
                  {
                    step: "01",
                    title: "Create Test Scenarios",
                    description:
                      "Define user journeys like Login → Search → Checkout, or let AI generate realistic scenarios for you",
                    icon: Gauge,
                    iconStyle:
                      "from-dev-accent to-dev-accent-hover shadow-dev-accent/50",
                  },
                  {
                    step: "02",
                    title: "Run Load Tests",
                    description:
                      "Simulate 100, 1,000, or 10,000+ concurrent users to see how your system performs under pressure",
                    icon: Zap,
                    iconStyle:
                      "from-dev-purple to-dev-purple-hover shadow-dev-purple/50",
                  },
                  {
                    step: "03",
                    title: "Collect Metrics",
                    description:
                      "Gather comprehensive data: latency, throughput, CPU, memory, DB connections, cache hit rates",
                    icon: Database,
                    iconStyle: "from-dev-pink to-dev-rose shadow-dev-pink/50",
                  },
                  {
                    step: "04",
                    title: "AI Analysis",
                    description:
                      "Our AI correlates metrics to identify root causes: Is it DB connections? Missing cache? Poor indexes?",
                    icon: Brain,
                    iconStyle:
                      "from-dev-orange to-dev-danger shadow-dev-orange/50",
                  },
                  {
                    step: "05",
                    title: "Get Recommendations",
                    description:
                      "Receive architecture diagrams and trade-off analysis for Redis, queues, replicas, load balancers",
                    icon: GitBranch,
                    iconStyle:
                      "from-dev-green to-dev-emerald shadow-dev-green/50",
                  },
                ].map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex gap-8 items-start"
                  >
                    <div className="shrink-0">
                      <div
                        className={`w-20 h-20 rounded-2xl bg-linear-to-br ${step.iconStyle} flex items-center justify-center shadow-lg`}
                      >
                        <step.icon className="w-10 h-10 text-dev-text" />
                      </div>
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="text-sm font-bold text-dev-accent mb-2">
                        STEP {step.step}
                      </div>
                      <h3 className="text-2xl font-bold text-dev-text mb-3">
                        {step.title}
                      </h3>
                      <p className="text-dev-text-muted/70 text-lg">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* What Makes Us Different */}
          <section className="relative py-32 px-6">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-20"
              >
                <h2 className="text-5xl font-bold text-dev-text mb-4">
                  Beyond Traditional Tools
                </h2>
                <p className="text-xl text-dev-text-muted/70">
                  We don&apos;t replace k6, JMeter, or Grafana — we make them smarter
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="p-10 bg-linear-to-br from-dev-danger-soft to-dev-warning-soft border border-dev-danger/20 rounded-2xl"
                >
                  <h3 className="text-2xl font-bold text-dev-text mb-6">
                    Traditional Tools Show:
                  </h3>
                  <ul className="space-y-4">
                    {[
                      "Latency P95 = 4000ms",
                      "Error Rate = 15%",
                      "CPU = 95%",
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-dev-danger mt-2" />
                        <span className="text-dev-text-soft text-lg">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="p-10 bg-linear-to-br from-dev-success-soft to-dev-emerald/10 border border-dev-success/20 rounded-2xl"
                >
                  <h3 className="text-2xl font-bold text-dev-text mb-6">
                    DevScope Answers:
                  </h3>
                  <ul className="space-y-4">
                    {[
                      "How much traffic can your system handle?",
                      "Where exactly is the bottleneck?",
                      "Should you add Redis or a read replica?",
                      "What are the trade-offs of each solution?",
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-dev-success shrink-0" />
                        <span className="text-dev-text-soft text-lg">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Tech Stack Showcase */}
          <section className="relative py-32 px-6 bg-linear-to-b from-transparent via-dev-purple-soft to-transparent">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-20"
              >
                <h2 className="text-5xl font-bold text-dev-text mb-4">
                  Built on Modern Tech
                </h2>
                <p className="text-xl text-dev-text-muted/70">
                  Comprehensive knowledge from Day 1 to Day 60
                </p>
              </motion.div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { name: "PostgreSQL", icon: Database },
                  { name: "Redis", icon: Zap },
                  { name: "Docker", icon: Server },
                  { name: "k6", icon: Activity },
                  { name: "NestJS", icon: Cpu },
                  { name: "Next.js", icon: GitBranch },
                  { name: "AI/LLM", icon: Brain },
                  { name: "Monitoring", icon: BarChart3 },
                ].map((tech, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="p-6 bg-dev-surface/5 backdrop-blur-lg border border-dev-border rounded-xl text-center hover:border-dev-border-strong transition-all"
                  >
                    <tech.icon className="w-10 h-10 text-dev-accent mx-auto mb-3" />
                    <div className="text-dev-text font-medium">{tech.name}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Roadmap */}
          <section className="relative py-32 px-6">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-20"
              >
                <h2 className="text-5xl font-bold text-dev-text mb-4">
                  Product Roadmap
                </h2>
                <p className="text-xl text-dev-text-muted/70">
                  Continuous evolution towards the ultimate AI mentor
                </p>
              </motion.div>

              <div className="grid md:grid-cols-5 gap-4">
                {[
                  {
                    version: "V1",
                    title: "Load Test Dashboard",
                    features: ["Create scenarios", "Run tests", "View metrics"],
                  },
                  {
                    version: "V2",
                    title: "AI Analysis",
                    features: ["Bottleneck detection", "Root cause analysis"],
                  },
                  {
                    version: "V3",
                    title: "Architecture Advisor",
                    features: ["Redis", "Queue", "Replica", "Load Balancer"],
                  },
                  {
                    version: "V4",
                    title: "Log Analysis",
                    features: ["Upload logs", "AI error detection"],
                  },
                  {
                    version: "V5",
                    title: "Capacity Planning",
                    features: ["Traffic prediction", "Resource planning"],
                  },
                ].map((phase, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-6 bg-linear-to-b from-dev-text/10 to-dev-surface/5 backdrop-blur-lg border border-dev-border-strong rounded-xl hover:border-dev-accent/50 transition-all"
                  >
                    <div className="text-dev-accent font-bold text-sm mb-2">
                      {phase.version}
                    </div>
                    <h3 className="text-dev-text font-bold mb-4">{phase.title}</h3>
                    <ul className="space-y-2">
                      {phase.features.map((feature, fIdx) => (
                        <li key={fIdx} className="text-sm text-dev-text-muted/70">
                          • {feature}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="relative py-32 px-6">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="p-12 bg-linear-to-br from-dev/20 to-dev-purple/20 backdrop-blur-lg border border-dev-border-strong rounded-3xl"
              >
                <h2 className="text-5xl font-bold text-dev-text mb-6">
                  Ready to Master Your System?
                </h2>
                <p className="text-xl text-dev-text-soft mb-10">
                  Transform from guessing to knowing. Let AI guide you through
                  every scaling decision.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <button
                  
                    className="px-10 py-5 bg-linear-to-r from-dev to-dev-purple hover:from-dev-accent-hover hover:to-dev-purple-hover text-dev-text rounded-xl transition-all transform hover:scale-105 flex items-center gap-2 shadow-2xl shadow-dev-accent/50"
                  >
                    <Sparkles className="w-5 h-5" />
                    Start Free Trial
                  </button>
                  <button className="px-10 py-5 bg-dev-surface/10 hover:bg-dev-surface/20 backdrop-blur-sm text-dev-text rounded-xl border border-dev-border-strong transition-all">
                    Schedule Demo
                  </button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Footer */}
          <footer className="relative py-12 px-6 border-t border-dev-border">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2">
                  <Brain className="w-8 h-8 text-dev-accent" />
                  <span className="text-2xl font-bold text-dev-text">
                    DevScope AI
                  </span>
                </div>
                <div className="text-dev-text-muted/50">
                  © 2026 DevScope AI. AI-Powered Backend Engineering Assistant.
                </div>
              </div>
            </div>
          </footer>
    </div>
  );
}
