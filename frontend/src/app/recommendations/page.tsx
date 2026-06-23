"use client";

import * as React from "react";
import { useActiveProfile } from "@/hooks/use-profile";
import { Recommendations } from "@/components/analytics/recommendations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle, Sparkles } from "lucide-react";

export default function RecommendationsPage() {
  const { data: profile, isLoading: isProfileLoading } = useActiveProfile();

  if (isProfileLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-secondary/50 rounded-lg" />
        <Card className="h-96" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm max-w-2xl mx-auto my-12 shadow-xl">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-primary" />
          <h3 className="text-xl font-bold">Perfil Inversor no Configurado</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Antes de poder ver las recomendaciones inteligentes, debes completar tu perfil respondiendo el cuestionario.
          </p>
          <Link href="/profile" className="mt-2">
            <Button>Completar Perfil</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-row justify-between items-center pb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Recomendaciones de Inversión</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Consejos de asignación personalizados en base a tu perfil inversor y broker
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl">
        <Recommendations showChart={true} />
      </div>
    </div>
  );
}
