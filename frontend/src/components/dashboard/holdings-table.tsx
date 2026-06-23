"use client";

import { usePortfolio } from "@/hooks/use-portfolio";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, getPnlColor, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export function HoldingsTable() {
  const { data, isLoading, isError } = usePortfolio();

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-8 text-center text-sm text-red-500">
          Error al cargar los activos del portfolio.
        </CardContent>
      </Card>
    );
  }

  const { holdings } = data;

  const formatAssetType = (type: string) => {
    const t = type.toLowerCase();
    if (t === "stock" || t === "accion") return "Acción";
    if (t === "crypto" || t === "cripto") return "Cripto";
    if (t === "etf") return "ETF";
    if (t === "bond" || t === "bono") return "Bono";
    if (t === "fund" || t === "fondo") return "Fondo";
    return type;
  };

  if (holdings.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Activos en Cartera</CardTitle>
          <CardDescription>Resumen de tus posiciones abiertas</CardDescription>
        </CardHeader>
        <CardContent className="p-8 text-center text-muted-foreground text-sm space-y-2">
          <p>No tienes posiciones abiertas.</p>
          <p className="text-xs text-muted-foreground/60">
            Añade transacciones para ver tus activos listados aquí con cálculos de ganancias y pérdidas en tiempo real.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Activos en Cartera</CardTitle>
        <CardDescription>Monitorea el coste medio, precio actual, pesos y P&L de tus posiciones</CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-border/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground">Ticker</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Nombre</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Cant.</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Coste Medio</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Precio Act.</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Invertido</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Valor Mercado</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">P&L Latente</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">P&L %</TableHead>
                <TableHead className="text-right font-semibold text-muted-foreground">Peso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="border-none">
              {holdings.map((h, index) => {
                const pnlColor = getPnlColor(h.unrealized_pnl);
                const isPositive = h.unrealized_pnl >= 0;
                const totalInvested = h.quantity * h.avg_cost;

                return (
                  <TableRow key={index} className="border-b border-border/30 hover:bg-accent/40 transition-colors">
                    <TableCell className="font-semibold text-foreground">{h.ticker}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[150px]" title={h.asset_name}>
                      {h.asset_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-[10px] font-medium px-2 py-0.5">
                        {formatAssetType(h.asset_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{h.quantity.toLocaleString("es-ES")}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(h.avg_cost, h.currency)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium">{formatCurrency(h.current_price, h.currency)}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatCurrency(totalInvested, h.currency)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(h.market_value, h.currency)}</TableCell>
                    <TableCell className={cn("text-right font-mono text-xs font-semibold", pnlColor)}>
                      {isPositive ? "+" : ""}{formatCurrency(h.unrealized_pnl, h.currency)}
                    </TableCell>
                    <TableCell className={cn("text-right font-mono text-xs font-semibold flex items-center justify-end gap-0.5", pnlColor)}>
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3 inline shrink-0" />
                      ) : (
                        <TrendingDown className="h-3 w-3 inline shrink-0" />
                      )}
                      <span>{isPositive ? "+" : ""}{h.unrealized_pnl_pct.toFixed(2)}%</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium">{h.weight.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-3 p-4 pt-0">
          {holdings.map((h, index) => {
            const pnlColor = getPnlColor(h.unrealized_pnl);
            const isPositive = h.unrealized_pnl >= 0;
            const totalInvested = h.quantity * h.avg_cost;

            return (
              <div
                key={index}
                className="rounded-xl border border-border/30 p-4 space-y-3 bg-secondary/20 hover:border-primary/20 transition-all"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{h.ticker}</span>
                    <Badge variant="secondary" className="capitalize text-[9px] px-1.5 py-0">
                      {formatAssetType(h.asset_type)}
                    </Badge>
                  </div>
                  <span className={cn("text-xs font-bold font-mono flex items-center gap-0.5", pnlColor)}>
                    {isPositive ? "+" : ""}{h.unrealized_pnl_pct.toFixed(2)}%
                  </span>
                </div>

                {/* Subtitle */}
                <p className="text-xs text-muted-foreground truncate">{h.asset_name}</p>

                {/* Info Grid */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/10 text-xs">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Cantidad</p>
                    <p className="font-mono font-medium mt-0.5">{h.quantity.toLocaleString("es-ES")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Precio Act.</p>
                    <p className="font-mono font-medium mt-0.5">{formatCurrency(h.current_price, h.currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Valor Mercado</p>
                    <p className="font-mono font-semibold mt-0.5">{formatCurrency(h.market_value, h.currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Invertido</p>
                    <p className="font-mono text-muted-foreground mt-0.5">{formatCurrency(totalInvested, h.currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">P&L Latente</p>
                    <p className={cn("font-mono font-semibold mt-0.5", pnlColor)}>
                      {isPositive ? "+" : ""}{formatCurrency(h.unrealized_pnl, h.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Peso</p>
                    <p className="font-mono font-medium mt-0.5">{h.weight.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
