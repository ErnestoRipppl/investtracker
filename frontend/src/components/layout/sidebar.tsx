"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { useAppReducedMotion } from "@/lib/motion";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Upload,
  Brain,
  UserCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/recommendations", label: "Recomendaciones", icon: Sparkles },
  { href: "/simulations", label: "Simulaciones", icon: LineChart },
  { href: "/transactions", label: "Transacciones", icon: ArrowLeftRight },
  { href: "/import", label: "Importar", icon: Upload },
  { href: "/analytics", label: "Analítica", icon: Brain },
  { href: "/profile", label: "Perfil", icon: UserCircle },
  { href: "/settings", label: "Config", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const reducedMotion = useAppReducedMotion();

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen border-r border-sidebar-border",
        "bg-sidebar-background/80 backdrop-blur-xl",
        "transition-all ease-out",
        reducedMotion ? "duration-0" : "duration-300",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Branding */}
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/25 overflow-hidden bg-black/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
            <img
              src="/whale_gold_badge.png"
              alt="Whale Logo"
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
            />
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <m.div
                key="brand-text"
                initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col select-none"
              >
                <div className="flex items-center gap-1">
                  <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                    Whale Tracker
                  </span>
                  <span className="text-[8px] font-black tracking-widest px-1 py-0.25 rounded bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30 uppercase scale-90 origin-left">
                    Elite
                  </span>
                </div>
                <span className="text-[8px] text-muted-foreground/50 tracking-wider -mt-0.5 uppercase font-medium">
                  Family Office Suite
                </span>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                "transition-all duration-150 relative overflow-hidden group min-h-[44px]",
                isActive
                  ? "bg-gradient-to-r from-primary/12 to-amber-500/2 text-primary border-l-2 border-primary shadow-[inset_1px_0_0_0_rgba(16,185,129,0.1)]"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110",
                  isActive ? "text-sidebar-primary" : "group-hover:text-amber-400"
                )}
              />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <m.span
                    key={`nav-${item.href}`}
                    initial={reducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </m.span>
                )}
              </AnimatePresence>
              {/* Subtle gold line hover indicator for inactive items */}
              {!isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-amber-400 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center justify-center w-full rounded-lg py-2.5",
            "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            "transition-colors duration-150 min-h-[44px]"
          )}
          aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
