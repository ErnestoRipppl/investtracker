"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiDelete } from "@/lib/api";

export interface Broker {
  id: number;
  name: string;
  commission_type: string;
  commission_fixed_eur: number;
  commission_pct: number;
  min_commission_eur: number;
  max_commission_eur: number | null;
  custody_fee_annual_pct: number;
  fx_spread_pct: number;
  is_default: boolean;
  created_at: string;
}

export type BrokerCreatePayload = Omit<Broker, "id" | "created_at">;
export type BrokerUpdatePayload = Partial<BrokerCreatePayload>;

export function useBrokers() {
  return useQuery<Broker[]>({
    queryKey: ["brokers"],
    queryFn: () => apiFetch<Broker[]>("/api/brokers/"),
  });
}

export function useCreateBroker() {
  const queryClient = useQueryClient();
  return useMutation<Broker, Error, BrokerCreatePayload>({
    mutationFn: (newBroker) =>
      apiFetch<Broker>("/api/brokers/", {
        method: "POST",
        body: JSON.stringify(newBroker),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokers"] });
    },
  });
}

export function useUpdateBroker() {
  const queryClient = useQueryClient();
  return useMutation<Broker, Error, { id: number; data: BrokerUpdatePayload }>({
    mutationFn: ({ id, data }) =>
      apiFetch<Broker>(`/api/brokers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokers"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteBroker() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => apiDelete(`/api/brokers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokers"] });
    },
  });
}
