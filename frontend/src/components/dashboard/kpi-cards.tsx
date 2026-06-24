"use client";

import { useEffect, useRef } from "react";
import { animate, m } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useAppReducedMotion, fadeInUp, staggerContainer } from "@/lib/motion";
import { formatCurrency, cn } from "@/lib/utils";
import { Wallet, TrendingUp, BarChart3, ShieldCheck, TrendingDown } from "lucide-react";

// ─── Animated Number Component ──────────────────────────────────

function AnimatedNumber({
  value,
  formatter,
}: {
  value: number;
  formatter: (val: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useAppReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reducedMotion) {
      node.textContent = formatter(value);
      return;
    }

    const startVal = parseFloat(node.dataset.value || "0") || 0;
    node.dataset.value = value.toString();

    const controls = animate(startVal, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate(latest) {
        node.textContent = formatter(latest);
      },
    });

    return () => controls.stop();
  }, [value, reducedMotion, formatter]);

  return (
    <span ref={ref} data-value={value}>
      {formatter(value)}
    </span>
  );
}

// ─── KPI Cards Grid ──────────────────────────────────────────────

export function KPICards() {
  const { data, isLoading, isError } = usePortfolio();
  const reducedMotion = useAppReducedMotion();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border/50 bg-card/80 backdrop-blur-sm animate-pulse h-32">
            <CardContent className="p-6" />
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center text-sm text-red-500">
        Error al cargar los KPIs del portfolio.
      </div>
    );
  }

  const { total_value_eur, total_invested, total_pnl, total_pnl_pct, total_assets } = data;

  const kpis = [
    {
      title: "Patrimonio Neto",
      value: total_value_eur,
      change: `${total_pnl >= 0 ? "+" : ""}${total_pnl_pct.toFixed(2)}%`,
      positive: total_pnl >= 0,
      icon: Wallet,
      formatter: (val: number) => formatCurrency(val),
      description: "Valor actual total en EUR",
    },
    {
      title: "Total Invertido",
      value: total_invested,
      change: `${total_assets} activo${total_assets !== 1 ? "s" : ""}`,
      positive: true,
      icon: ShieldCheck,
      formatter: (val: number) => formatCurrency(val),
      description: "Capital inicial depositado",
    },
    {
      title: "P&L Latente",
      value: total_pnl,
      change: `${total_pnl >= 0 ? "+" : ""}${total_pnl_pct.toFixed(2)}%`,
      positive: total_pnl >= 0,
      icon: BarChart3,
      formatter: (val: number) => `${val >= 0 ? "+" : ""}${formatCurrency(val)}`,
      description: "Ganancia/pérdida no realizada",
    },
    {
      title: "ROI del Portfolio",
      value: total_pnl_pct,
      change: `vs coste total`,
      positive: total_pnl_pct >= 0,
      icon: TrendingUp,
      formatter: (val: number) => `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`,
      description: "Retorno sobre la inversión",
    },
  ];

  const containerProps = reducedMotion ? {} : staggerContainer;
  const itemProps = reducedMotion
    ? {}
    : {
        initial: fadeInUp.initial,
        animate: fadeInUp.animate,
        transition: fadeInUp.transition,
      };

  return (
    <m.div
      {...containerProps}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        const isMain = kpi.title === "Patrimonio Neto";
        const isGold = kpi.title === "Total Invertido";

        if (isMain) {
          return (
            <m.div key={index} {...itemProps}>
              <Card className="relative overflow-hidden bg-primary text-primary-foreground border-none shadow-md hover:-translate-y-0.5 transition-all duration-300 group rounded-3xl min-h-[140px]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/75">
                    {kpi.title}
                  </CardTitle>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/10 text-white border border-white/10 group-hover:bg-white/20 transition-all duration-300">
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black tracking-tight text-white">
                    <AnimatedNumber value={kpi.value} formatter={kpi.formatter} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <p className={cn(
                      "text-[10px] font-bold tracking-wide flex items-center gap-0.5 px-1.5 py-0.5 rounded",
                      kpi.positive
                        ? "text-emerald-300 bg-white/5 border border-white/10"
                        : "text-red-300 bg-white/5 border border-white/10"
                    )}>
                      {kpi.positive ? (
                        <TrendingUp className="h-2.5 w-2.5" />
                      ) : (
                        <TrendingDown className="h-2.5 w-2.5" />
                      )}
                      {kpi.change}
                    </p>
                    <span className="text-[9px] text-primary-foreground/60 font-medium truncate">
                      {kpi.description}
                    </span>
                  </div>
                </CardContent>
                <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
              </Card>
            </m.div>
          );
        }

        // Other light-themed cards
        const themeColor = isGold 
          ? "text-amber-600 bg-amber-50 group-hover:bg-amber-100 group-hover:border-amber-200" 
          : (kpi.positive 
              ? "text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100 group-hover:border-emerald-200" 
              : "text-red-600 bg-red-50 group-hover:bg-red-100 group-hover:border-red-200");

        return (
          <m.div key={index} {...itemProps}>
            <Card className="relative overflow-hidden bg-card text-card-foreground border border-sidebar-border/80 shadow-sm hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300 group rounded-3xl min-h-[140px]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                  {kpi.title}
                </CardTitle>
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300 border border-transparent",
                  themeColor
                )}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black tracking-tight text-foreground">
                  <AnimatedNumber value={kpi.value} formatter={kpi.formatter} />
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {kpi.title !== "Total Invertido" ? (
                    <p
                      className={cn(
                        "text-[10px] font-bold tracking-wide flex items-center gap-0.5 px-1.5 py-0.5 rounded",
                        kpi.positive 
                          ? "text-emerald-700 bg-emerald-50 border border-emerald-200" 
                          : "text-red-700 bg-red-50 border border-red-200"
                      )}
                    >
                      {kpi.positive ? (
                        <TrendingUp className="h-2.5 w-2.5" />
                      ) : (
                        <TrendingDown className="h-2.5 w-2.5" />
                      )}
                      {kpi.change}
                    </p>
                  ) : (
                    <p className="text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded text-amber-800 bg-amber-50 border border-amber-200">
                      {kpi.change}
                    </p>
                  )}
                  <span className="text-[9px] text-muted-foreground/60 font-medium truncate">
                    {kpi.description}
                  </span>
                </div>
              </CardContent>
            </Card>
          </m.div>
        );
      })}
    </m.div>
  );
}
