"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolioHistory } from "@/hooks/use-portfolio";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

// ─── Custom Tooltip Component ──────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
    payload: unknown;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-popover/95 backdrop-blur-sm p-3 shadow-xl">
      <p className="text-xs font-semibold text-muted-foreground mb-2">
        {label ? formatDate(label) : ""}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
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
        {payload.length === 2 && (
          <div className="pt-1.5 mt-1.5 border-t border-border/40 flex items-center justify-between text-xs font-medium text-emerald-500">
            <span>P&L Estimado</span>
            <span className="font-mono">
              {formatCurrency(payload[0].value - payload[1].value)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chart Component ─────────────────────────────────────────────

export function NetWorthChart() {
  const { data: history, isLoading, isError } = usePortfolioHistory();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="h-[320px] flex items-center justify-center">
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !history) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="h-[320px] flex items-center justify-center text-center text-sm text-red-500">
          Error al cargar el rendimiento histórico.
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Rendimiento Histórico</CardTitle>
          <CardDescription>Evolución del patrimonio vs capital invertido</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] flex flex-col items-center justify-center text-center text-muted-foreground text-sm space-y-2">
          <p>No hay suficientes datos históricos disponibles.</p>
          <p className="text-xs text-muted-foreground/60">
            Registra transacciones para empezar a trazar el rendimiento en el tiempo.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem);
      // Format as "21 Jun"
      return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(date);
    } catch {
      return tickItem;
    }
  };

  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k €`;
    }
    return `${value} €`;
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Rendimiento Histórico</CardTitle>
          <CardDescription>Evolución del patrimonio vs capital invertido</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={history}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                tickLine={false}
                axisLine={false}
                dy={10}
                className="text-[10px] fill-muted-foreground"
              />
              <YAxis
                tickFormatter={formatYAxis}
                tickLine={false}
                axisLine={false}
                dx={-5}
                className="text-[10px] fill-muted-foreground font-mono"
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(16, 185, 129, 0.2)", strokeWidth: 1.5 }} />
              <Area
                type="monotone"
                dataKey="value"
                name="Patrimonio Neto"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
              <Area
                type="monotone"
                dataKey="invested"
                name="Capital Invertido"
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorInvested)"
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                className="text-xs"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
