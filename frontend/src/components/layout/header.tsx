"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/transactions": "Transacciones",
  "/import": "Importar Excel",
  "/analytics": "Analítica Cuantitativa",
  "/recommendations": "Recomendaciones de Inversión",
  "/simulations": "Simulaciones y Metas",
  "/profile": "Perfil Inversor",
  "/settings": "Configuración",
};

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const title = routeTitles[pathname] ?? "InvestTracker";

  return (
    <header className="h-14 border-b border-sidebar-border flex items-center justify-between px-4 lg:px-6 bg-card/75 backdrop-blur-xl shrink-0">
      <h1 className="text-xs font-black tracking-widest text-primary/80 truncate uppercase">
        {title}
      </h1>
      <div className="flex items-center gap-3">
        {/* VIP Whale Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 shadow-sm">
          <span className="status-dot-gold" />
          <span className="tracking-wider uppercase text-[9px] font-bold">Family Office Portal</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-sm">
          <span className="status-dot-active" />
          <span className="tracking-wider uppercase text-[9px] font-bold hidden md:inline">Whale Mode Activo</span>
          <span className="tracking-wider uppercase text-[9px] font-bold md:hidden">Whale Activo</span>
        </div>

        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "flex items-center justify-center h-9 w-9 rounded-lg",
              "text-muted-foreground hover:text-foreground hover:bg-accent",
              "transition-colors duration-150"
            )}
            aria-label="Cambiar tema"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </header>
  );
}
