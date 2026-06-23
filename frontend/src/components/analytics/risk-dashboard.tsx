"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useActiveProfile } from "@/hooks/use-profile";
import { usePortfolioHistory } from "@/hooks/use-portfolio";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  Info,
} from "lucide-react";
import { formatPercent, formatDate } from "@/lib/utils";

export interface RiskMetricItem {
  value: number;
  formula_id: string;
  formula_name: string;
  formula_latex: string;
  category: string;
  interpretation: string;
  recommendation: string;
  confidence_level: string;
  inputs_used: Record<string, unknown>;
  description: string;
}

export interface RiskMetricsData {
  var_parametric: RiskMetricItem;
  var_historical: RiskMetricItem;
  cvar: RiskMetricItem;
  max_drawdown: RiskMetricItem;
  volatility: RiskMetricItem;
  beta: RiskMetricItem;
}

export function RiskDashboard() {
  const { data: profile } = useActiveProfile();
  
  // Fetch historical portfolio values to calculate historical drawdown chart (last 365 days)
  const { data: history = [], isLoading: loadingHistory } = usePortfolioHistory(365);

  const { data: riskData, isLoading: loadingRisk, isError } = useQuery<RiskMetricsData>({
    queryKey: ["analytics", "risk"],
    queryFn: () => apiFetch<RiskMetricsData>("/api/analytics/risk"),
    staleTime: 60 * 1000,
  });

  // Calculate historical drawdown series
  const drawdownHistory = React.useMemo(() => {
    if (!history || history.length === 0) return [];
    
    let peak = 0;
    return history.map((point) => {
      const value = point.value;
      if (value > peak) {
        peak = value;
      }
      
      const drawdown = peak > 0 ? (value - peak) / peak : 0;
      return {
        date: point.date,
        value: point.value,
        drawdown: drawdown * 100, // percentage for chart
      };
    });
  }, [history]);

  if (loadingRisk || loadingHistory) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/50 bg-card/80 backdrop-blur-sm h-32" />
          ))}
        </div>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-96 animate-pulse" />
      </div>
    );
  }

  if (isError || !riskData) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-sm text-destructive">
        Error al cargar las métricas de riesgo del portfolio.
      </div>
    );
  }

  const {
    var_parametric,
    var_historical,
    cvar,
    max_drawdown,
    volatility,
  } = riskData;

  // Maximum drawdown value (normally negative, e.g. -0.15)
  const currentDrawdownVal = Math.abs(max_drawdown?.value || 0) * 100;
  // Threshold from profile (default 20% if no profile)
  const maxAllowedDrawdown = profile?.max_acceptable_drawdown_pct ?? 20.0;
  
  // Percent utilization of the acceptable drawdown limit
  const drawdownLimitUtilization = Math.min((currentDrawdownVal / maxAllowedDrawdown) * 100, 100);

  const riskLevel = () => {
    if (drawdownLimitUtilization > 85) return { label: "Crítico", color: "text-red-500 bg-red-500/10 border-red-500/20" };
    if (drawdownLimitUtilization > 50) return { label: "Moderado", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
    return { label: "Bajo Control", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
  };

  const status = riskLevel();

  return (
    <div className="space-y-6">
      {/* Risk Limit Gauge & Core KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Drawdown limit gauge */}
        <div className="lg:col-span-1">
          <Card className="border-border/50 bg-card/85 backdrop-blur-sm shadow-md h-full flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Límite de Drawdown
                </CardTitle>
                <Badge className={`font-bold border ${status.color}`}>
                  {status.label}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Uso del drawdown máximo permitido por tu perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* Outer circle for progress */}
                  <svg className="absolute w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      stroke={drawdownLimitUtilization > 80 ? "#f87171" : drawdownLimitUtilization > 50 ? "#fb923c" : "#34d399"}
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 58}
                      strokeDashoffset={2 * Math.PI * 58 * (1 - drawdownLimitUtilization / 100)}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  
                  {/* Gauge Centered Text */}
                  <div className="text-center z-10">
                    <span className="text-2xl font-extrabold font-mono tracking-tight text-foreground">
                      {currentDrawdownVal.toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-1">
                      Máx Histórico
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar info */}
              <div className="space-y-2 border-t border-border/10 pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Límite Permitido:</span>
                  <span className="font-semibold text-foreground">{maxAllowedDrawdown.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Consumo del Límite:</span>
                  <span className="font-semibold text-foreground">{drawdownLimitUtilization.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* VaR and CVaR indicators */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* VaR Parametric */}
          <Card className="border-border/50 bg-card/85 backdrop-blur-sm shadow-md flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Value at Risk (VaR 95%)
              </CardTitle>
              <CardDescription className="text-xs">
                Pérdida máxima estimada con 95% de confianza (1 día)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-extrabold font-mono tracking-tight text-foreground">
                -{formatPercent(var_parametric?.value || 0)}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {var_parametric?.interpretation || "Hay un 95% de probabilidad de que la pérdida en un día no supere este valor."}
              </p>
              <div className="bg-secondary/10 p-2 rounded-lg text-[10px] font-mono text-muted-foreground">
                <div className="flex justify-between">
                  <span>VaR Histórico:</span>
                  <span className="text-foreground font-semibold">-{formatPercent(var_historical?.value || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conditional VaR */}
          <Card className="border-border/50 bg-card/85 backdrop-blur-sm shadow-md flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Expected Shortfall (CVaR)
              </CardTitle>
              <CardDescription className="text-xs">
                Pérdida promedio en los peores escenarios (5% de probabilidad)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-extrabold font-mono tracking-tight text-foreground">
                -{formatPercent(cvar?.value || 0)}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {cvar?.interpretation || "En el 5% de los peores días, la pérdida media esperada es de este porcentaje."}
              </p>
              <div className="bg-secondary/10 p-2 rounded-lg text-[10px] font-mono text-muted-foreground">
                <div className="flex justify-between">
                  <span>Volatilidad Anual:</span>
                  <span className="text-foreground font-semibold">{formatPercent(volatility?.value || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Drawdown Historical Chart */}
      <div>
        <Card className="border-border/50 bg-card/85 backdrop-blur-sm shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Gráfico Histórico de Drawdowns
            </CardTitle>
            <CardDescription>
              Representación visual de las caídas de la cartera desde sus máximos locales
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {drawdownHistory.length < 2 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-xl">
                <Info className="h-6 w-6 mb-2 text-muted-foreground/60" />
                No hay suficientes datos históricos para calcular el gráfico de caídas.
                <br />
                Añade transacciones en diferentes fechas.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={drawdownHistory}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(str) => formatDate(str)}
                      stroke="rgba(255,255,255,0.3)"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.3)"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(val) => `${val.toFixed(0)}%`}
                      domain={["auto", 0]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(9, 9, 11, 0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        fontSize: "12px",
                      }}
                      labelClassName="text-muted-foreground font-semibold"
                      formatter={(val: number) => [`${val.toFixed(2)}%`, "Drawdown"]}
                      labelFormatter={(label: string) => formatDate(label)}
                    />
                    <Area
                      type="monotone"
                      dataKey="drawdown"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#drawdownGradient)"
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
