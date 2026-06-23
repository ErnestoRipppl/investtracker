"use client";

import * as React from "react";
import { TransactionFilters as FiltersType } from "@/hooks/use-transactions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";

interface TransactionFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
}

export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
  const [tickerInput, setTickerInput] = React.useState(filters.ticker || "");

  // Debounce ticker input to prevent too many API requests
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (tickerInput !== (filters.ticker || "")) {
        onFiltersChange({
          ...filters,
          ticker: tickerInput || undefined,
          skip: 0, // Reset to first page when filtering
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [tickerInput, filters, onFiltersChange]);

  // Sync state if filters reset externally
  React.useEffect(() => {
    setTickerInput(filters.ticker || "");
  }, [filters.ticker]);

  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      transaction_type: value === "ALL" ? undefined : value,
      skip: 0,
    });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      start_date: e.target.value || undefined,
      skip: 0,
    });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      end_date: e.target.value || undefined,
      skip: 0,
    });
  };

  const clearFilters = () => {
    setTickerInput("");
    onFiltersChange({
      ticker: undefined,
      transaction_type: undefined,
      start_date: undefined,
      end_date: undefined,
      skip: 0,
      limit: filters.limit,
    });
  };

  const hasActiveFilters =
    !!filters.ticker ||
    !!filters.transaction_type ||
    !!filters.start_date ||
    !!filters.end_date;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card/60 p-4 backdrop-blur-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 items-end">
        {/* Ticker Search */}
        <div className="space-y-2">
          <Label htmlFor="search-ticker" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Buscar Ticker
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-ticker"
              placeholder="ej. AAPL, BTC"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              className="pl-9 bg-background/50 border-border/40 focus-visible:ring-emerald-500/50"
            />
          </div>
        </div>

        {/* Type Select */}
        <div className="space-y-2">
          <Label htmlFor="filter-type" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tipo
          </Label>
          <Select
            value={filters.transaction_type || "ALL"}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger id="filter-type" className="bg-background/50 border-border/40 focus:ring-emerald-500/50">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los tipos</SelectItem>
              <SelectItem value="BUY">Compra (BUY)</SelectItem>
              <SelectItem value="SELL">Venta (SELL)</SelectItem>
              <SelectItem value="DIVIDEND">Dividendo (DIVIDEND)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="start-date" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Desde
          </Label>
          <Input
            id="start-date"
            type="date"
            value={filters.start_date || ""}
            onChange={handleStartDateChange}
            className="bg-background/50 border-border/40 focus-visible:ring-emerald-500/50"
          />
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label htmlFor="end-date" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Hasta
          </Label>
          <Input
            id="end-date"
            type="date"
            value={filters.end_date || ""}
            onChange={handleEndDateChange}
            className="bg-background/50 border-border/40 focus-visible:ring-emerald-500/50"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
