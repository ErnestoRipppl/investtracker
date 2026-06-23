"use client";

import * as React from "react";
import { ProfileResponse } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Target, Clock, RefreshCw, AlertCircle } from "lucide-react";

interface ProfileSummaryProps {
  profile: ProfileResponse;
  onReevaluate: () => void;
}

export function ProfileSummary({ profile, onReevaluate }: ProfileSummaryProps) {
  const getProfileTypeDetails = (type: string) => {
    const key = type.toUpperCase();
    switch (key) {
      case "CONSERVATIVE":
        return {
          title: "Conservador",
          description: "Priorizas la seguridad y la preservación de tu capital sobre el crecimiento a largo plazo. Tolerancia muy baja a las caídas temporales del mercado.",
          color: "text-blue-400 border-blue-500/20 bg-blue-500/5",
          accentColor: "#60a5fa",
        };
      case "MODERATE_CONSERVATIVE":
        return {
          title: "Moderado Conservador",
          description: "Buscas cierta estabilidad y protección contra la inflación, pero estás dispuesto a asumir un nivel muy bajo de riesgo para lograr un crecimiento modesto.",
          color: "text-sky-400 border-sky-500/20 bg-sky-500/5",
          accentColor: "#38bdf8",
        };
      case "MODERATE":
        return {
          title: "Moderado",
          description: "Buscas un equilibrio equilibrado entre ingresos recurrentes y crecimiento del capital. Aceptas fluctuaciones moderadas del mercado a corto plazo.",
          color: "text-teal-400 border-teal-500/20 bg-teal-500/5",
          accentColor: "#2dd4bf",
        };
      case "MODERATE_AGGRESSIVE":
        return {
          title: "Moderado Agresivo",
          description: "Tu objetivo es el crecimiento a largo plazo y estás dispuesto a aceptar una volatilidad e incertidumbre notables para batir al mercado a largo plazo.",
          color: "text-orange-400 border-orange-500/20 bg-orange-500/5",
          accentColor: "#fb923c",
        };
      case "AGGRESSIVE":
        return {
          title: "Agresivo",
          description: "Maximizas el crecimiento de tu capital asumiendo altos niveles de riesgo. Toleras caídas de mercado muy pronunciadas con un horizonte de inversión amplio.",
          color: "text-rose-400 border-rose-500/20 bg-rose-500/5",
          accentColor: "#f87171",
        };
      default:
        return {
          title: type,
          description: "Perfil de riesgo calculado según tus respuestas en el cuestionario de inversión.",
          color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
          accentColor: "#34d399",
        };
    }
  };

  const details = getProfileTypeDetails(profile.profile_type);

  // Asset class labels translator
  const getAllocationLabel = (key: string) => {
    switch (key.toLowerCase()) {
      case "renta_variable":
        return "Renta Variable (Acciones, ETFs)";
      case "renta_fija":
        return "Renta Fija (Bonos, Letras)";
      case "alternativos":
        return "Activos Alternativos (Oro, Criptomonedas)";
      case "liquidez":
      case "cash":
        return "Liquidez (Efectivo, Depósitos)";
      default:
        return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }
  };

  const getAllocationColor = (key: string) => {
    switch (key.toLowerCase()) {
      case "renta_variable":
        return "bg-emerald-500";
      case "renta_fija":
        return "bg-sky-500";
      case "alternativos":
        return "bg-amber-500";
      case "liquidez":
      case "cash":
        return "bg-indigo-500";
      default:
        return "bg-primary";
    }
  };

  // SVG Gauge details
  const radius = 40;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(profile.risk_tolerance_score, 100) / 100) * circumference;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Risk Profile Card */}
      <Card className="border-border/50 bg-card/85 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-3 border-b border-border/10">
          <CardTitle className="text-base font-semibold">Tu Perfil de Inversión</CardTitle>
          <CardDescription>Resultado de tu cuestionario de riesgo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Risk Dial Gauge */}
          <div className="flex flex-col items-center py-2">
            <div className="relative h-28 w-28 flex items-center justify-center">
              <svg className="absolute transform -rotate-90 w-full h-full">
                {/* Background Ring */}
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {/* Active Ring */}
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  stroke={details.accentColor}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="text-center z-10 space-y-0.5">
                <span className="text-2xl font-bold font-mono tracking-tight" style={{ color: details.accentColor }}>
                  {profile.risk_tolerance_score}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Score</span>
              </div>
            </div>

            <Badge className={`mt-4 px-3 py-1 text-xs border font-bold ${details.color}`}>
              Perfil {details.title}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground text-center px-2 leading-relaxed">
            {details.description}
          </p>

          <div className="space-y-3 pt-3 border-t border-border/10 text-xs">
            {/* Risk profile metrics */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-8 w-8 rounded-lg bg-secondary/30 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Drawdown Máximo</p>
                <p className="font-semibold text-foreground mt-0.5">
                  Hasta {profile.max_acceptable_drawdown_pct}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 py-1">
              <div className="h-8 w-8 rounded-lg bg-secondary/30 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Horizonte Temporal</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {profile.time_horizon_years} años
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 py-1">
              <div className="h-8 w-8 rounded-lg bg-secondary/30 flex items-center justify-center shrink-0">
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Objetivo Principal</p>
                <p className="font-semibold text-foreground mt-0.5 truncate capitalize">
                  {profile.investment_objective.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={onReevaluate}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 text-xs h-9 border-border/50 bg-secondary/15 hover:bg-secondary/25"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Re-evaluar / Editar Perfil
          </Button>
        </CardContent>
      </Card>

      {/* Recommended Allocations Card */}
      <Card className="lg:col-span-2 border-border/50 bg-card/85 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-3 border-b border-border/10">
          <CardTitle className="text-base font-semibold">Distribución de Activos Recomendada</CardTitle>
          <CardDescription>Distribución porcentual óptima para mitigar riesgos según tu perfil</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Allocation progress bars */}
          <div className="space-y-5">
            {Object.entries(profile.recommended_allocation).map(([assetClass, percentage]) => (
              <div key={assetClass} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                  <span className="text-foreground">{getAllocationLabel(assetClass)}</span>
                  <span className="font-mono text-foreground">{percentage}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getAllocationColor(assetClass)} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Allocation Pie Visual Representer */}
          <div className="rounded-xl border border-border/20 bg-secondary/10 p-4 space-y-3">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <AlertCircle className="h-4 w-4 text-emerald-500" />
              ¿Por qué esta distribución?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Basado en la metodología clásica de optimización de carteras, un perfil{" "}
              <strong className="text-foreground">{details.title}</strong> requiere un peso del{" "}
              <strong className="text-foreground">{profile.recommended_allocation["renta_variable"] || 0}%</strong> en Renta Variable para capturar primas de riesgo, amortiguado por un{" "}
              <strong className="text-foreground">{profile.recommended_allocation["renta_fija"] || 0}%</strong> en activos de renta fija que ofrecen rentabilidad periódica y mitigan la volatilidad de tu patrimonio.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
