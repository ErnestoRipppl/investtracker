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
        return (
          <m.div key={index} {...itemProps}>
            <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/30 transition-colors duration-300 group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  <AnimatedNumber value={kpi.value} formatter={kpi.formatter} />
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {kpi.title !== "Total Invertido" ? (
                    <p
                      className={cn(
                        "text-xs font-semibold flex items-center gap-0.5",
                        kpi.positive ? "text-emerald-500" : "text-red-500"
                      )}
                    >
                      {kpi.positive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {kpi.change}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground font-medium">
                      {kpi.change}
                    </p>
                  )}
                  <span className="text-[10px] text-muted-foreground/60 font-normal">
                    — {kpi.description}
                  </span>
                </div>
              </CardContent>
              {/* Premium bottom border accent */}
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Card>
          </m.div>
        );
      })}
    </m.div>
  );
}
