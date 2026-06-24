"use client";

import { m } from "motion/react";
import { useAppReducedMotion, fadeInUp, staggerContainer } from "@/lib/motion";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { NetWorthChart } from "@/components/dashboard/net-worth-chart";
import { AllocationPie } from "@/components/dashboard/allocation-pie";
import { HoldingsTable } from "@/components/dashboard/holdings-table";
import { usePortfolio, usePortfolioHistory } from "@/hooks/use-portfolio";

export default function DashboardPage() {
  const reducedMotion = useAppReducedMotion();
  
  // Connect hooks at the page level to prefetch or monitor query states if needed
  const { isError: portfolioError } = usePortfolio();
  const { isError: historyError } = usePortfolioHistory();

  const containerProps = reducedMotion ? {} : staggerContainer;
  const itemProps = reducedMotion
    ? {}
    : {
        initial: fadeInUp.initial,
        animate: fadeInUp.animate,
        transition: fadeInUp.transition,
      };

  if (portfolioError || historyError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 space-y-4">
        <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 text-xl font-bold">
          !
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Error de Conexión</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            No se pudo establecer conexión con el servidor de InvestTracker. Por favor, verifica que el backend esté en ejecución.
          </p>
        </div>
      </div>
    );
  }

  return (
    <m.div {...containerProps} className="space-y-6">
      {/* Welcome Hero Banner */}
      <m.div {...itemProps} className="relative overflow-hidden rounded-3xl border border-sidebar-border bg-card shadow-sm glass-whale-card">
        {/* Glow behind */}
        <div className="absolute inset-0 bg-grid-glow opacity-60 pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-stretch min-h-[220px]">
          {/* Text and stats side */}
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-between relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[9px] font-black text-amber-850 tracking-widest uppercase">
                Socio General &bull; Acceso Whale
              </div>
              <h2 className="text-xl md:text-3xl font-black tracking-tight text-primary leading-tight">
                Portal de Gestión Patrimonial
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground/90 max-w-xl font-medium leading-relaxed">
                Bienvenido al centro de mando familiar de grado institucional. Aquí supervisas tus portafolios globales, análisis de riesgo y rebalanceos automatizados en tiempo real.
              </p>
            </div>
            
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-primary/5">
              <div className="space-y-0.5">
                <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-bold block">Nivel de Acceso</span>
                <span className="text-xs font-extrabold text-primary">VIP / Elite (Grado 5)</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-bold block">Custodios Activos</span>
                <span className="text-xs font-extrabold text-primary">Multibanco Enlazado</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-bold block">Límite Operativo</span>
                <span className="text-xs font-extrabold text-amber-700 flex items-center gap-1">
                  Ilimitado
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-bold block">Estado de Red</span>
                <span className="text-xs font-extrabold text-emerald-700 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Operativo &bull; SSL
                </span>
              </div>
            </div>
          </div>
          
          {/* Cyber Whale Image Side */}
          <div className="w-full lg:w-[320px] relative min-h-[180px] lg:min-h-full overflow-hidden border-t lg:border-t-0 lg:border-l border-sidebar-border bg-primary/5 shrink-0">
            <img
              src="/whale_luxury_banner.png"
              alt="Cybernetic Wealth Whale"
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
            />
            {/* Glass gradient overlay to blend into the card text */}
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-card via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </m.div>

      {/* KPI Cards Grid */}
      <m.div {...itemProps}>
        <KPICards />
      </m.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <m.div {...itemProps}>
          <NetWorthChart />
        </m.div>
        <m.div {...itemProps}>
          <AllocationPie />
        </m.div>
      </div>

      {/* Holdings Table */}
      <m.div {...itemProps}>
        <HoldingsTable />
      </m.div>
    </m.div>
  );
}
