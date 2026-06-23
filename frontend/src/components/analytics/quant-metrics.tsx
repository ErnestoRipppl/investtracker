"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { FormulaCard } from "./formula-card";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { formatPercent, formatNumber } from "@/lib/utils";

export interface QuantMetricResult {
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
  origin: string;
  limitations: string;
  when_to_use: string;
}

export function QuantMetrics() {
  const { data: metrics, isLoading, isError, error } = useQuery<QuantMetricResult[]>({
    queryKey: ["analytics", "quant"],
    queryFn: () => apiFetch<QuantMetricResult[]>("/api/analytics/quant"),
    staleTime: 60 * 1000, // 1 minute
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-border/50 bg-card/80 backdrop-blur-sm animate-pulse h-64">
            <CardContent className="p-6" />
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <Card className="border-destructive/30 bg-destructive/10 max-w-2xl mx-auto">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h3 className="text-lg font-bold text-destructive">Error al cargar métricas cuantitativas</h3>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Ocurrió un error inesperado al conectar con el servidor."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Helper formatter for each metric
  const getFormatterForMetric = (formulaId: string) => {
    switch (formulaId) {
      case "volatility":
      case "max_drawdown":
        return (val: number) => formatPercent(val);
      case "var_parametric":
      case "var_historical":
      case "cvar":
        // VaR / CVaR are returned as positive loss numbers by default, format as percentage
        return (val: number) => `-${formatPercent(val)}`;
      case "sharpe_ratio":
      case "sortino_ratio":
      case "treynor_ratio":
      case "calmar_ratio":
      case "omega_ratio":
      case "beta":
      default:
        return (val: number) => formatNumber(val, 2);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metrics.map((metric) => (
        <div key={metric.formula_id} className="h-full flex flex-col">
          <FormulaCard
            id={metric.formula_id}
            name={metric.formula_name}
            latex={metric.formula_latex}
            value={metric.value}
            description={metric.description}
            interpretation={metric.interpretation}
            origin={metric.origin}
            limitations={metric.limitations}
            when_to_use={metric.when_to_use}
            inputs_used={metric.inputs_used}
            confidence_level={metric.confidence_level}
            formatter={getFormatterForMetric(metric.formula_id)}
          />
        </div>
      ))}
    </div>
  );
}
