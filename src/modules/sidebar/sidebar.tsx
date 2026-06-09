"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  FlaskConical,
  Home,
  LayoutDashboard,
  LineChart,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: Home,
  },
  {
    href: "/overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/loadtest",
    label: "Load Test",
    icon: FlaskConical,
  },
  {
    href: "/metrics",
    label: "Metrics",
    icon: LineChart,
  },
  {
    href: "/aianalysis",
    label: "AI Analysis",
    icon: Brain,
  },
];

export const SideBar = () => {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-dev-nav backdrop-blur-lg border-b border-dev-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <Brain className="w-8 h-8 text-dev-accent" />
            <span className="text-2xl font-bold text-dev-text">
              DevScope AI
            </span>
          </div>
        </Link>

        <div className="flex gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  isActive(item.href)
                    ? "bg-dev text-dev-text"
                    : "text-dev-text-muted hover:bg-dev-surface/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
