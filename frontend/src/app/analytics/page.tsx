"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, Brain, Sigma, ArrowUpRight, ArrowDownRight, 
  Scale, TrendingUp, Flame, Info, CheckCircle2, Calculator 
} from "lucide-react";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter
} from "recharts";

// Interfaces for Tab 1 (Quant P&L)
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

// Interfaces for Tab 2 (Rebalancing)
interface RebalanceAction {
  ticker: string;
  action: "COMPRA" | "VENTA" | "MANTENER";
  amount: number;
  units: number;
}

interface RebalanceData {
  portfolio_value: number;
  profile_allocations: {
    renta_variable: number;
    renta_fija: number;
    alternativos: number;
    liquidez: number;
  };
  current_allocations: {
    renta_variable: number;
    renta_fija: number;
    alternativos: number;
    liquidez: number;
  };
  allocation_percentages: {
    renta_variable: number;
    renta_fija: number;
    alternativos: number;
    liquidez: number;
  };
  actions: RebalanceAction[];
}

// Interfaces for Tab 3 (Backtesting)
interface BacktestMetrics {
  final_value: number;
  cagr: number;
  volatility: number;
  sharpe: number;
  max_drawdown: number;
}

interface BacktestHistoryPoint {
  date: string;
  portfolio_val: number;
  target_val: number;
  benchmark_val: number;
}

interface BacktestData {
  years: number;
  metrics: {
    portfolio: BacktestMetrics;
    target: BacktestMetrics;
    benchmark: BacktestMetrics;
  };
  history: BacktestHistoryPoint[];
}

// Interfaces for Tab 4 (Markowitz Optimization)
interface OptimizePortfolioResult {
  expected_return: number;
  volatility: number;
  sharpe_ratio: number;
  weights: Record<string, number>;
}

interface OptimizeData {
  msr: OptimizePortfolioResult;
  min_vol: OptimizePortfolioResult;
  user_portfolio: {
    expected_return: number;
    volatility: number;
    sharpe_ratio: number;
  };
  frontier: { volatility: number; return: number }[];
}

// Interfaces for Tab 5 (Correlation Matrix)
interface CorrelationData {
  labels: string[];
  matrix: number[][];
}

// Interfaces for Tab 6 (FIFO Tax Simulator)
interface TaxLot {
  buy_date: string;
  buy_price: number;
  qty: number;
  cost: number;
  proceeds: number;
  gain: number;
  days_held: number;
}

interface TaxSimulatorData {
  warning?: string;
  error?: string;
  ticker: string;
  quantity: number;
  price: number;
  total_proceeds: number;
  total_cost: number;
  net_gain: number;
  estimated_tax: number;
  lots: TaxLot[];
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = React.useState<string>("quant");

  // Tab 3 state
  const [backtestYears, setBacktestYears] = React.useState<number>(5);

  // Tab 6 state
  const [taxTicker, setTaxTicker] = React.useState<string>("");
  const [taxQty, setTaxQty] = React.useState<string>("10");
  const [taxPrice, setTaxPrice] = React.useState<string>("100");

  // React Queries for each tab
  const { data: quantData, isLoading: isQuantLoading, isError: isQuantError } = useQuery<AnalyticsData>({
    queryKey: ["analytics", "quant"],
    queryFn: () => apiFetch<AnalyticsData>("/api/analytics/quant"),
    staleTime: 30 * 1000,
  });

  const { data: rebalanceData } = useQuery<RebalanceData>({
    queryKey: ["analytics", "rebalance"],
    queryFn: () => apiFetch<RebalanceData>("/api/analytics/rebalance"),
    enabled: activeTab === "rebalance",
    staleTime: 60 * 1000,
  });

  const { data: backtestData, isLoading: isBacktestLoading } = useQuery<BacktestData>({
    queryKey: ["analytics", "backtest", backtestYears],
    queryFn: () => apiFetch<BacktestData>(`/api/analytics/backtest?years=${backtestYears}`),
    enabled: activeTab === "backtest",
    staleTime: 5 * 60 * 1000,
  });

  const { data: optimizeData } = useQuery<OptimizeData>({
    queryKey: ["analytics", "optimize"],
    queryFn: () => apiFetch<OptimizeData>("/api/analytics/optimize"),
    enabled: activeTab === "optimize",
    staleTime: 5 * 60 * 1000,
  });

  const { data: correlationData } = useQuery<CorrelationData>({
    queryKey: ["analytics", "correlation"],
    queryFn: () => apiFetch<CorrelationData>("/api/analytics/correlation"),
    enabled: activeTab === "correlation",
    staleTime: 5 * 60 * 1000,
  });

  // Calculate parameters for tax query
  const queryQtyNum = parseFloat(taxQty) || 0;
  const queryPriceNum = parseFloat(taxPrice) || 0;

  const { data: taxData, isLoading: isTaxLoading } = useQuery<TaxSimulatorData>({
    queryKey: ["analytics", "tax", taxTicker, queryQtyNum, queryPriceNum],
    queryFn: () => apiFetch<TaxSimulatorData>(`/api/analytics/tax-simulator?ticker=${taxTicker}&quantity=${queryQtyNum}&price=${queryPriceNum}`),
    enabled: activeTab === "tax" && !!taxTicker && queryQtyNum > 0 && queryPriceNum > 0,
    staleTime: 5000,
  });

  // Automatically select first ticker when quantData is loaded
  React.useEffect(() => {
    if (quantData && quantData.holdings.length > 0 && !taxTicker) {
      setTaxTicker(quantData.holdings[0].ticker);
    }
  }, [quantData, taxTicker]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
          <Brain className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analítica Cuantitativa Avanzada</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Analiza el rebalanceo, backtesting histórico, frontera eficiente y optimización fiscal FIFO de tu cartera
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
        <TabsList className="bg-muted/50 p-1 border border-border/10 rounded-xl flex flex-wrap gap-1 md:inline-flex w-full md:w-auto h-auto">
          <TabsTrigger value="quant" className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-1 md:flex-initial">
            Rendimiento y Costes
          </TabsTrigger>
          <TabsTrigger value="rebalance" className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-1 md:flex-initial">
            Rebalanceo
          </TabsTrigger>
          <TabsTrigger value="backtest" className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-1 md:flex-initial">
            Backtesting
          </TabsTrigger>
          <TabsTrigger value="optimize" className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-1 md:flex-initial">
            Optimización (Markowitz)
          </TabsTrigger>
          <TabsTrigger value="correlation" className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-1 md:flex-initial">
            Correlación
          </TabsTrigger>
          <TabsTrigger value="tax" className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-1 md:flex-initial">
            Simulador Fiscal (FIFO)
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Quant Rendimiento y Costes */}
        <TabsContent value="quant" className="space-y-6 outline-none">
          {isQuantLoading ? (
            <div className="h-96 w-full bg-secondary/10 rounded-xl animate-pulse" />
          ) : isQuantError || !quantData ? (
            <Card className="border-destructive/20 bg-destructive/5 text-center p-6 text-destructive-foreground">
              <AlertCircle className="h-10 w-10 mx-auto mb-2 text-destructive" />
              Error al cargar los datos cuantitativos.
            </Card>
          ) : (
            <div className="space-y-6">
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Card className="border-border/40 bg-card/70 shadow-sm">
                  <CardContent className="p-6">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Retorno Global</span>
                    <h3 className={`text-xl font-bold font-mono mt-2 ${quantData.retorno_total_global_pct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {quantData.retorno_total_global_pct >= 0 ? "+" : ""}{formatNumber(quantData.retorno_total_global_pct, 2)}%
                    </h3>
                    <p className="text-[9px] text-muted-foreground mt-1">Abiertas + Cerradas</p>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/70 shadow-sm">
                  <CardContent className="p-6">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Retorno Posiciones Abiertas</span>
                    <h3 className={`text-xl font-bold font-mono mt-2 ${quantData.retorno_total_pct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {quantData.retorno_total_pct >= 0 ? "+" : ""}{formatNumber(quantData.retorno_total_pct, 2)}%
                    </h3>
                    <p className="text-[9px] text-muted-foreground mt-1">Activos en cartera</p>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/70 shadow-sm">
                  <CardContent className="p-6">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">P&L No Realizado</span>
                    <h3 className={`text-xl font-bold font-mono mt-2 ${quantData.pnl_no_realizado >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {quantData.pnl_no_realizado >= 0 ? "+" : ""}{formatCurrency(quantData.pnl_no_realizado)}
                    </h3>
                    <p className="text-[9px] text-muted-foreground mt-1">Ganancia latente</p>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/70 shadow-sm">
                  <CardContent className="p-6">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">P&L Realizado</span>
                    <h3 className={`text-xl font-bold font-mono mt-2 ${quantData.pnl_realizado >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {quantData.pnl_realizado >= 0 ? "+" : ""}{formatCurrency(quantData.pnl_realizado)}
                    </h3>
                    <p className="text-[9px] text-muted-foreground mt-1">Ventas cerradas</p>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/70 shadow-sm">
                  <CardContent className="p-6">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Comisiones Totales</span>
                    <h3 className="text-xl font-bold font-mono mt-2 text-foreground">
                      {formatCurrency(quantData.comisiones_totales)}
                    </h3>
                    <p className="text-[9px] text-muted-foreground mt-1">Gastos de corretaje</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-border/40 bg-card/65 backdrop-blur-md shadow-md">
                  <CardHeader className="pb-3 border-b border-border/10">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Sigma className="h-4 w-4 text-emerald-500" />
                      Rendimiento por Activo Abierto
                    </CardTitle>
                    <CardDescription>Detalle de coste de adquisición, precio actual en vivo y peso porcentual</CardDescription>
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
                          {quantData.holdings.map((h) => (
                            <tr key={h.ticker} className="hover:bg-secondary/10 transition-colors duration-150">
                              <td className="p-4">
                                <div className="font-bold text-foreground">{h.ticker}</div>
                                <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{h.name}</div>
                              </td>
                              <td className="p-4 text-right font-mono font-medium">{formatNumber(h.qty, 4)}</td>
                              <td className="p-4 text-right font-mono">{formatCurrency(h.coste_medio)}</td>
                              <td className="p-4 text-right font-mono">{formatCurrency(h.precio_actual)}</td>
                              <td className={`p-4 text-right font-mono font-bold ${h.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                <div>{h.pnl >= 0 ? "+" : ""}{formatCurrency(h.pnl)}</div>
                                <div className="text-[10px] font-normal font-sans">{h.pnl >= 0 ? "+" : ""}{formatNumber(h.pnl_pct, 2)}%</div>
                              </td>
                              <td className="p-4 text-right font-mono font-medium">{formatPercent(h.weight, 2)}</td>
                            </tr>
                          ))}
                          {quantData.holdings.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                No hay posiciones abiertas registradas en cartera.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="border-border/40 bg-card/65 backdrop-blur-md shadow-md">
                    <CardHeader className="pb-3 border-b border-border/10">
                      <CardTitle className="text-base font-semibold">Mejor y Peor Activo</CardTitle>
                      <CardDescription>Por rendimiento latente acumulado</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Mejor activo</div>
                          <div className="font-extrabold text-base text-foreground">
                            {quantData.mejor_activo ? quantData.mejor_activo.ticker : "Ninguno"}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-sm font-extrabold text-emerald-500">
                            <ArrowUpRight className="h-4 w-4" />
                            {quantData.mejor_activo ? `${formatNumber(quantData.mejor_activo.pnl_pct, 2)}%` : "0,00%"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">Peor activo</div>
                          <div className="font-extrabold text-base text-foreground">
                            {quantData.peor_activo ? quantData.peor_activo.ticker : "Ninguno"}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-sm font-extrabold text-red-500">
                            <ArrowDownRight className="h-4 w-4" />
                            {quantData.peor_activo ? `${formatNumber(quantData.peor_activo.pnl_pct, 2)}%` : "0,00%"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/40 bg-card/65 backdrop-blur-md shadow-md">
                    <CardHeader className="pb-3 border-b border-border/10">
                      <CardTitle className="text-base font-semibold">Comisiones por Ticker</CardTitle>
                      <CardDescription>Gastos acumulados de corretaje cobrados</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        {Object.entries(quantData.comisiones_detalles).map(([ticker, val]) => (
                          <div key={ticker} className="flex justify-between items-center text-xs">
                            <span className="font-bold text-foreground">{ticker}</span>
                            <span className="font-mono text-muted-foreground">{formatCurrency(val)}</span>
                          </div>
                        ))}
                        {Object.keys(quantData.comisiones_detalles).length === 0 && (
                          <div className="text-center text-muted-foreground py-4 text-xs">
                            No se han cobrado comisiones en tus transacciones.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Rebalanceo */}
        <TabsContent value="rebalance" className="outline-none">
          {!rebalanceData ? (
            <div className="h-96 w-full bg-secondary/10 rounded-xl animate-pulse" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Target allocation vs Current allocation comparison table */}
              <Card className="lg:col-span-8 border-border/40 bg-card/65 backdrop-blur-md shadow-md">
                <CardHeader className="pb-3 border-b border-border/10">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Scale className="h-4 w-4 text-primary" />
                    Comparativa de Asignaciones por Perfil
                  </CardTitle>
                  <CardDescription>Evaluación por tipo de activo según tu tolerancia de perfil inversor</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/10 text-muted-foreground bg-secondary/15 font-semibold">
                          <th className="p-4">Categoría</th>
                          <th className="p-4 text-right">Asignación Actual</th>
                          <th className="p-4 text-right">Actual %</th>
                          <th className="p-4 text-right">Sugerido por Perfil</th>
                          <th className="p-4 text-right">Desviación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/5">
                        {Object.keys(rebalanceData.profile_allocations).map((catKey) => {
                          const catName = catKey.replace("_", " ");
                          const actualVal = rebalanceData.current_allocations[catKey as keyof typeof rebalanceData.current_allocations] || 0;
                          const actualPct = rebalanceData.allocation_percentages[catKey as keyof typeof rebalanceData.allocation_percentages] || 0;
                          const targetPct = rebalanceData.profile_allocations[catKey as keyof typeof rebalanceData.profile_allocations] || 0;
                          const devPct = actualPct - targetPct;

                          return (
                            <tr key={catKey} className="hover:bg-secondary/10 transition-colors duration-150">
                              <td className="p-4 font-semibold capitalize text-foreground">{catName}</td>
                              <td className="p-4 text-right font-mono">{formatCurrency(actualVal)}</td>
                              <td className="p-4 text-right font-mono font-medium">{formatNumber(actualPct, 2)}%</td>
                              <td className="p-4 text-right font-mono font-medium">{formatNumber(targetPct, 2)}%</td>
                              <td className={`p-4 text-right font-mono font-bold ${Math.abs(devPct) < 2.0 ? "text-muted-foreground" : devPct > 0 ? "text-red-500" : "text-amber-500"}`}>
                                {devPct > 0 ? "+" : ""}{formatNumber(devPct, 2)}%
                                {Math.abs(devPct) >= 2.0 && (
                                  <span className="text-[9px] font-semibold ml-1 font-sans">
                                    ({devPct > 0 ? "SOBRECARGADA" : "INFRAVALORADA"})
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Actions recommendations */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-border/40 bg-card/65 backdrop-blur-md shadow-md">
                  <CardHeader className="pb-3 border-b border-border/10">
                    <CardTitle className="text-base font-semibold">Operaciones de Rebalanceo</CardTitle>
                    <CardDescription>Transacciones sugeridas para equilibrar tu riesgo</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {rebalanceData.actions.map((act) => {
                        const badgeColor =
                          act.action === "COMPRA"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : act.action === "VENTA"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
                        
                        return (
                          <div key={act.ticker} className="flex justify-between items-center p-2.5 rounded-lg border border-border/30 bg-background/40">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Badge className={badgeColor} variant="outline">
                                  {act.action}
                                </Badge>
                                <span className="text-xs font-bold text-foreground">{act.ticker}</span>
                              </div>
                              {act.units > 0 && (
                                <p className="text-[9px] text-muted-foreground mt-0.5">Est. {act.units} uds</p>
                              )}
                            </div>
                            <span className="text-xs font-bold font-mono text-foreground">
                              {act.amount > 0 ? `${formatCurrency(act.amount)}` : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground leading-normal flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    El rebalanceo automático te ayuda a comprar activos infravalorados y recoger ganancias en activos sobreponderados, garantizando que el riesgo real de tu patrimonio siga alineado a tu horizonte y perfil inversor.
                  </span>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Backtesting */}
        <TabsContent value="backtest" className="outline-none">
          {isBacktestLoading && !backtestData ? (
            <div className="h-96 w-full bg-secondary/10 rounded-xl animate-pulse" />
          ) : !backtestData ? (
            <div className="h-96 w-full bg-secondary/10 rounded-xl animate-pulse" />
          ) : (
            <div className="space-y-6">
              {/* Control Panel */}
              <div className="flex items-center gap-4 justify-between bg-muted/30 border border-border/10 p-4 rounded-xl">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Horizonte Histórico</h4>
                  <p className="text-[11px] text-muted-foreground">Selecciona el periodo retrospectivo para la simulación</p>
                </div>
                <div className="flex gap-1.5">
                  {[1, 3, 5, 10].map((y) => (
                    <Button
                      key={y}
                      onClick={() => setBacktestYears(y)}
                      variant={backtestYears === y ? "default" : "outline"}
                      className="h-8 text-xs font-bold px-3"
                    >
                      {y} {y === 1 ? "año" : "años"}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Growth Chart */}
                <Card className="lg:col-span-8 border-border/40 bg-card/65 backdrop-blur-md shadow-md">
                  <CardHeader className="pb-3 border-b border-border/10">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Evolución de Inversión Inicial (€10,000)
                    </CardTitle>
                    <CardDescription>Crecimiento acumulado comparando tu cartera, el perfil objetivo y el MSCI World</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={backtestData.history} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            stroke="rgba(255,255,255,0.4)" 
                            fontSize={9} 
                            tickLine={false} 
                            interval={Math.floor(backtestData.history.length / 5)}
                          />
                          <YAxis 
                            stroke="rgba(255,255,255,0.4)" 
                            fontSize={9} 
                            tickLine={false}
                            tickFormatter={(val) => `${(val / 1000).toFixed(0)}k €`}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "rgba(9,9,11,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "11px" }}
                            labelClassName="text-muted-foreground font-bold"
                          />
                          <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} />
                          <Line type="monotone" dataKey="portfolio_val" stroke="#10b981" strokeWidth={2.5} name="Mi Cartera" dot={false} />
                          <Line type="monotone" dataKey="target_val" stroke="#3b82f6" strokeWidth={2.5} name="Sugerido Perfil" dot={false} />
                          <Line type="monotone" dataKey="benchmark_val" stroke="#a855f7" strokeWidth={2} name="Benchmark (MSCI World)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Metrics Table */}
                <Card className="lg:col-span-4 border-border/40 bg-card/65 backdrop-blur-md shadow-md">
                  <CardHeader className="pb-3 border-b border-border/10">
                    <CardTitle className="text-base font-semibold">Métricas de Retorno y Riesgo</CardTitle>
                    <CardDescription>Estadísticas del comportamiento histórico</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border/10 text-muted-foreground bg-secondary/15 font-semibold">
                            <th className="p-3">Métrica</th>
                            <th className="p-3 text-emerald-400">Mi Cartera</th>
                            <th className="p-3 text-blue-400">Objetivo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/5">
                          <tr className="hover:bg-secondary/5">
                            <td className="p-3 font-semibold">CAGR (Retorno Anual)</td>
                            <td className="p-3 font-mono">{formatPercent(backtestData.metrics.portfolio.cagr, 2)}</td>
                            <td className="p-3 font-mono">{formatPercent(backtestData.metrics.target.cagr, 2)}</td>
                          </tr>
                          <tr className="hover:bg-secondary/5">
                            <td className="p-3 font-semibold">Volatilidad Anual</td>
                            <td className="p-3 font-mono">{formatPercent(backtestData.metrics.portfolio.volatility, 2)}</td>
                            <td className="p-3 font-mono">{formatPercent(backtestData.metrics.target.volatility, 2)}</td>
                          </tr>
                          <tr className="hover:bg-secondary/5">
                            <td className="p-3 font-semibold">Sharpe Ratio</td>
                            <td className="p-3 font-mono">{formatNumber(backtestData.metrics.portfolio.sharpe, 2)}</td>
                            <td className="p-3 font-mono">{formatNumber(backtestData.metrics.target.sharpe, 2)}</td>
                          </tr>
                          <tr className="hover:bg-secondary/5">
                            <td className="p-3 font-semibold">Caída Máxima (Drawdown)</td>
                            <td className="p-3 font-mono text-red-400">{formatPercent(backtestData.metrics.portfolio.max_drawdown, 2)}</td>
                            <td className="p-3 font-mono text-red-400">{formatPercent(backtestData.metrics.target.max_drawdown, 2)}</td>
                          </tr>
                          <tr className="hover:bg-secondary/5">
                            <td className="p-3 font-semibold">Valor Final</td>
                            <td className="p-3 font-mono font-bold">{formatCurrency(backtestData.metrics.portfolio.final_value)}</td>
                            <td className="p-3 font-mono font-bold">{formatCurrency(backtestData.metrics.target.final_value)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Markowitz Optimization */}
        <TabsContent value="optimize" className="outline-none">
          {!optimizeData ? (
            <div className="h-96 w-full bg-secondary/10 rounded-xl animate-pulse" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Scatter chart with Efficient Frontier */}
              <Card className="lg:col-span-7 border-border/40 bg-card/65 backdrop-blur-md shadow-md">
                <CardHeader className="pb-3 border-b border-border/10">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Flame className="h-4 w-4 text-amber-500" />
                    Curva de Frontera Eficiente de Markowitz
                  </CardTitle>
                  <CardDescription>Espacio de rentabilidad esperada vs. volatilidad simulada</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis 
                          type="number" 
                          dataKey="volatility" 
                          name="Volatilidad" 
                          unit="%" 
                          stroke="rgba(255,255,255,0.4)" 
                          fontSize={9}
                          domain={['auto', 'auto']}
                          tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="return" 
                          name="Retorno Esperado" 
                          unit="%" 
                          stroke="rgba(255,255,255,0.4)" 
                          fontSize={9}
                          domain={['auto', 'auto']}
                          tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                        />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          contentStyle={{ backgroundColor: "rgba(9,9,11,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "11px" }}
                          formatter={(value, name) => [`${(Number(value) * 100).toFixed(2)}%`, name]}
                        />
                        <Scatter name="Frontera de Carteras" data={optimizeData.frontier} fill="#71717a" fillOpacity={0.2} line shape="circle" />
                        
                        {/* Highlights MSR */}
                        <Scatter name="Max Sharpe (Óptimo)" data={[{ volatility: optimizeData.msr.volatility, return: optimizeData.msr.expected_return }]} fill="#10b981" shape="star" z={100} />
                        
                        {/* Highlights MinVol */}
                        <Scatter name="Mínima Volatilidad" data={[{ volatility: optimizeData.min_vol.volatility, return: optimizeData.min_vol.expected_return }]} fill="#3b82f6" shape="triangle" z={100} />
                        
                        {/* Highlights User */}
                        <Scatter name="Mi Cartera" data={[{ volatility: optimizeData.user_portfolio.volatility, return: optimizeData.user_portfolio.expected_return }]} fill="#f59e0b" shape="cross" z={100} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 text-[10px] text-muted-foreground mt-2">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-500" /> Carteras Monte Carlo</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-emerald-500 rotate-45" /> Máx. Sharpe ({formatNumber(optimizeData.msr.sharpe_ratio, 2)})</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-blue-500 rounded-none" /> Mín. Vol ({formatPercent(optimizeData.min_vol.volatility, 1)})</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-amber-500 rounded-full" /> Mi Cartera</span>
                  </div>
                </CardContent>
              </Card>

              {/* Optimization portfolios weights comparison */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="border-border/40 bg-card/65 backdrop-blur-md shadow-md">
                  <CardHeader className="pb-3 border-b border-border/10">
                    <CardTitle className="text-base font-semibold">Comparativa de Pesos Óptimos</CardTitle>
                    <CardDescription>Ponderación matemática de carteras eficientes</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border/10 text-muted-foreground bg-secondary/15 font-semibold">
                            <th className="p-3">Activo</th>
                            <th className="p-3 text-right">Max Sharpe (MSR)</th>
                            <th className="p-3 text-right">Min Volatilidad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/5">
                          {Object.keys(optimizeData.msr.weights).map((ticker) => (
                            <tr key={ticker} className="hover:bg-secondary/5">
                              <td className="p-3 font-bold text-foreground">{ticker}</td>
                              <td className="p-3 text-right font-mono">{formatPercent(optimizeData.msr.weights[ticker], 1)}</td>
                              <td className="p-3 text-right font-mono">{formatPercent(optimizeData.min_vol.weights[ticker], 1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 5: Correlation Matrix */}
        <TabsContent value="correlation" className="outline-none">
          {!correlationData ? (
            <div className="h-96 w-full bg-secondary/10 rounded-xl animate-pulse" />
          ) : (
            <Card className="border-border/40 bg-card/65 backdrop-blur-md shadow-md max-w-4xl mx-auto">
              <CardHeader className="pb-3 border-b border-border/10">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sigma className="h-4 w-4 text-primary" />
                  Matriz de Correlación de Pearson (Histórica)
                </CardTitle>
                <CardDescription>Mide el grado de acoplamiento de tus activos en los últimos 12 meses</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="overflow-x-auto flex justify-center py-4">
                  <div className="inline-block border border-border/10 rounded-lg overflow-hidden">
                    <table className="text-center text-xs border-collapse">
                      <thead>
                        <tr className="bg-secondary/15 font-semibold text-muted-foreground border-b border-border/10">
                          <th className="p-3 border-r border-border/10">Activo</th>
                          {correlationData.labels.map((lbl) => (
                            <th key={lbl} className="p-3 font-bold text-foreground w-20">{lbl}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {correlationData.labels.map((lblRow, idxRow) => (
                          <tr key={lblRow} className="border-b border-border/5">
                            <td className="p-3 font-bold text-foreground text-left bg-secondary/5 border-r border-border/10">
                              {lblRow}
                            </td>
                            {correlationData.labels.map((lblCol, idxCol) => {
                              const val = correlationData.matrix[idxRow][idxCol];
                              
                              // Determine background color based on correlation strength
                              let bgStyle = { backgroundColor: "rgba(255,255,255,0.02)" };
                              let textColor = "text-muted-foreground";
                              
                              if (val > 0.5) {
                                bgStyle = { backgroundColor: `rgba(59, 130, 246, ${val * 0.4})` }; // blue
                                textColor = "text-blue-200 font-bold";
                              } else if (val < -0.1) {
                                bgStyle = { backgroundColor: `rgba(239, 68, 68, ${Math.abs(val) * 0.4})` }; // red
                                textColor = "text-red-200 font-bold";
                              } else if (val >= 0.1 && val <= 0.5) {
                                bgStyle = { backgroundColor: `rgba(16, 185, 129, ${val * 0.25})` }; // green
                                textColor = "text-emerald-200";
                              }
                              
                              return (
                                <td 
                                  key={lblCol} 
                                  style={bgStyle} 
                                  className={`p-3 font-mono text-center border-r border-border/5 text-[11px] ${textColor}`}
                                  title={`${lblRow} y ${lblCol}: ${formatNumber(val, 4)}`}
                                >
                                  {val === 1.0 ? "1.00" : formatNumber(val, 2)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] text-muted-foreground mt-4 pt-4 border-t border-border/10">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-6 rounded bg-blue-500/35 border border-blue-500/20" />
                    <span><strong>Positiva Fuerte (&gt;0.5)</strong>: Se mueven acoplados. Poca diversificación cruzada.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-6 rounded bg-emerald-500/20 border border-emerald-500/10" />
                    <span><strong>Positiva Moderada (0.1 - 0.5)</strong>: Movimientos desvinculados. Diversificación útil.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-6 rounded bg-red-500/30 border border-red-500/10" />
                    <span><strong>Negativa (&lt;-0.1)</strong>: Cobertura protectora. Actúa como refugio directo.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 6: FIFO Tax Simulator */}
        <TabsContent value="tax" className="outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Form Card */}
            <Card className="lg:col-span-4 border-border/40 bg-card/65 backdrop-blur-md shadow-md h-fit">
              <CardHeader className="pb-3 border-b border-border/10">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  Simulador Fiscal FIFO
                </CardTitle>
                <CardDescription>Simula ventas estimando impuestos españoles de rentas de ahorro</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Activo a Vender</span>
                  <Select value={taxTicker} onValueChange={setTaxTicker}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Seleccionar activo" />
                    </SelectTrigger>
                    <SelectContent>
                      {quantData?.holdings.map((h) => (
                        <SelectItem key={h.ticker} value={h.ticker}>
                          {h.ticker} — {h.name} (Disponibles: {formatNumber(h.qty, 2)})
                        </SelectItem>
                      ))}
                      {(!quantData || quantData.holdings.length === 0) && (
                        <SelectItem value="EUNL">EUNL — iShares MSCI World</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Cantidad de Títulos</span>
                  <Input 
                    type="number" 
                    value={taxQty} 
                    onChange={(e) => setTaxQty(e.target.value)} 
                    placeholder="10" 
                    className="h-9 text-xs font-mono" 
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Precio de Venta Unitario (€)</span>
                  <Input 
                    type="number" 
                    value={taxPrice} 
                    onChange={(e) => setTaxPrice(e.target.value)} 
                    placeholder="120" 
                    className="h-9 text-xs font-mono" 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Results Card */}
            <div className="lg:col-span-8 space-y-6">
              {isTaxLoading ? (
                <div className="h-[400px] w-full bg-secondary/10 rounded-xl animate-pulse" />
              ) : !taxData ? (
                <Card className="p-6 text-center text-muted-foreground border-dashed">
                  Introduce datos válidos a la izquierda y pulsa calcular para iniciar el simulador fiscal.
                </Card>
              ) : taxData.error || taxData.warning ? (
                <Card className="border-amber-500/20 bg-amber-500/5 p-6 text-center">
                  <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-amber-400">{taxData.error || taxData.warning}</p>
                </Card>
              ) : (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  {/* Tax KPIs */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <Card className="border-border/40 bg-card/75 shadow-sm">
                      <CardContent className="p-5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Venta</span>
                        <h4 className="text-base font-bold font-mono mt-1 text-foreground">{formatCurrency(taxData.total_proceeds)}</h4>
                      </CardContent>
                    </Card>

                    <Card className="border-border/40 bg-card/75 shadow-sm">
                      <CardContent className="p-5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Coste Compra FIFO</span>
                        <h4 className="text-base font-bold font-mono mt-1 text-foreground">{formatCurrency(taxData.total_cost)}</h4>
                      </CardContent>
                    </Card>

                    <Card className="border-border/40 bg-card/75 shadow-sm">
                      <CardContent className="p-5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ganancia Neta</span>
                        <h4 className={`text-base font-bold font-mono mt-1 ${taxData.net_gain >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {taxData.net_gain >= 0 ? "+" : ""}{formatCurrency(taxData.net_gain)}
                        </h4>
                      </CardContent>
                    </Card>

                    <Card className="border-border/40 bg-card/75 shadow-sm">
                      <CardContent className="p-5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Impuesto Estimado</span>
                        <h4 className="text-base font-bold font-mono mt-1 text-red-400">{formatCurrency(taxData.estimated_tax)}</h4>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Liquidated lots table */}
                  <Card className="border-border/40 bg-card/65 backdrop-blur-md shadow-md">
                    <CardHeader className="pb-3 border-b border-border/10">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Desglose Cronológico de Lotes Liquidados (FIFO)
                      </CardTitle>
                      <CardDescription>Indica qué compras históricas se consumen al realizar esta venta</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-border/10 text-muted-foreground bg-secondary/15 font-semibold">
                              <th className="p-3">Fecha Compra</th>
                              <th className="p-3 text-right">Precio Compra</th>
                              <th className="p-3 text-right">Títulos</th>
                              <th className="p-3 text-right">Coste Adq.</th>
                              <th className="p-3 text-right">Plusvalía</th>
                              <th className="p-3 text-right">Periodo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/5">
                            {taxData.lots.map((lot, idx) => (
                              <tr key={idx} className="hover:bg-secondary/5">
                                <td className="p-3 font-medium text-foreground">{lot.buy_date}</td>
                                <td className="p-3 text-right font-mono">{formatCurrency(lot.buy_price)}</td>
                                <td className="p-3 text-right font-mono">{formatNumber(lot.qty, 4)}</td>
                                <td className="p-3 text-right font-mono">{formatCurrency(lot.cost)}</td>
                                <td className={`p-3 text-right font-mono font-semibold ${lot.gain >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                  {lot.gain >= 0 ? "+" : ""}{formatCurrency(lot.gain)}
                                </td>
                                <td className="p-3 text-right text-muted-foreground">
                                  {lot.days_held >= 365 ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" variant="outline">
                                      &gt;1 año
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20" variant="outline">
                                      Corto plazo
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
