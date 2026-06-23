"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface MarketPrice {
  price: number | null;
  stale: boolean;
}

export type MarketPricesResponse = Record<string, MarketPrice>;

export function useMarketPrices(tickers: string[]) {
  const tickerString = tickers
    .map((t) => t.toUpperCase().trim())
    .filter(Boolean)
    .join(",");

  return useQuery<MarketPricesResponse>({
    queryKey: ["market", "prices", tickerString],
    queryFn: async () => {
      if (!tickerString) return {};
      return apiFetch<MarketPricesResponse>(
        `/api/market/prices?tickers=${encodeURIComponent(tickerString)}`
      );
    },
    enabled: tickers.length > 0,
    staleTime: 30 * 1000, // 30 seconds stale time for market data
  });
}

interface ForceRefreshResponse {
  success: boolean;
  refreshed?: string[] | number;
}

export function useForceRefreshPrices() {
  const queryClient = useQueryClient();

  return useMutation<
    ForceRefreshResponse,
    Error,
    string[] | undefined
  >({
    mutationFn: async (tickers) => {
      const tickersParam =
        tickers && tickers.length > 0
          ? `?tickers=${encodeURIComponent(tickers.join(","))}`
          : "";
      return apiFetch<ForceRefreshResponse>(`/api/market/refresh${tickersParam}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market", "prices"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
