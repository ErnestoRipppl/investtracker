"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { usePortfolioAllocation } from "@/hooks/use-portfolio";
import { formatCurrency } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// ─── Constants & Colors ─────────────────────────────────────────

const COLOR_PALETTE = [
  "hsl(160, 84%, 39%)", // emerald
  "hsl(198, 93%, 55%)", // blue
  "hsl(262, 83%, 58%)", // purple
  "hsl(47, 96%, 53%)",  // amber
  "hsl(325, 83%, 58%)", // pink
  "hsl(12, 76%, 61%)",   // orange
  "hsl(175, 75%, 41%)",  // teal
  "hsl(215, 16%, 47%)",  // slate
];

const TYPE_TRANSLATIONS: Record<string, string> = {
  stock: "Acciones",
  etf: "ETFs",
  fund: "Fondos de Inversión",
  crypto: "Criptomonedas",
  bond: "Renta Fija / Bonos",
  other: "Otros",
};

const formatLabel = (name: string): string => {
  const key = name.toLowerCase().trim();
  return TYPE_TRANSLATIONS[key] || name.charAt(0).toUpperCase() + name.slice(1);
};

// ─── Custom Tooltip ─────────────────────────────────────────────

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: {
      name: string;
      value: number;
      percentage: number;
      fill: string;
    };
  }>;
}

function CustomTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border/50 bg-popover/95 backdrop-blur-sm p-3 shadow-xl">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: data.fill }}
        />
        <span className="text-xs font-semibold text-foreground">
          {formatLabel(data.name)}
        </span>
      </div>
      <div className="space-y-0.5 text-xs text-muted-foreground font-mono">
        <p>Valor: {formatCurrency(data.value)}</p>
        <p>Porcentaje: {data.percentage.toFixed(2)}%</p>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function AllocationPie() {
  const { data: allocation, isLoading, isError } = usePortfolioAllocation();
  const [activeTab, setActiveTab] = useState<"type" | "sector">("type");
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
          <Skeleton className="h-48 w-48 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !allocation) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="h-[320px] flex items-center justify-center text-center text-sm text-red-500">
          Error al cargar la asignación de activos.
        </CardContent>
      </Card>
    );
  }

  const chartData = activeTab === "type" ? allocation.by_type : allocation.by_sector;

  if (chartData.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Distribución de Activos</CardTitle>
          <CardDescription>Asignación actual de la cartera</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] flex flex-col items-center justify-center text-center text-muted-foreground text-sm space-y-2">
          <p>No hay activos registrados en tu cartera.</p>
          <p className="text-xs text-muted-foreground/60">
            Ve a Transacciones o Importar para añadir tus inversiones.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Inject colors into the data
  const dataWithColors = chartData.map((item, index) => ({
    ...item,
    fill: COLOR_PALETTE[index % COLOR_PALETTE.length],
  }));

  const totalValue = dataWithColors.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Distribución de Activos</CardTitle>
            <CardDescription>Visualización de la asignación del portfolio</CardDescription>
          </div>
          <div className="flex bg-secondary/50 rounded-lg p-0.5 border border-border/30">
            <Button
              variant={activeTab === "type" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("type")}
              className="text-xs h-7 px-2.5"
            >
              Tipo
            </Button>
            <Button
              variant={activeTab === "sector" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("sector")}
              className="text-xs h-7 px-2.5"
            >
              Sector
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center min-h-[250px]">
          {/* Pie Chart */}
          <div className="h-[200px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={dataWithColors}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {dataWithColors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} className="stroke-background/50 stroke-2 outline-none" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Total
              </span>
              <span className="text-sm font-bold font-mono text-foreground mt-0.5">
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>

          {/* Legend Details */}
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {dataWithColors.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs border-b border-border/10 pb-1.5 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="font-medium truncate text-muted-foreground group-hover:text-foreground transition-colors">
                    {formatLabel(item.name)}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 font-mono pl-2">
                  <span className="text-muted-foreground/60">{item.percentage.toFixed(1)}%</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
