"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  Brain,
  FlaskConical,
  Home,
  LayoutDashboard,
  LineChart,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

import { UserStatus } from "../auther/user-status";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMenuOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-lg border border-dev-border bg-dev-nav text-dev-text shadow-xl backdrop-blur-lg transition-all hover:bg-dev-surface/10 lg:hidden"
        aria-label="Open menu"
        aria-expanded={isMenuOpen}
      >
        <Menu className="h-5 w-5" />
      </button>

      {isMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-dev-bg/70 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMenuOpen(false)}
          aria-label="Close menu overlay"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-[60] flex h-dvh w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-dev-border bg-dev-nav shadow-2xl backdrop-blur-xl transition-transform duration-300 ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:hidden`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-dev-border px-5 py-4">
          <Link href="/" className="min-w-0" onClick={() => setIsMenuOpen(false)}>
            <div className="flex min-w-0 cursor-pointer items-center gap-2">
              <Brain className="h-8 w-8 shrink-0 text-dev-accent" />
              <span className="truncate text-xl font-bold text-dev-text">
              DevScope AI
            </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dev-border bg-dev-surface/10 text-dev-text-muted transition-all hover:bg-dev-surface/20 hover:text-dev-text"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-5">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? "bg-dev text-dev-text shadow-lg shadow-dev-accent/20"
                    : "text-dev-text-muted hover:bg-dev-surface/10 hover:text-dev-text"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-dev-border px-5 py-4">
          <UserStatus variant="logout" />
        </div>
      </aside>

      <div className="fixed left-0 right-0 top-0 z-50 hidden border-b border-dev-border bg-dev-nav backdrop-blur-lg lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/">
            <div className="flex cursor-pointer items-center gap-2">
              <Brain className="h-8 w-8 text-dev-accent" />
              <span className="text-2xl font-bold text-dev-text">
                DevScope AI
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${
                      isActive(item.href)
                        ? "bg-dev text-dev-text"
                        : "text-dev-text-muted hover:bg-dev-surface/10"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="h-8 w-px bg-dev-border" />

            <UserStatus />
          </div>
        </div>
      </div>
    </>
  );
};
