"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, Info } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { useAppReducedMotion } from "@/lib/motion";

interface MonteCarloSummary {
  median_final: number;
  mean_final: number;
  best_case: number;
  worst_case: number;
  prob_profit: number;
}

interface MonteCarloResponse {
  paths: number[][];
  percentiles: {
    p5: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
  };
  summary: MonteCarloSummary;
  years: number;
  n_simulations: number;
  formula: string;
}

export function MonteCarlo() {
  const reducedMotion = useAppReducedMotion();
  const [years, setYears] = React.useState<number>(5);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animationRef = React.useRef<number | null>(null);

  // Fetch simulation data
  const { data, isLoading, isFetching, isError, error } = useQuery<MonteCarloResponse>({
    queryKey: ["analytics", "monte-carlo", years],
    queryFn: () => apiFetch<MonteCarloResponse>(`/api/analytics/monte-carlo?years=${years}&n_simulations=5000`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle drawing and animation inside useEffect
  React.useEffect(() => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Set canvas dimensions with high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Padding
    const paddingLeft = 65;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const drawWidth = width - paddingLeft - paddingRight;
    const drawHeight = height - paddingTop - paddingBottom;

    // Retrieve series
    const { paths, percentiles } = data;
    const { p5, p25, p50, p75, p95 } = percentiles;
    const numPoints = p5.length;

    // Find global min and max for Y-axis scaling
    let globalMax = Math.max(...p95);
    let globalMin = Math.min(...p5);
    // Add margin
    const diff = globalMax - globalMin;
    globalMax += diff * 0.05;
    globalMin = Math.max(0, globalMin - diff * 0.05);

    // Mappings
    const getX = (index: number) => {
      return paddingLeft + (index / (numPoints - 1)) * drawWidth;
    };

    const getY = (val: number) => {
      const ratio = (val - globalMin) / (globalMax - globalMin);
      return paddingTop + drawHeight - ratio * drawHeight;
    };

    // Animation states
    let frame = 0;
    const totalFrames = reducedMotion ? 1 : 120; // 1 frame if reduced motion, 120 frames (2s) otherwise
    const speed = numPoints / totalFrames;

    const drawLoop = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Grid Lines and Labels
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const val = globalMin + (i / gridLines) * (globalMax - globalMin);
        const y = getY(val);
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();

        // Label
        ctx.fillText(formatCurrency(val, "EUR"), paddingLeft - 8, y);
      }

      // X-axis years labels
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const yearStep = Math.max(1, Math.round(years / 5));
      for (let yr = 0; yr <= years; yr += yearStep) {
        const index = Math.round((yr / years) * (numPoints - 1));
        const x = getX(index);
        
        ctx.beginPath();
        ctx.moveTo(x, height - paddingBottom);
        ctx.lineTo(x, height - paddingBottom + 4);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.stroke();

        ctx.fillText(`Año ${yr}`, x, height - paddingBottom + 8);
      }

      // 2. Animate index limit
      frame++;
      const currentIndex = reducedMotion ? numPoints : Math.min(numPoints, Math.round(frame * speed));

      // 3. Draw Confidence Bands (Shaded Areas)
      if (currentIndex > 1) {
        // P5 - P95 outer band (light gray-red)
        ctx.fillStyle = "rgba(239, 68, 68, 0.04)";
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(p5[0]));
        for (let i = 1; i < currentIndex; i++) {
          ctx.lineTo(getX(i), getY(p5[i]));
        }
        for (let i = currentIndex - 1; i >= 0; i--) {
          ctx.lineTo(getX(i), getY(p95[i]));
        }
        ctx.closePath();
        ctx.fill();

        // P25 - P75 inner band (light emerald)
        ctx.fillStyle = "rgba(16, 185, 129, 0.07)";
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(p25[0]));
        for (let i = 1; i < currentIndex; i++) {
          ctx.lineTo(getX(i), getY(p25[i]));
        }
        for (let i = currentIndex - 1; i >= 0; i--) {
          ctx.lineTo(getX(i), getY(p75[i]));
        }
        ctx.closePath();
        ctx.fill();
      }

      // 4. Draw Downsampled Representative Paths (Low Opacity)
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = "rgba(16, 185, 129, 0.02)"; // very faint green paths
      for (const path of paths) {
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(path[0]));
        for (let i = 1; i < currentIndex; i++) {
          ctx.lineTo(getX(i), getY(path[i]));
        }
        ctx.stroke();
      }

      // 5. Draw Median Path (P50 - bold green line)
      if (currentIndex > 1) {
        ctx.strokeStyle = "#10b981"; // emerald-500
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(p50[0]));
        for (let i = 1; i < currentIndex; i++) {
          ctx.lineTo(getX(i), getY(p50[i]));
        }
        ctx.stroke();
        
        // P95 line
        ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(p95[0]));
        for (let i = 1; i < currentIndex; i++) {
          ctx.lineTo(getX(i), getY(p95[i]));
        }
        ctx.stroke();

        // P5 line
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(p5[0]));
        for (let i = 1; i < currentIndex; i++) {
          ctx.lineTo(getX(i), getY(p5[i]));
        }
        ctx.stroke();
        ctx.setLineDash([]); // reset dash
      }

      // Continue animation if not fully drawn
      if (currentIndex < numPoints) {
        animationRef.current = requestAnimationFrame(drawLoop);
      }
    };

    drawLoop();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [data, years, reducedMotion]);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/85 backdrop-blur-sm shadow-md">
        <CardContent className="p-8 text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
          <p className="text-sm text-muted-foreground">Ejecutando simulación de Monte Carlo...</p>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/10">
        <CardContent className="p-6 text-center space-y-4">
          <Info className="h-10 w-10 text-destructive mx-auto" />
          <h3 className="text-lg font-bold text-destructive">Error en la simulación</h3>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "No se pudo proyectar el portfolio."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { summary } = data;

  return (
    <Card className="border-border/50 bg-card/85 backdrop-blur-sm shadow-md">
      <CardHeader className="pb-3 border-b border-border/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Simulación de Monte Carlo
          </CardTitle>
          <CardDescription>
            Proyección probabilística del patrimonio neto usando Movimiento Browniano Geométrico (GBM)
          </CardDescription>
        </div>
        
        {/* Controls: Horizon Slider with >=44px touch area */}
        <div className="flex items-center gap-4 min-w-[240px] py-1">
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
              <Label htmlFor="horizon-slider" className="text-foreground">Horizonte Temporal</Label>
              <span>{years} años</span>
            </div>
            <div className="py-2 flex items-center min-h-[44px]"> {/* minimum touch area */}
              <Slider
                id="horizon-slider"
                min={1}
                max={15}
                step={1}
                value={[years]}
                onValueChange={(val) => {
                  if (Array.isArray(val)) {
                    setYears(val[0]);
                  }
                }}
                disabled={isFetching}
                className="w-full cursor-pointer"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Canvas Visualizer */}
        <div className="relative bg-black/30 rounded-xl overflow-hidden border border-border/5">
          {isFetching && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="w-full h-80 block bg-transparent"
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground font-semibold justify-center pb-2 border-b border-border/10">
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-4 bg-emerald-500 rounded" />
            <span>Mediana (P50)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-4 border-t border-dashed border-red-400/50" />
            <span>Extremos (P5 / P95)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-4 bg-emerald-500/10 rounded" />
            <span>Banda Típica (P25 - P75)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-4 bg-red-500/5 rounded" />
            <span>Banda Extrema (P5 - P95)</span>
          </div>
        </div>

        {/* Simulation Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2">
          <div className="rounded-lg border border-border/20 bg-secondary/5 p-3">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Mediana Final</span>
            <p className="text-sm font-bold font-mono text-foreground mt-1">
              {formatCurrency(summary.median_final)}
            </p>
          </div>
          <div className="rounded-lg border border-border/20 bg-secondary/5 p-3">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Media Final</span>
            <p className="text-sm font-bold font-mono text-foreground mt-1">
              {formatCurrency(summary.mean_final)}
            </p>
          </div>
          <div className="rounded-lg border border-border/20 bg-secondary/5 p-3">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Peor Escenario (P5)</span>
            <p className="text-sm font-bold font-mono text-red-400 mt-1">
              {formatCurrency(summary.worst_case)}
            </p>
          </div>
          <div className="rounded-lg border border-border/20 bg-secondary/5 p-3">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Mejor Escenario (P95)</span>
            <p className="text-sm font-bold font-mono text-emerald-400 mt-1">
              {formatCurrency(summary.best_case)}
            </p>
          </div>
          <div className="rounded-lg border border-border/20 bg-secondary/5 p-3 col-span-2 md:col-span-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Prob. Rentabilidad</span>
            <p className="text-sm font-bold font-mono text-emerald-400 mt-1">
              {formatPercent(summary.prob_profit)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
