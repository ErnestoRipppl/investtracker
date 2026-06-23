"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Holding, AssetType, PortfolioHistoryPoint } from "@/lib/types";

export interface PortfolioData {
  total_value_eur: number;
  total_value_usd: number;
  total_invested: number;
  total_pnl: number;
  total_pnl_pct: number;
  total_assets: number;
  holdings: Holding[];
  allocation_by_type: { name: string; value: number; percentage: number }[];
  allocation_by_sector: { name: string; value: number; percentage: number }[];
}

export interface PortfolioAllocation {
  by_type: { name: string; value: number; percentage: number }[];
  by_sector: { name: string; value: number; percentage: number }[];
}

interface ApiHolding {
  ticker: string;
  name: string;
  asset_type: string;
  accumulated_qty: number;
  avg_price: number;
  current_price: number;
  position_value: number;
  unrealized_pnl: number;
  pnl_pct: number;
  weight: number;
  currency?: string;
}

interface ApiHoldingsResponse {
  total_value_eur?: number;
  total_value_usd?: number;
  total_invested?: number;
  total_pnl?: number;
  total_pnl_pct?: number;
  total_assets?: number;
  holdings?: ApiHolding[];
  allocation_by_type?: { name: string; value: number; percentage: number }[];
  allocation_by_sector?: { name: string; value: number; percentage: number }[];
}

interface ApiHistorySnapshot {
  date: string;
  total_value_eur?: number;
  total_invested?: number;
}

interface ApiAllocationResponse {
  by_type?: { name: string; value: number; percentage: number }[];
  by_sector?: { name: string; value: number; percentage: number }[];
}

export function usePortfolio() {
  return useQuery<PortfolioData>({
    queryKey: ["portfolio", "holdings"],
    queryFn: async () => {
      const data = await apiFetch<ApiHoldingsResponse>("/api/portfolio/holdings");
      
      const holdings: Holding[] = (data.holdings || []).map((h: ApiHolding) => ({
        ticker: h.ticker,
        asset_name: h.name,
        asset_type: (h.asset_type.charAt(0).toUpperCase() + h.asset_type.slice(1)) as AssetType,
        quantity: h.accumulated_qty,
        avg_cost: h.avg_price,
        current_price: h.current_price,
        market_value: h.position_value,
        unrealized_pnl: h.unrealized_pnl,
        unrealized_pnl_pct: h.pnl_pct,
        weight: h.weight,
        currency: h.currency || "EUR",
      }));

      return {
        total_value_eur: data.total_value_eur ?? 0,
        total_value_usd: data.total_value_usd ?? 0,
        total_invested: data.total_invested ?? 0,
        total_pnl: data.total_pnl ?? 0,
        total_pnl_pct: data.total_pnl_pct ?? 0,
        total_assets: data.total_assets ?? 0,
        holdings,
        allocation_by_type: data.allocation_by_type ?? [],
        allocation_by_sector: data.allocation_by_sector ?? [],
      };
    },
  });
}

export function usePortfolioHistory(limit: number = 30) {
  return useQuery<PortfolioHistoryPoint[]>({
    queryKey: ["portfolio", "history", limit],
    queryFn: async () => {
      const data = await apiFetch<ApiHistorySnapshot[]>(`/api/portfolio/history?limit=${limit}`);
      // Map historical snapshots (already sorted chronologically by the backend)
      return [...data].map((s: ApiHistorySnapshot) => ({
        date: s.date,
        value: s.total_value_eur ?? 0,
        invested: s.total_invested ?? 0,
      }));
    },
  });
}

export function usePortfolioAllocation() {
  return useQuery<PortfolioAllocation>({
    queryKey: ["portfolio", "allocation"],
    queryFn: async () => {
      const data = await apiFetch<ApiAllocationResponse>("/api/portfolio/allocation");
      return {
        by_type: data.by_type ?? [],
        by_sector: data.by_sector ?? [],
      };
    },
  });
}
