"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Upload,
  Brain,
  UserCircle,
  Settings,
  Sparkles,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur-lg border-t border-border",
        "h-16"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-full px-2">
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
                "flex flex-col items-center justify-center gap-0.5",
                "min-w-[44px] min-h-[44px] rounded-lg",
                "transition-colors duration-150",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
