"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useActiveProfile } from "@/hooks/use-profile";
import { usePortfolio } from "@/hooks/use-portfolio";
import { Recommendations } from "@/components/analytics/recommendations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Sparkles, TrendingUp, RefreshCw, BarChart3, ShieldAlert, Plus, Minus, Info } from "lucide-react";
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
  { ticker: "EUNL", name: "iShares MSCI World EUR Acc", assetType: "etf", description: "Acciones globales, diversificación total en mercados desarrollados." },
  { ticker: "VUAA", name: "Vanguard S&P 500 EUR Acc", assetType: "etf", description: "Las 500 mayores empresas de EE.UU. cotizadas en euros." },
  { ticker: "SEGA", name: "iShares Euro Gov Bond EUR", assetType: "bond", description: "Bonos de gobiernos de la eurozona con alta calidad de crédito." },
  { ticker: "EUN3", name: "iShares Euro Aggregate Bond", assetType: "bond", description: "Renta fija mixta (corporativa y pública) diversificada en EUR." },
  { ticker: "BTC", name: "Bitcoin (Cripto)", assetType: "crypto", description: "Activo digital principal, alta volatilidad y reserva de valor." },
  { ticker: "ETH", name: "Ethereum (Cripto)", assetType: "crypto", description: "Segunda red blockchain, líder de contratos inteligentes y finanzas DeFi." },
  { ticker: "SGLN", name: "iShares Physical Gold ETC", assetType: "etf", description: "Oro físico respaldado como protección tradicional contra inflación." },
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

export default function RecommendationsPage() {
  const { data: profile, isLoading: isProfileLoading } = useActiveProfile();
  const { data: portfolio, isLoading: isPortfolioLoading } = usePortfolio();

  const [investments, setInvestments] = React.useState<Record<string, string>>({});
  const [years, setYears] = React.useState<number>(5);

  const handleInputChange = (ticker: string, value: string) => {
    // Only allow positive numbers/decimals
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

  const {
    data: simulation,
    isLoading: isSimLoading,
    isFetching: isSimFetching,
    isError: isSimError
  } = useQuery<SimulationResult>({
    queryKey: ["portfolio-simulation", simulatedAssets, years],
    queryFn: () =>
      apiFetch<SimulationResult>("/api/analytics/simulate", {
        method: "POST",
        body: JSON.stringify({
          simulated_assets: simulatedAssets,
          years,
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
  }

  interface MCTooltipProps {
    active?: boolean;
    payload?: MCTooltipPayloadEntry[];
    label?: string;
  }

  const CustomMCTooltip = ({ active, payload, label }: MCTooltipProps) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="rounded-lg border border-border/50 bg-popover/95 backdrop-blur-sm p-3 shadow-xl">
        <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: MCTooltipPayloadEntry, index: number) => (
            <div key={index} className="flex items-center gap-4 justify-between">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </span>
              <span className="text-sm font-semibold font-mono text-foreground">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isProfileLoading || isPortfolioLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-secondary/50 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <Card className="h-96" />
          </div>
          <div className="lg:col-span-5 space-y-4">
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
            Antes de poder ver las recomendaciones inteligentes, debes completar tu perfil respondiendo el cuestionario.
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
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Recomendaciones e Inteligencia Cuantitativa</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Consejos de asignación según tu perfil inversor y simulador dinámico de riesgo (Monte Carlo)
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
        {/* Left Column: Recommendations & Allocation comparison */}
        <div className="lg:col-span-6 space-y-6">
          <Recommendations showChart={true} />
        </div>

        {/* Right Column: Simulator & What-if Projections */}
        <div className="lg:col-span-6 space-y-6">
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
                              className="h-8 pl-6 pr-2 font-mono text-xs text-right"
                            />
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground">€</span>
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

          {/* Results section */}
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
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Patrimonio Neto</span>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <p className="text-sm font-bold font-mono text-foreground">
                      {formatCurrency(simulation.projected_value)}
                    </p>
                    <span className="text-[9px] text-muted-foreground">
                      Simulado
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
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="mcRangeOuter" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.08} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                          dataKey="yearLabel"
                          stroke="rgba(255,255,255,0.3)"
                          fontSize={10}
                          tickLine={false}
                          interval={Math.floor(mcChartData.length / 5)}
                        />
                        <YAxis
                          stroke="rgba(255,255,255,0.3)"
                          fontSize={10}
                          tickLine={false}
                          tickFormatter={(val) => `${(val / 1000).toFixed(0)}k €`}
                        />
                        <Tooltip content={<CustomMCTooltip />} cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }} />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                        
                        {/* Outer Range (P5 - P95) */}
                        <Area
                          type="monotone"
                          dataKey="P95"
                          stroke="none"
                          fill="url(#mcRangeOuter)"
                          name="Rango Extremo (95% confianza)"
                        />
                        <Area
                          type="monotone"
                          dataKey="P5"
                          stroke="none"
                          fill="none"
                        />

                        {/* Central Range (P25 - P75) */}
                        <Area
                          type="monotone"
                          dataKey="P75"
                          stroke="#3b82f6"
                          strokeWidth={1}
                          fill="url(#mcRangeInner)"
                          name="Rango Esperado (IQR 50%)"
                        />
                        <Area
                          type="monotone"
                          dataKey="P25"
                          stroke="#3b82f6"
                          strokeWidth={1}
                          fill="none"
                        />

                        {/* Median Line */}
                        <Line
                          type="monotone"
                          dataKey="Mediana"
                          stroke="#10b981"
                          strokeWidth={2}
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
