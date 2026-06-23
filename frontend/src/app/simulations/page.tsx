"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useActiveProfile } from "@/hooks/use-profile";
import { usePortfolio } from "@/hooks/use-portfolio";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Sparkles, TrendingUp, RefreshCw, BarChart3, ShieldAlert, Plus, Minus, Info, Target, ArrowRight, Coins } from "lucide-react";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import {
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface OptionItem {
  ticker: string;
  name: string;
  assetType: string;
  description: string;
}

const INVESTMENT_OPTIONS: OptionItem[] = [
  // Renta Variable
  { ticker: "EUNL", name: "iShares MSCI World EUR Acc", assetType: "etf", description: "Acciones globales, diversificación total en mercados desarrollados." },
  { ticker: "VUAA", name: "Vanguard S&P 500 UCITS ETF", assetType: "etf", description: "Fórmula de bajo coste para seguir el rendimiento de las 500 mayores empresas de EE.UU." },
  // Renta Fija
  { ticker: "SEGA", name: "iShares Govt Bond 3-7yr EUR", assetType: "bond", description: "Bonos soberanos de gobiernos de la Eurozona a medio plazo." },
  { ticker: "EUN3", name: "iShares Govt Bond 7-10yr EUR", assetType: "bond", description: "Bonos del gobierno de la Eurozona con vencimiento a largo plazo (7-10 años)." },
  // Alternativos
  { ticker: "AUX", name: "Oro Spot (Físico)", assetType: "crypto", description: "Materia prima de protección tradicional contra inflación disponible en Revolut." },
  { ticker: "BTC-EUR", name: "Bitcoin (Cripto)", assetType: "crypto", description: "La principal criptomoneda del mercado como reserva de valor digital." },
  { ticker: "ETH-EUR", name: "Ethereum (Cripto)", assetType: "crypto", description: "Segunda red blockchain, líder de contratos inteligentes y finanzas DeFi." },
  // Liquidez
  { ticker: "REV-LIQ", name: "Cuenta Flexible (Liquidez)", assetType: "liquidez", description: "Fondo monetario de liquidez inmediata y bajo riesgo en Revolut." },
];

interface SimulationResult {
  expected_return: number;
  volatility: number;
  sharpe_ratio: number;
  current_value: number;
  projected_value: number;
  projected_allocation: {
    renta_variable: number;
    renta_fija: number;
    alternativos: number;
    liquidez: number;
  };
  monte_carlo: {
    paths: number[][];
    percentiles: {
      p5: number[];
      p25: number[];
      p50: number[];
      p75: number[];
      p95: number[];
    };
    summary: {
      median_final: number;
      mean_final: number;
      best_case: number;
      worst_case: number;
      prob_profit: number;
    };
    years: number;
    n_simulations: number;
  };
}

export default function SimulationsPage() {
  const { data: profile, isLoading: isProfileLoading } = useActiveProfile();
  const { data: portfolio, isLoading: isPortfolioLoading } = usePortfolio();

  const [investments, setInvestments] = React.useState<Record<string, string>>({});
  const [years, setYears] = React.useState<number>(5);
  const [contributionType, setContributionType] = React.useState<"lump_sum" | "recurring">("lump_sum");

  // Planificador de Objetivos Financieros state
  const [plannerMode, setPlannerMode] = React.useState<"target" | "contribution">("target");
  const [targetNetWorth, setTargetNetWorth] = React.useState<number>(50000);
  const [targetYears, setTargetYears] = React.useState<number>(5);
  const [monthlyInput, setMonthlyInput] = React.useState<number>(300);

  // Rentabilidad esperada del perfil del inversor
  const profileExpectedReturn = React.useMemo(() => {
    if (!profile || !profile.recommended_allocation) return 0.07;
    const alloc = profile.recommended_allocation;
    const rv = (alloc.renta_variable || 0) / 100 * 0.075;
    const rf = (alloc.renta_fija || 0) / 100 * 0.040;
    const alt = (alloc.alternativos || 0) / 100 * 0.180;
    const liq = (alloc.liquidez || 0) / 100 * 0.030;
    return rv + rf + alt + liq;
  }, [profile]);

  // Aportación mensual activa (calculada para Target o directa para Contribution)
  const activeMonthlyContribution = React.useMemo(() => {
    if (plannerMode === "contribution") {
      return monthlyInput;
    }
    
    const v0 = portfolio?.total_value_eur ?? 0;
    const t = targetNetWorth;
    const y = targetYears;
    const mu = profileExpectedReturn;
    const rm = Math.pow(1 + mu, 1 / 12) - 1;
    const n = 12 * y;
    const fvCurrent = v0 * Math.pow(1 + mu, y);
    if (fvCurrent >= t) return 0;

    const numerator = (t - fvCurrent) * rm;
    const denominator = Math.pow(1 + rm, n) - 1;
    return denominator > 0 ? numerator / denominator : 0;
  }, [plannerMode, monthlyInput, portfolio?.total_value_eur, targetNetWorth, targetYears, profileExpectedReturn]);

  // Proyecciones para el método inverso
  const contributionProjections = React.useMemo(() => {
    const v0 = portfolio?.total_value_eur ?? 0;
    const c = monthlyInput;
    const y = targetYears;
    const mu = profileExpectedReturn;
    const rm = Math.pow(1 + mu, 1 / 12) - 1;
    const n = 12 * y;
    
    const fvCurrent = v0 * Math.pow(1 + mu, y);
    const fvContrib = rm > 0 ? c * (Math.pow(1 + rm, n) - 1) / rm : c * n;
    const fvTotal = fvCurrent + fvContrib;
    
    const totalDeposited = c * n;
    const totalInvested = v0 + totalDeposited;
    const estimatedProfit = Math.max(0, fvTotal - totalInvested);
    
    return {
      futureValue: fvTotal,
      totalDeposited,
      totalInvested,
      estimatedProfit,
    };
  }, [portfolio?.total_value_eur, monthlyInput, targetYears, profileExpectedReturn]);

  // Distribución por activo (EUNL, VUAA, SEGA, EUN3, AUX, BTC-EUR, ETH-EUR, REV-LIQ) renormalizada
  const targetDistribution = React.useMemo(() => {
    const result = {
      EUNL: 0,
      VUAA: 0,
      SEGA: 0,
      EUN3: 0,
      AUX: 0,
      "BTC-EUR": 0,
      "ETH-EUR": 0,
      "REV-LIQ": 0,
    };
    
    if (!profile || !profile.recommended_allocation) return result;
    const alloc = profile.recommended_allocation;
    const wRV = alloc.renta_variable || 0;
    const wRF = alloc.renta_fija || 0;
    const wAlt = alloc.alternativos || 0;
    const wLiq = alloc.liquidez || 0;
    
    const c = activeMonthlyContribution;
    if (c <= 0) return result;
    
    // Distribute according to the profile allocations and active weights
    // Renta Variable (EUNL 70%, VUAA 30%)
    result.EUNL = Math.round(c * (wRV / 100) * 0.70);
    result.VUAA = Math.round(c * (wRV / 100) * 0.30);
    
    // Renta Fija (SEGA 60%, EUN3 40%)
    result.SEGA = Math.round(c * (wRF / 100) * 0.60);
    result.EUN3 = Math.round(c * (wRF / 100) * 0.40);
    
    // Alternativos (AUX 50%, BTC-EUR 30%, ETH-EUR 20%)
    result.AUX = Math.round(c * (wAlt / 100) * 0.50);
    result["BTC-EUR"] = Math.round(c * (wAlt / 100) * 0.30);
    result["ETH-EUR"] = Math.round(c * (wAlt / 100) * 0.20);
    
    // Liquidez (REV-LIQ 100%)
    result["REV-LIQ"] = Math.round(c * (wLiq / 100) * 1.00);
    
    return result;
  }, [profile, activeMonthlyContribution]);

  const handleLoadIntoSimulator = () => {
    setContributionType("recurring");
    setYears(targetYears);
    const newInvestments: Record<string, string> = {};
    Object.entries(targetDistribution).forEach(([ticker, val]) => {
      if (val > 0) {
        newInvestments[ticker] = val.toString();
      }
    });
    setInvestments(newInvestments);
  };

  const handleInputChange = (ticker: string, value: string) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setInvestments((prev) => ({ ...prev, [ticker]: value }));
    }
  };

  const handleAdjustValue = (ticker: string, amount: number) => {
    const currentVal = parseFloat(investments[ticker] || "0");
    const newVal = Math.max(0, currentVal + amount);
    setInvestments((prev) => ({ ...prev, [ticker]: newVal === 0 ? "" : newVal.toString() }));
  };

  const handleReset = () => {
    setInvestments({});
  };

  // Process inputs for POST body
  const simulatedAssets = React.useMemo(() => {
    return Object.entries(investments)
      .map(([ticker, valStr]) => {
        const value = parseFloat(valStr);
        if (isNaN(value) || value <= 0) return null;
        const opt = INVESTMENT_OPTIONS.find((o) => o.ticker === ticker);
        if (!opt) return null;
        return {
          ticker,
          asset_type: opt.assetType,
          value,
        };
      })
      .filter(Boolean) as { ticker: string; asset_type: string; value: number }[];
  }, [investments]);

  const monthlyContribution = React.useMemo(() => {
    return simulatedAssets.reduce((sum, item) => sum + item.value, 0);
  }, [simulatedAssets]);

  const {
    data: simulation,
    isLoading: isSimLoading,
    isFetching: isSimFetching,
    isError: isSimError
  } = useQuery<SimulationResult>({
    queryKey: ["portfolio-simulation", simulatedAssets, years, contributionType],
    queryFn: () =>
      apiFetch<SimulationResult>("/api/analytics/simulate", {
        method: "POST",
        body: JSON.stringify({
          simulated_assets: simulatedAssets,
          years,
          contribution_type: contributionType
        }),
      }),
    staleTime: 10 * 1000,
  });

  // Construct Recharts BarChart data (Current vs profile Suggested vs Projected)
  const allocationComparisonData = React.useMemo(() => {
    if (!profile || !portfolio || !simulation) return [];

    const rec = profile.recommended_allocation || {};
    const proj = simulation.projected_allocation || {};

    let actualRV = 0;
    let actualRF = 0;
    let actualAlt = 0;
    let actualLiq = 0;

    portfolio.holdings.forEach((h) => {
      const type = h.asset_type.toLowerCase();
      const val = h.weight * 100;
      if (type === "stock" || type === "etf" || type === "fund") {
        actualRV += val;
      } else if (type === "bond") {
        actualRF += val;
      } else if (type === "crypto") {
        actualAlt += val;
      } else {
        actualLiq += val;
      }
    });

    if (portfolio.holdings.length === 0) {
      actualLiq = 100;
    }

    return [
      {
        name: "Renta Variable",
        Actual: Math.round(actualRV),
        Sugerido: rec.renta_variable || 0,
        Proyectado: Math.round(proj.renta_variable || 0),
      },
      {
        name: "Renta Fija",
        Actual: Math.round(actualRF),
        Sugerido: rec.renta_fija || 0,
        Proyectado: Math.round(proj.renta_fija || 0),
      },
      {
        name: "Alternativos",
        Actual: Math.round(actualAlt),
        Sugerido: rec.alternativos || 0,
        Proyectado: Math.round(proj.alternativos || 0),
      },
      {
        name: "Liquidez",
        Actual: Math.round(actualLiq),
        Sugerido: rec.liquidez || 0,
        Proyectado: Math.round(proj.liquidez || 0),
      },
    ];
  }, [profile, portfolio, simulation]);

  // Construct Recharts Monte Carlo ComposedChart data
  const mcChartData = React.useMemo(() => {
    if (!simulation || !simulation.monte_carlo || !simulation.monte_carlo.percentiles) return [];

    const percentiles = simulation.monte_carlo.percentiles;
    const len = percentiles.p50.length;

    return percentiles.p50.map((val, idx) => {
      const yearFraction = (idx / (len - 1)) * years;
      return {
        step: idx,
        yearLabel: `Año ${yearFraction.toFixed(1)}`,
        Mediana: Math.round(val),
        P25: Math.round(percentiles.p25[idx]),
        P75: Math.round(percentiles.p75[idx]),
        P5: Math.round(percentiles.p5[idx]),
        P95: Math.round(percentiles.p95[idx]),
      };
    });
  }, [simulation, years]);

  // Custom tooltips
  interface MCTooltipPayloadEntry {
    value: number;
    name: string;
    color: string;
    dataKey?: string | number;
  }

  interface MCTooltipProps {
    active?: boolean;
    payload?: MCTooltipPayloadEntry[];
    label?: string;
  }

  const CustomMCTooltip = ({ active, payload, label }: MCTooltipProps) => {
    if (!active || !payload || !payload.length) return null;
    
    // Sort payload by value descending so the tooltip order matches the visual top-to-bottom lines of the chart
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

    return (
      <div className="rounded-lg border border-border/50 bg-popover/95 backdrop-blur-sm p-3 shadow-xl">
        <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
        <div className="space-y-1.5">
          {sortedPayload.map((entry: MCTooltipPayloadEntry, index: number) => {
            // Map series keys to descriptive Spanish labels
            let displayName = entry.name;
            const dataKey = entry.dataKey;
            
            if (dataKey === "P95" || entry.name === "Rango Extremo (95% confianza)") {
              displayName = "Rango Extremo Máximo (P95)";
            } else if (dataKey === "P75" || entry.name === "Rango Esperado (IQR 50%)") {
              displayName = "Rango Esperado Máximo (P75)";
            } else if (dataKey === "Mediana" || entry.name === "Escenario Central (Mediana)") {
              displayName = "Escenario Central (Mediana)";
            } else if (dataKey === "P25") {
              displayName = "Rango Esperado Mínimo (P25)";
            } else if (dataKey === "P5") {
              displayName = "Rango Extremo Mínimo (P5)";
            }

            return (
              <div key={index} className="flex items-center gap-4 justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  {displayName}
                </span>
                <span className="text-sm font-semibold font-mono text-foreground">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isProfileLoading || isPortfolioLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-secondary/50 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-4">
            <Card className="h-96" />
          </div>
          <div className="lg:col-span-6 space-y-4">
            <Card className="h-[500px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm max-w-2xl mx-auto my-12 shadow-xl">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-primary" />
          <h3 className="text-xl font-bold">Perfil Inversor no Configurado</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Antes de poder realizar simulaciones y planificaciones, debes completar tu perfil respondiendo el cuestionario.
          </p>
          <Link href="/profile" className="mt-2">
            <Button>Completar Perfil</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const hasSimulatedInputs = simulatedAssets.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-row justify-between items-center pb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Simulaciones y Planificación de Metas</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Simulador dinámico de riesgo (Monte Carlo) y calculadora de aportaciones para objetivos
            </p>
          </div>
        </div>
        {hasSimulatedInputs && (
          <Button onClick={handleReset} variant="outline" size="sm" className="gap-1.5 h-8">
            Restablecer Simulador
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Goal Planner & Investment Simulator */}
        <div className="lg:col-span-6 space-y-6">
          {/* Planificador de Objetivos Financieros */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-md">
            <CardHeader className="pb-3 border-b border-border/10">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Planificador de Objetivos Financieros
              </CardTitle>
              <CardDescription>
                Define tu meta a futuro o calcula la proyección en base a tus aportaciones mensuales
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Selector de modo de planificador */}
              <div className="flex bg-background/50 border border-border/40 p-1 rounded-lg gap-1 w-full">
                <Button
                  onClick={() => setPlannerMode("target")}
                  type="button"
                  variant={plannerMode === "target" ? "secondary" : "ghost"}
                  className="flex-1 text-xs font-semibold h-8"
                >
                  Definir Objetivo
                </Button>
                <Button
                  onClick={() => setPlannerMode("contribution")}
                  type="button"
                  variant={plannerMode === "contribution" ? "secondary" : "ghost"}
                  className="flex-1 text-xs font-semibold h-8"
                >
                  Definir Aportación
                </Button>
              </div>

              {/* Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {plannerMode === "target" ? (
                  <div className="space-y-2">
                    <label htmlFor="target-net-worth" className="text-xs font-semibold text-muted-foreground">
                      Patrimonio Objetivo
                    </label>
                    <div className="relative">
                      <Input
                        id="target-net-worth"
                        type="number"
                        value={targetNetWorth}
                        onChange={(e) => setTargetNetWorth(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="pl-7 pr-4 py-1.5 text-sm font-mono"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">€</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="monthly-input" className="text-xs font-semibold text-muted-foreground">
                      Aportación Mensual
                    </label>
                    <div className="relative">
                      <Input
                        id="monthly-input"
                        type="number"
                        value={monthlyInput}
                        onChange={(e) => setMonthlyInput(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="pl-7 pr-4 py-1.5 text-sm font-mono"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">€</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="target-years" className="text-xs font-semibold text-muted-foreground">
                      Plazo Objetivo
                    </label>
                    <span className="text-xs font-bold text-primary font-mono">{targetYears} años</span>
                  </div>
                  <div className="pt-2">
                    <Slider
                      id="target-years"
                      value={[targetYears]}
                      onValueChange={(val) => {
                        if (Array.isArray(val)) {
                          setTargetYears(val[0]);
                        } else if (typeof val === "number") {
                          setTargetYears(val);
                        }
                      }}
                      min={1}
                      max={30}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              {/* Information / Parameters summary */}
              <div className="p-3.5 rounded-lg border border-border/30 bg-background/30 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patrimonio Actual:</span>
                  <span className="font-semibold font-mono">{formatCurrency(portfolio?.total_value_eur ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Perfil de Inversor:</span>
                  <span className="font-semibold capitalize text-primary">{profile.profile_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tasa de Retorno Esperada (Perfil):</span>
                  <span className="font-semibold text-emerald-500 font-mono">{formatPercent(profileExpectedReturn)} anual</span>
                </div>
              </div>

              {/* Required Monthly savings / Projections results */}
              <div className="space-y-4 pt-2">
                {plannerMode === "target" ? (
                  <>
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                      <span className="text-xs font-medium text-muted-foreground">Aportación Mensual Requerida</span>
                      <span className="text-3xl font-black text-primary font-mono mt-1">
                        {formatCurrency(activeMonthlyContribution)}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-1">
                        durante los próximos {targetYears} años
                      </span>
                    </div>

                    {activeMonthlyContribution === 0 && (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs text-emerald-400">
                        <Sparkles className="h-6 w-6 mx-auto mb-2 text-emerald-400" />
                        <strong>¡Objetivo alcanzado!</strong> Tu patrimonio actual de {formatCurrency(portfolio?.total_value_eur ?? 0)} ya supera o iguala la meta de {formatCurrency(targetNetWorth)} en {targetYears} años sin necesidad de nuevas aportaciones.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase leading-tight">Patrimonio Estimado</span>
                      <span className="text-base font-bold text-primary font-mono mt-1 truncate w-full">
                        {formatCurrency(contributionProjections.futureValue)}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/40 border border-border/30 text-center">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase leading-tight">Total Aportado</span>
                      <span className="text-base font-bold text-foreground font-mono mt-1 truncate w-full">
                        {formatCurrency(contributionProjections.totalDeposited)}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                      <span className="text-[10px] font-medium text-emerald-400 uppercase leading-tight">Ganancia Estimada</span>
                      <span className="text-base font-bold text-emerald-400 font-mono mt-1 truncate w-full">
                        {formatCurrency(contributionProjections.estimatedProfit)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Show distribution and load button if active contribution is above 0 */}
                {activeMonthlyContribution > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Distribución Sugerida por Perfil Inversor
                    </h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      {INVESTMENT_OPTIONS.map((opt) => {
                        const val = targetDistribution[opt.ticker as keyof typeof targetDistribution] || 0;
                        if (val <= 0) return null;
                        
                        const badgeColor =
                          opt.assetType === "crypto"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : opt.assetType === "bond"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : opt.assetType === "liquidez"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20";
                            
                        return (
                          <div key={opt.ticker} className="flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-background/40">
                            <div className="flex items-center gap-2">
                              <Badge className={badgeColor} variant="outline">
                                {opt.ticker}
                              </Badge>
                              <span className="text-xs font-semibold text-foreground">{opt.name}</span>
                            </div>
                            <span className="text-sm font-bold font-mono text-foreground">
                              {formatCurrency(val)}/mes
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 text-[10px] text-muted-foreground leading-normal">
                      <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>
                        Las proporciones se calculan de manera inteligente diversificando entre los activos de tu perfil inversor: Renta Variable (EUNL, VUAA), Renta Fija (SEGA, EUN3), Alternativos (AUX, BTC-EUR, ETH-EUR) y Liquidez (REV-LIQ).
                      </span>
                    </div>

                    <Button
                      onClick={handleLoadIntoSimulator}
                      className="w-full gap-2 mt-2 h-9 text-xs font-semibold"
                    >
                      <Coins className="h-4 w-4" />
                      Cargar aportaciones en el simulador
                      <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Simulator Panel */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-md">
            <CardHeader className="pb-3 border-b border-border/10">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Simulador de Inversión (What-If)
                  </CardTitle>
                  <CardDescription>
                    Simula la compra de otros activos y evalúa visualmente su impacto en tu cartera
                  </CardDescription>
                </div>
                {isSimFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Type of contribution selection */}
              <div className="flex bg-background/50 border border-border/40 p-1 rounded-lg gap-1 w-full">
                <Button
                  onClick={() => setContributionType("lump_sum")}
                  type="button"
                  variant={contributionType === "lump_sum" ? "secondary" : "ghost"}
                  className="flex-1 text-xs font-semibold h-8"
                >
                  Aportación Puntual (Hoy)
                </Button>
                <Button
                  onClick={() => setContributionType("recurring")}
                  type="button"
                  variant={contributionType === "recurring" ? "secondary" : "ghost"}
                  className="flex-1 text-xs font-semibold h-8"
                >
                  Aportación Recurrente (Mensual)
                </Button>
              </div>

              {/* Asset inputs */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Opciones de Inversión</h4>
                <div className="grid grid-cols-1 gap-3 max-h-[320px] overflow-y-auto pr-1">
                  {INVESTMENT_OPTIONS.map((opt) => {
                    const badgeColor =
                      opt.assetType === "crypto"
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        : opt.assetType === "bond"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : opt.assetType === "liquidez"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20";
                    return (
                      <div key={opt.ticker} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-2.5 rounded-lg border border-border/30 bg-background/40 hover:bg-background/60 transition-colors">
                        <div className="space-y-1 max-w-[70%]">
                          <div className="flex items-center gap-2">
                            <Badge className={badgeColor} variant="outline">
                              {opt.ticker}
                            </Badge>
                            <span className="text-xs font-bold truncate text-foreground">{opt.name}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{opt.description}</p>
                        </div>
                        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                          <Button
                            onClick={() => handleAdjustValue(opt.ticker, -250)}
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 shrink-0"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <div className="relative w-28 shrink-0">
                            <Input
                              value={investments[opt.ticker] || ""}
                              onChange={(e) => handleInputChange(opt.ticker, e.target.value)}
                              placeholder="0"
                              className="h-8 pl-6 pr-10 font-mono text-xs text-right"
                            />
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground">€</span>
                            {contributionType === "recurring" && (
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground">/mes</span>
                            )}
                          </div>
                          <Button
                            onClick={() => handleAdjustValue(opt.ticker, 250)}
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 shrink-0"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Slider years */}
              <div className="space-y-3.5 pt-4 border-t border-border/10">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-muted-foreground">Horizonte de Simulación</span>
                  <span className="font-bold text-primary font-mono">{years} años</span>
                </div>
                <Slider
                  value={[years]}
                  onValueChange={(val) => {
                    if (Array.isArray(val)) {
                      setYears(val[0]);
                    } else if (typeof val === "number") {
                      setYears(val);
                    }
                  }}
                  min={1}
                  max={10}
                  step={1}
                  className="py-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Projections & Results */}
        <div className="lg:col-span-6 space-y-6">
          {isSimLoading ? (
            <Card className="h-96 animate-pulse" />
          ) : isSimError || !simulation ? (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardContent className="p-6 flex items-center gap-3 text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">Error al calcular la simulación de cartera.</span>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Projected Allocation Chart */}
              {hasSimulatedInputs && (
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-md">
                  <CardHeader className="pb-3 border-b border-border/10">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Asignación Proyectada vs. Sugerida
                    </CardTitle>
                    <CardDescription>
                      Compara tu cartera proyectada (después de las compras simuladas) con el perfil inversor
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={allocationComparisonData}
                          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                          <YAxis
                            stroke="rgba(255,255,255,0.3)"
                            fontSize={10}
                            tickLine={false}
                            tickFormatter={(val) => `${val}%`}
                          />
                          <Tooltip
                            cursor={false}
                            contentStyle={{
                              backgroundColor: "rgba(9, 9, 11, 0.95)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "10px",
                              fontSize: "12px",
                            }}
                            labelClassName="text-muted-foreground font-semibold"
                          />
                          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                          <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} name="Actual" />
                          <Bar dataKey="Sugerido" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Sugerido por Perfil" />
                          <Bar dataKey="Proyectado" fill="#a855f7" radius={[4, 4, 0, 0]} name="Simulado (Proyectado)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Simulation Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
                  <CardHeader className="p-3 pb-0">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                      {contributionType === "recurring" ? "Patrimonio Actual" : "Patrimonio Neto"}
                    </span>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <p className="text-sm font-bold font-mono text-foreground">
                      {formatCurrency(
                        contributionType === "recurring"
                          ? simulation.current_value
                          : simulation.projected_value
                      )}
                    </p>
                    <span className="text-[9px] text-muted-foreground">
                      {contributionType === "recurring"
                        ? `+ ${formatCurrency(monthlyContribution)}/mes`
                        : "Simulado"}
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
                  <CardHeader className="p-3 pb-0">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Retorno Esperado</span>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <p className="text-sm font-bold font-mono text-emerald-500">
                      {formatPercent(simulation.expected_return)}
                    </p>
                    <span className="text-[9px] text-muted-foreground">
                      Anualizado
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
                  <CardHeader className="p-3 pb-0">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Volatilidad</span>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <p className="text-sm font-bold font-mono text-amber-500">
                      {formatPercent(simulation.volatility)}
                    </p>
                    <span className="text-[9px] text-muted-foreground">
                      Estimada
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
                  <CardHeader className="p-3 pb-0">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Sharpe Ratio</span>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <p className="text-sm font-bold font-mono text-primary">
                      {formatNumber(simulation.sharpe_ratio, 2)}
                    </p>
                    <span className="text-[9px] text-muted-foreground">
                      Medida de riesgo
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* Monte Carlo Area Chart */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-md">
                <CardHeader className="pb-3 border-b border-border/10">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-primary" />
                    Simulación Monte Carlo ({years} años)
                  </CardTitle>
                  <CardDescription>
                    Probabilidades de la evolución de tu cartera simulada (5.000 escenarios)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={mcChartData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="mcRangeInner" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.08} />
                          </linearGradient>
                          <linearGradient id="mcRangeOuter" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.20} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.04} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
                        <XAxis
                          dataKey="yearLabel"
                          stroke="rgba(255,255,255,0.6)"
                          fontSize={10}
                          tickLine={false}
                          interval={Math.floor(mcChartData.length / 5)}
                        />
                        <YAxis
                          stroke="rgba(255,255,255,0.6)"
                          fontSize={10}
                          tickLine={false}
                          tickFormatter={(val) => `${(val / 1000).toFixed(0)}k €`}
                        />
                        <Tooltip content={<CustomMCTooltip />} cursor={{ stroke: "rgba(255,255,255,0.3)", strokeWidth: 1.5 }} />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                        
                        {/* Outer Range (P5 - P95) */}
                        <Area
                          type="monotone"
                          dataKey="P95"
                          stroke="#8b5cf6"
                          strokeWidth={1}
                          strokeDasharray="4 4"
                          fill="url(#mcRangeOuter)"
                          name="Rango Extremo (95% confianza)"
                        />
                        <Area
                          type="monotone"
                          dataKey="P5"
                          stroke="#8b5cf6"
                          strokeWidth={1}
                          strokeDasharray="4 4"
                          fill="none"
                          legendType="none"
                        />

                        {/* Central Range (P25 - P75) */}
                        <Area
                          type="monotone"
                          dataKey="P75"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#mcRangeInner)"
                          name="Rango Esperado (IQR 50%)"
                        />
                        <Area
                          type="monotone"
                          dataKey="P25"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="none"
                          legendType="none"
                        />

                        {/* Median Line */}
                        <Line
                          type="monotone"
                          dataKey="Mediana"
                          stroke="#10b981"
                          strokeWidth={3.5}
                          dot={false}
                          name="Escenario Central (Mediana)"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Simulation summary text */}
                  {simulation.monte_carlo.summary && (
                    <div className="mt-4 p-3 rounded-lg border border-border/30 bg-background/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Info className="h-4 w-4 text-primary shrink-0" />
                        <span>
                          Probabilidad de obtener ganancias al final de los {years} años:{" "}
                          <strong className="text-foreground font-semibold">
                            {formatPercent(simulation.monte_carlo.summary.prob_profit)}
                          </strong>
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-muted-foreground">
                          Pérdida Máxima Est.:{" "}
                          <strong className="text-red-400 font-semibold font-mono">
                            {formatCurrency(simulation.monte_carlo.summary.worst_case)}
                          </strong>
                        </span>
                        <span className="text-muted-foreground">
                          Mediana Est.:{" "}
                          <strong className="text-emerald-400 font-semibold font-mono">
                            {formatCurrency(simulation.monte_carlo.summary.median_final)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
