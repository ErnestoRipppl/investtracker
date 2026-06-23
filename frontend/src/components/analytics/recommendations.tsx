"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useActiveProfile } from "@/hooks/use-profile";
import { usePortfolio } from "@/hooks/use-portfolio";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import katex from "katex";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Sparkles,
  Brain,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from "lucide-react";

export interface RecommendationItem {
  id: string;
  priority: number;
  category: string;
  title: string;
  summary: string;
  detailed_analysis: string;
  formulas_used: string[];
  calculations_shown: Record<string, unknown>;
  action_suggested: string;
  impact_estimate: string;
  confidence: string;
  profile_alignment: string;
}

const FORMULA_LOOKUPS: Record<string, { name: string; latex: string }> = {
  sharpe_ratio: { name: "Ratio de Sharpe", latex: "S = \\frac{R_p - R_f}{\\sigma_p}" },
  sortino_ratio: { name: "Ratio de Sortino", latex: "So = \\frac{R_p - R_f}{\\sigma_d}" },
  calmar_ratio: { name: "Ratio de Calmar", latex: "C = \\frac{CAGR}{|MaxDrawdown|}" },
  var_parametric: { name: "VaR Paramétrico", latex: "VaR_\\alpha = \\mu - z_\\alpha \\cdot \\sigma" },
  cvar: { name: "CVaR (Expected Shortfall)", latex: "CVaR_\\alpha = E[R \\mid R \\leq VaR_\\alpha]" },
  kelly_criterion: { name: "Criterio de Kelly", latex: "f^* = \\frac{p \\cdot b - q}{b}" },
  markowitz: { name: "Optimización de Markowitz", latex: "\\min_w w^T \\Sigma w" },
  risk_parity: { name: "Paridad de Riesgo", latex: "RC_i = \\frac{\\sigma_p^2}{N}" },
};

export function Recommendations() {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // Queries
  const { data: profile } = useActiveProfile();
  const { data: portfolio } = usePortfolio();

  const { data: recommendations = [], isLoading, isError } = useQuery<RecommendationItem[]>({
    queryKey: ["analytics", "recommendations"],
    queryFn: () => apiFetch<RecommendationItem[]>("/api/analytics/recommendations"),
    staleTime: 30 * 1000, // 30 seconds
  });

  // Calculate comparison data for actual vs suggested allocation
  const allocationComparisonData = React.useMemo(() => {
    if (!profile || !portfolio) return [];

    // Recommended allocations (values in %)
    const rec = profile.recommended_allocation || {};

    // Group actual portfolio holdings into the 4 target classes:
    // 'renta_variable', 'renta_fija', 'alternativos', 'liquidez'
    let actualRV = 0;
    let actualRF = 0;
    let actualAlt = 0;
    let actualLiq = 0;

    portfolio.holdings.forEach((h) => {
      const type = h.asset_type.toLowerCase();
      const val = h.weight * 100; // weight is a fraction (e.g. 0.23 -> 23%)
      
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

    // If portfolio is empty, we might have cash representing liquidez
    if (portfolio.holdings.length === 0) {
      actualLiq = 100;
    }

    return [
      {
        name: "Renta Variable",
        Actual: Math.round(actualRV),
        Sugerido: rec.renta_variable || 0,
      },
      {
        name: "Renta Fija",
        Actual: Math.round(actualRF),
        Sugerido: rec.renta_fija || 0,
      },
      {
        name: "Alternativos",
        Actual: Math.round(actualAlt),
        Sugerido: rec.alternativos || 0,
      },
      {
        name: "Liquidez",
        Actual: Math.round(actualLiq),
        Sugerido: rec.liquidez || 0,
      },
    ];
  }, [profile, portfolio]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getPriorityDetails = (priority: number) => {
    switch (priority) {
      case 1:
        return { label: "Crítica", color: "bg-red-500/10 text-red-400 border-red-500/20" };
      case 2:
        return { label: "Alta", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" };
      case 3:
        return { label: "Media", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
      default:
        return { label: "Informativa", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category.toLowerCase()) {
      case "rebalancing":
      case "rebalanceo":
        return "Rebalanceo";
      case "risk":
      case "riesgo":
        return "Riesgo";
      case "opportunity":
      case "oportunidad":
        return "Oportunidad";
      case "cost":
      case "costes":
      case "eficiencia_costes":
        return "Eficiencia de Costes";
      case "concentracion":
        return "Concentración de Cartera";
      case "concentracion_sectorial":
        return "Concentración Sectorial";
      default:
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="h-64 animate-pulse border-border/50 bg-card/80" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-24 animate-pulse border-border/50 bg-card/80" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-sm text-destructive">
        Error al generar recomendaciones. Por favor, recarga la página.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Allocation Comparison Chart */}
      {profile && (
        <div>
          <Card className="border-border/50 bg-card/85 backdrop-blur-sm shadow-md">
            <CardHeader className="pb-3 border-b border-border/10">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-emerald-500" />
                Asignación de Activos: Actual vs. Sugerida
              </CardTitle>
              <CardDescription>
                Comparativa visual de tu cartera frente al perfil inversor calculado ({profile.profile_type})
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
                      contentStyle={{
                        backgroundColor: "rgba(9, 9, 11, 0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        fontSize: "12px",
                      }}
                      labelClassName="text-muted-foreground font-semibold"
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} name="Asignación Actual" />
                    <Bar dataKey="Sugerido" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Sugerido por Perfil" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          Recomendaciones Basadas en Inteligencia Cuantitativa
        </h3>

        {recommendations.length === 0 || (recommendations.length === 1 && recommendations[0].title === "Cartera vacía") ? (
          <div>
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm text-center p-8">
              <CardContent className="space-y-4">
                <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-foreground">Tu cartera está totalmente equilibrada</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  No se han detectado desviaciones de asignación, concentraciones de riesgo excesivas ni ineficiencias de costes significativas. ¡Buen trabajo!
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => {
              const isExpanded = expandedId === rec.id;
              const prio = getPriorityDetails(rec.priority);
              
              return (
                <div
                  key={rec.id}
                  className="w-full"
                >
                  <Card className={`border-border/50 transition-all duration-300 ${isExpanded ? "bg-secondary/10 border-emerald-500/20" : "bg-card/85 hover:border-emerald-500/10"}`}>
                    <button
                      onClick={() => toggleExpand(rec.id)}
                      className="w-full text-left p-4 sm:p-5 flex items-start gap-4 select-none cursor-pointer focus:outline-none"
                    >
                      <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${rec.priority === 1 ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                        <Brain className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-foreground sm:text-base pr-2 truncate">
                            {rec.title}
                          </span>
                          <Badge className={`text-[9px] font-bold border ${prio.color}`}>
                            {prio.label}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] font-semibold border-border/60">
                            {getCategoryLabel(rec.category)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {rec.summary}
                        </p>
                      </div>

                      <div className="text-muted-foreground shrink-0 self-center">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border/10 px-4 pb-5 pt-4 sm:px-6 text-xs space-y-4 animate-in fade-in duration-200">
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            Análisis Detallado
                          </span>
                          <p className="text-foreground leading-relaxed">
                            {rec.detailed_analysis}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Action & Impact */}
                          <div className="space-y-3 bg-secondary/15 rounded-xl p-4 border border-border/10">
                            <div className="space-y-1">
                              <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                Acción Sugerida
                              </span>
                              <p className="text-foreground font-semibold text-xs">
                                {rec.action_suggested}
                              </p>
                            </div>
                            {rec.impact_estimate && (
                              <div className="space-y-1 pt-2 border-t border-border/5">
                                <span className="text-[10px] text-primary uppercase font-bold tracking-wider">
                                  Impacto Estimado
                                  </span>
                                  <p className="text-muted-foreground text-xs leading-relaxed">
                                    {rec.impact_estimate}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Math formulas used */}
                            {rec.formulas_used && rec.formulas_used.length > 0 && (
                              <div className="space-y-2 bg-secondary/10 rounded-xl p-4 border border-border/10">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                  Modelos Matemáticos Utilizados
                                </span>
                                <div className="space-y-2">
                                  {rec.formulas_used.map((formulaId) => {
                                    const formula = FORMULA_LOOKUPS[formulaId];
                                    if (!formula) return null;
                                    
                                    const html = katex.renderToString(formula.latex, {
                                      throwOnError: false,
                                      displayMode: false,
                                    });

                                    return (
                                      <div key={formulaId} className="flex flex-col gap-1 pb-2 border-b border-border/5 last:border-b-0 last:pb-0">
                                        <span className="font-semibold text-foreground/80 text-[10px]">{formula.name}</span>
                                        <div 
                                          className="text-[11px] font-mono text-muted-foreground overflow-x-auto" 
                                          dangerouslySetInnerHTML={{ __html: html }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Profile Alignment & Confidence */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/5 pt-3 text-[10px] text-muted-foreground">
                            {rec.profile_alignment && (
                              <div>
                                <span className="font-bold uppercase tracking-wider block">Alineación con Perfil</span>
                                <span className="text-foreground mt-0.5 block">{rec.profile_alignment}</span>
                              </div>
                            )}
                            {rec.confidence && (
                              <div>
                                <span className="font-bold uppercase tracking-wider block">Grado de Confianza</span>
                                <span className="text-foreground mt-0.5 block capitalize">{rec.confidence}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
