"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { useAppReducedMotion } from "@/lib/motion";
import {
  TrendingUp,
  LayoutDashboard,
  ArrowLeftRight,
  Upload,
  Brain,
  UserCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
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
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="h-4 w-4" />
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <m.span
                key="brand-text"
                initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="font-semibold text-sm text-sidebar-foreground whitespace-nowrap"
              >
                InvestTracker
              </m.span>
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
                "transition-colors duration-150",
                "min-h-[44px]",
                isActive
                  ? "bg-sidebar-primary/15 text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive ? "text-sidebar-primary" : ""
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
