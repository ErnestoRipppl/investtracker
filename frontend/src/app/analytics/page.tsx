"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Brain, Sigma, ArrowUpRight, ArrowDownRight, Coins, Wallet, Percent } from "lucide-react";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import { Recommendations } from "@/components/analytics/recommendations";

interface HoldingPnL {
  ticker: string;
  name: string;
  qty: number;
  coste_medio: number;
  precio_actual: number;
  pnl: number;
  pnl_pct: number;
  weight: number;
  total_invested: number;
  current_value: number;
}

interface BestWorstAsset {
  ticker: string;
  pnl_pct: number;
}

interface AnalyticsData {
  pnl_realizado: number;
  pnl_no_realizado: number;
  retorno_total_pct: number;
  retorno_total_global_pct: number;
  comisiones_totales: number;
  comisiones_detalles: Record<string, number>;
  holdings: HoldingPnL[];
  mejor_activo: BestWorstAsset | null;
  peor_activo: BestWorstAsset | null;
}

export default function AnalyticsPage() {
  const { data, isLoading, isError, error } = useQuery<AnalyticsData>({
    queryKey: ["analytics", "quant"],
    queryFn: () => apiFetch<AnalyticsData>("/api/analytics/quant"),
    staleTime: 30 * 1000, // 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-secondary/50 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/50 bg-card/80 backdrop-blur-sm h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border/50 bg-card/80 h-96" />
          <div className="space-y-6">
            <Card className="border-border/50 bg-card/80 h-44" />
            <Card className="border-border/50 bg-card/80 h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/10 max-w-2xl mx-auto my-12">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h3 className="text-lg font-bold text-destructive">Error al cargar la analítica</h3>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Ocurrió un error inesperado al conectar con el servidor."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
          <Brain className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analítica de Cartera</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Métricas de rentabilidad real, costes operativos de corretaje e impacto por activo
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Retorno Global % */}
        <Card className="border-border/40 bg-card/70 backdrop-blur-md shadow-sm relative overflow-hidden transition-all duration-300 hover:border-border/80">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Retorno Global
              </span>
              <div className={`p-1.5 rounded-lg ${data.retorno_total_global_pct >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <h3 className={`text-2xl font-bold tracking-tight ${data.retorno_total_global_pct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {data.retorno_total_global_pct >= 0 ? "+" : ""}{formatNumber(data.retorno_total_global_pct, 2)}%
              </h3>
              <p className="text-[10px] text-muted-foreground">Histórico (Abiertas + Cerradas)</p>
            </div>
          </CardContent>
        </Card>

        {/* Rentabilidad Abierta % */}
        <Card className="border-border/40 bg-card/70 backdrop-blur-md shadow-sm relative overflow-hidden transition-all duration-300 hover:border-border/80">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Rentabilidad Abierta
              </span>
              <div className={`p-1.5 rounded-lg ${data.retorno_total_pct >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <h3 className={`text-2xl font-bold tracking-tight ${data.retorno_total_pct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {data.retorno_total_pct >= 0 ? "+" : ""}{formatNumber(data.retorno_total_pct, 2)}%
              </h3>
              <p className="text-[10px] text-muted-foreground">Solo posiciones activas</p>
            </div>
          </CardContent>
        </Card>

        {/* P&L No Realizado */}
        <Card className="border-border/40 bg-card/70 backdrop-blur-md shadow-sm relative overflow-hidden transition-all duration-300 hover:border-border/80">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                P&L No Realizado
              </span>
              <div className={`p-1.5 rounded-lg ${data.pnl_no_realizado >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                {data.pnl_no_realizado >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <h3 className={`text-2xl font-bold tracking-tight ${data.pnl_no_realizado >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatCurrency(data.pnl_no_realizado)}
              </h3>
              <p className="text-[10px] text-muted-foreground">Valor actual vs. coste de compra</p>
            </div>
          </CardContent>
        </Card>

        {/* P&L Realizado */}
        <Card className="border-border/40 bg-card/70 backdrop-blur-md shadow-sm relative overflow-hidden transition-all duration-300 hover:border-border/80">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                P&L Realizado
              </span>
              <div className={`p-1.5 rounded-lg ${data.pnl_realizado >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <h3 className={`text-2xl font-bold tracking-tight ${data.pnl_realizado >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatCurrency(data.pnl_realizado)}
              </h3>
              <p className="text-[10px] text-muted-foreground">Operaciones de venta cerradas</p>
            </div>
          </CardContent>
        </Card>

        {/* Comisiones Totales */}
        <Card className="border-border/40 bg-card/70 backdrop-blur-md shadow-sm relative overflow-hidden transition-all duration-300 hover:border-border/80">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Comisiones Totales
              </span>
              <div className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-400">
                <Coins className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                {formatCurrency(data.comisiones_totales)}
              </h3>
              <p className="text-[10px] text-muted-foreground">Costes totales de corretaje</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table of active holdings P&L */}
        <Card className="lg:col-span-2 border-border/40 bg-card/65 backdrop-blur-md shadow-md">
          <CardHeader className="pb-3 border-b border-border/10">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sigma className="h-4 w-4 text-emerald-500" />
              Rendimiento por Activo Abierto
            </CardTitle>
            <CardDescription>
              Detalle de coste de adquisición, precio actual en vivo y peso porcentual
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/10 text-muted-foreground bg-secondary/15 font-semibold">
                    <th className="p-4">Activo</th>
                    <th className="p-4 text-right">Cant. Neta</th>
                    <th className="p-4 text-right">Coste Medio</th>
                    <th className="p-4 text-right">Precio Actual</th>
                    <th className="p-4 text-right">P&L Latente</th>
                    <th className="p-4 text-right">Peso Cartera</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/5">
                  {data.holdings.map((h) => (
                    <tr key={h.ticker} className="hover:bg-secondary/10 transition-colors duration-150">
                      <td className="p-4">
                        <div className="font-bold text-foreground">{h.ticker}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{h.name}</div>
                      </td>
                      <td className="p-4 text-right font-mono font-medium">
                        {formatNumber(h.qty, 4)}
                      </td>
                      <td className="p-4 text-right font-mono">
                        {formatCurrency(h.coste_medio)}
                      </td>
                      <td className="p-4 text-right font-mono">
                        {formatCurrency(h.precio_actual)}
                      </td>
                      <td className={`p-4 text-right font-mono font-bold ${h.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        <div>{h.pnl >= 0 ? "+" : ""}{formatCurrency(h.pnl)}</div>
                        <div className="text-[10px] font-normal font-sans">
                          {h.pnl >= 0 ? "+" : ""}{formatNumber(h.pnl_pct, 2)}%
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono font-medium">
                        {formatPercent(h.weight, 2)}
                      </td>
                    </tr>
                  ))}
                  {data.holdings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No hay activos activos en cartera actualmente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Right side widgets */}
        <div className="space-y-6">
          {/* Best/Worst Performing */}
          <Card className="border-border/40 bg-card/65 backdrop-blur-md shadow-md">
            <CardHeader className="pb-3 border-b border-border/10">
              <CardTitle className="text-base font-semibold">Mejor y Peor Activo</CardTitle>
              <CardDescription>Por rendimiento latente acumulado</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Mejor activo */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Mejor activo</div>
                  <div className="font-extrabold text-base text-foreground">
                    {data.mejor_activo ? data.mejor_activo.ticker : "Ninguno"}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-sm font-extrabold text-emerald-500">
                    <ArrowUpRight className="h-4 w-4" />
                    {data.mejor_activo ? `${formatNumber(data.mejor_activo.pnl_pct, 2)}%` : "0,00%"}
                  </span>
                </div>
              </div>

              {/* Peor activo */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">Peor activo</div>
                  <div className="font-extrabold text-base text-foreground">
                    {data.peor_activo ? data.peor_activo.ticker : "Ninguno"}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-sm font-extrabold text-red-500">
                    <ArrowDownRight className="h-4 w-4" />
                    {data.peor_activo ? `${formatNumber(data.peor_activo.pnl_pct, 2)}%` : "0,00%"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commissions Breakdown */}
          <Card className="border-border/40 bg-card/65 backdrop-blur-md shadow-md">
            <CardHeader className="pb-3 border-b border-border/10">
              <CardTitle className="text-base font-semibold">Comisiones por Ticker</CardTitle>
              <CardDescription>Desglose de gastos cobrados en operaciones</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {Object.entries(data.comisiones_detalles).map(([ticker, val]) => (
                  <div key={ticker} className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground">{ticker}</span>
                    <span className="font-mono text-muted-foreground">{formatCurrency(val)}</span>
                  </div>
                ))}
                {Object.keys(data.comisiones_detalles).length === 0 && (
                  <div className="text-center text-muted-foreground py-4 text-xs">
                    No se han registrado comisiones.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="pt-6 border-t border-border/10">
        <Recommendations />
      </div>
    </div>
  );
}
