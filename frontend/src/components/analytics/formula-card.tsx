"use client";

import * as React from "react";
import katex from "katex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpCircle, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export interface FormulaCardProps {
  id: string;
  name: string;
  latex: string;
  value: number | string | null;
  description: string;
  interpretation: string;
  origin: string;
  limitations: string;
  when_to_use?: string;
  inputs_used?: Record<string, unknown>;
  confidence_level?: string;
  formatter?: (val: number) => string;
}

export function FormulaCard({
  name,
  latex,
  value,
  description,
  interpretation,
  origin,
  limitations,
  when_to_use,
  inputs_used,
  confidence_level = "medium",
  formatter,
}: FormulaCardProps) {
  const [expanded, setExpanded] = React.useState(false);

  // Render latex using KaTeX
  const latexHtml = React.useMemo(() => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: true,
      });
    } catch (err) {
      console.error("Error rendering LaTeX:", err);
      return latex;
    }
  }, [latex]);

  const confidenceBadge = React.useMemo(() => {
    const level = confidence_level.toLowerCase();
    if (level === "high") {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
          Confianza Alta
        </Badge>
      );
    }
    if (level === "low") {
      return (
        <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold">
          Confianza Baja
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
        Confianza Media
      </Badge>
    );
  }, [confidence_level]);

  // Handle format of display value
  const displayValue = React.useMemo(() => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "string") return value;
    if (formatter) return formatter(value);
    return formatNumber(value);
  }, [value, formatter]);

  return (
    <div className="flex-1 flex flex-col transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <Card className="border-border/50 bg-card/85 backdrop-blur-sm shadow-md hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between h-full w-full">
        <div>
          <CardHeader className="pb-2 border-b border-border/10 flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
              {name}
            </CardTitle>
            {confidenceBadge}
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {/* Computed Value */}
            <div className="text-center py-2">
              <span className="text-3xl font-extrabold font-mono tracking-tight text-foreground">
                {displayValue}
              </span>
            </div>

            {/* LaTeX Render */}
            <div className="bg-secondary/10 rounded-xl p-3 flex items-center justify-center overflow-x-auto select-all max-h-16 scrollbar-thin">
              <div
                className="text-sm font-serif select-all text-muted-foreground group-hover:text-foreground transition-colors"
                dangerouslySetInnerHTML={{ __html: latexHtml }}
              />
            </div>

            {/* Short Description */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          </CardContent>
        </div>

        <div className="px-6 pb-4 pt-2 border-t border-border/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] h-8 text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            {expanded ? "Ocultar Análisis" : "Análisis Académico"}
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 ml-auto" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 ml-auto" />
            )}
          </Button>

          {expanded && (
            <div className="text-xs space-y-3 pt-3 border-t border-border/10 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Interpretación
                </span>
                <p className="text-foreground leading-relaxed bg-secondary/15 rounded-lg p-2 border border-border/10">
                  {interpretation}
                </p>
              </div>

              {inputs_used && Object.keys(inputs_used).length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Parámetros Calculados
                  </span>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px] bg-secondary/10 p-2 rounded-lg">
                    {Object.entries(inputs_used).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-border/5 pb-1">
                        <span className="text-muted-foreground truncate">{k}:</span>
                        <span className="text-foreground font-semibold">
                          {typeof v === "number" ? formatNumber(v, 4) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {when_to_use && (
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Cuándo Usar
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    {when_to_use}
                  </p>
                </div>
              )}

              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Limitaciones
                </span>
                <p className="text-red-400/90 leading-relaxed flex gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500/80" />
                  {limitations}
                </p>
              </div>

              <div className="space-y-0.5 border-t border-border/5 pt-2">
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                  Origen / Referencia
                </span>
                <p className="text-[10px] text-muted-foreground/80 italic">
                  {origin}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
