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
