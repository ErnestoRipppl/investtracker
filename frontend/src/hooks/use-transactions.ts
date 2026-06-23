"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiDelete } from "@/lib/api";
import { Transaction, TransactionType } from "@/lib/types";

export interface TransactionFilters {
  ticker?: string;
  transaction_type?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}

interface ApiTransaction {
  id: number;
  asset_id: number;
  ticker: string;
  transaction_type: string;
  quantity: number;
  unit_price: number;
  commission: number;
  total_invested: number;
  notes: string | null;
  date: string;
  broker_id: number | null;
  created_at: string;
}

interface ApiTransactionListResponse {
  total: number;
  items: ApiTransaction[];
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<{ total: number; items: Transaction[] }>({
    queryKey: ["transactions", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.ticker) params.append("ticker", filters.ticker);
      if (filters.transaction_type) {
        params.append("transaction_type", filters.transaction_type.toLowerCase());
      }
      if (filters.start_date) params.append("start_date", filters.start_date);
      if (filters.end_date) params.append("end_date", filters.end_date);
      if (filters.skip !== undefined) params.append("skip", filters.skip.toString());
      if (filters.limit !== undefined) params.append("limit", filters.limit.toString());

      const data = await apiFetch<ApiTransactionListResponse>(`/api/transactions/?${params.toString()}`);
      
      return {
        total: data.total ?? 0,
        items: (data.items || []).map((item: ApiTransaction) => ({
          id: item.id,
          ticker: item.ticker,
          asset_name: item.ticker,
          type: item.transaction_type.toUpperCase() as TransactionType,
          date: item.date,
          quantity: item.quantity,
          price: item.unit_price,
          fees: item.commission,
          currency: "EUR",
          broker: item.broker_id ? `Broker ${item.broker_id}` : "Default",
          notes: item.notes,
          created_at: item.created_at,
        })),
      };
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation<Transaction, Error, Omit<Transaction, "id" | "created_at" | "asset_name">>({
    mutationFn: async (newTx) => {
      const backendPayload = {
        ticker: newTx.ticker,
        transaction_type: newTx.type.toLowerCase(),
        quantity: newTx.quantity,
        unit_price: newTx.price,
        commission: newTx.fees ?? 0,
        notes: newTx.notes ?? null,
        date: newTx.date,
        broker_id: null, // Default to null; can be extended if broker ID lookup is implemented
      };

      const item = await apiFetch<ApiTransaction>("/api/transactions/", {
        method: "POST",
        body: JSON.stringify(backendPayload),
      });

      return {
        id: item.id,
        ticker: item.ticker,
        asset_name: item.ticker,
        type: item.transaction_type.toUpperCase() as TransactionType,
        date: item.date,
        quantity: item.quantity,
        price: item.unit_price,
        fees: item.commission,
        currency: "EUR",
        broker: item.broker_id ? `Broker ${item.broker_id}` : "Default",
        notes: item.notes,
        created_at: item.created_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation<Transaction, Error, { id: number; data: Partial<Omit<Transaction, "id" | "created_at" | "asset_name">> }>({
    mutationFn: async ({ id, data }) => {
      const backendPayload: Record<string, unknown> = {};
      if (data.ticker !== undefined) backendPayload.ticker = data.ticker;
      if (data.type !== undefined) backendPayload.transaction_type = data.type.toLowerCase();
      if (data.quantity !== undefined) backendPayload.quantity = data.quantity;
      if (data.price !== undefined) backendPayload.unit_price = data.price;
      if (data.fees !== undefined) backendPayload.commission = data.fees;
      if (data.notes !== undefined) backendPayload.notes = data.notes;
      if (data.date !== undefined) backendPayload.date = data.date;

      const item = await apiFetch<ApiTransaction>(`/api/transactions/${id}`, {
        method: "PUT",
        body: JSON.stringify(backendPayload),
      });

      return {
        id: item.id,
        ticker: item.ticker,
        asset_name: item.ticker,
        type: item.transaction_type.toUpperCase() as TransactionType,
        date: item.date,
        quantity: item.quantity,
        price: item.unit_price,
        fees: item.commission,
        currency: "EUR",
        broker: item.broker_id ? `Broker ${item.broker_id}` : "Default",
        notes: item.notes,
        created_at: item.created_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiDelete(`/api/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
