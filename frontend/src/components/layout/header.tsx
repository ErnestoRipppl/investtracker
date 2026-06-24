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
    <header className="h-14 border-b border-border flex items-center justify-between px-4 lg:px-6 bg-background/80 backdrop-blur-sm shrink-0">
      <h1 className="text-base font-semibold text-foreground truncate">
        {title}
      </h1>
      <div className="flex items-center gap-2">
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
