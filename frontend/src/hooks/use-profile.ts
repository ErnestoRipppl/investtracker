"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface QuestionnaireOption {
  value: string;
  label: string;
  score: number;
}

export interface QuestionnaireQuestion {
  id: string;
  section: string;
  text: string;
  type: string;
  options: QuestionnaireOption[];
}

export interface ProfileResponse {
  id: number;
  profile_type: string;
  risk_tolerance_score: number;
  time_horizon_years: number;
  investment_objective: string;
  max_acceptable_drawdown_pct: number;
  recommended_allocation: Record<string, number>;
  is_active: boolean;
}

export function useQuestionnaire() {
  return useQuery<QuestionnaireQuestion[]>({
    queryKey: ["questionnaire-questions"],
    queryFn: () => apiFetch<QuestionnaireQuestion[]>("/api/profile/questionnaire"),
    staleTime: 1000 * 60 * 60, // Questionnaire doesn't change often
  });
}

export function useActiveProfile() {
  return useQuery<ProfileResponse | null, Error>({
    queryKey: ["active-profile"],
    queryFn: async () => {
      // The backend returns 404 if no profile exists
      try {
        return await apiFetch<ProfileResponse>("/api/profile/");
      } catch (error) {
        if ((error as { status?: number }).status === 404) {
          // Return null as a valid state representing no profile
          return null;
        }
        throw error;
      }
    },
    retry: false, // Don't retry on 404
  });
}

export function useSubmitQuestionnaire() {
  const queryClient = useQueryClient();
  return useMutation<ProfileResponse, Error, Record<string, string>>({
    mutationFn: async (answers) => {
      return apiFetch<ProfileResponse>("/api/profile/questionnaire", {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-profile"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<ProfileResponse, Error, Record<string, string>>({
    mutationFn: async (answers) => {
      return apiFetch<ProfileResponse>("/api/profile/", {
        method: "PUT",
        body: JSON.stringify({ answers }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-profile"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}
