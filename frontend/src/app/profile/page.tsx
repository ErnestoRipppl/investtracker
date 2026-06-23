"use client";

import * as React from "react";
import { useActiveProfile } from "@/hooks/use-profile";
import { Questionnaire } from "@/components/profile/questionnaire";
import { ProfileSummary } from "@/components/profile/profile-summary";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "motion/react";
import { useAppReducedMotion, fadeInUp, staggerContainer } from "@/lib/motion";
import { UserCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { data: profile, isLoading, isError, refetch, isFetching } = useActiveProfile();
  const [viewMode, setViewMode] = React.useState<"summary" | "questionnaire" | null>(null);

  const reducedMotion = useAppReducedMotion();
  const containerProps = reducedMotion ? {} : staggerContainer;
  const itemProps = reducedMotion
    ? {}
    : {
        initial: fadeInUp.initial,
        animate: fadeInUp.animate,
        transition: fadeInUp.transition,
      };

  // Sync viewMode with fetched profile data
  React.useEffect(() => {
    if (profile) {
      setViewMode("summary");
    } else if (profile === null) {
      setViewMode("questionnaire");
    }
  }, [profile]);

  const handleSuccess = () => {
    setViewMode("summary");
    refetch();
  };

  const handleReevaluate = () => {
    setViewMode("questionnaire");
  };

  return (
    <m.div {...containerProps} className="space-y-6">
      {/* Header */}
      <m.div {...itemProps}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <UserCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Perfil de Inversor</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Cuestionario de perfil de riesgo y recomendaciones de asignación de activos
              </p>
            </div>
          </div>
          {profile && viewMode === "summary" && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              title="Refrescar perfil"
              className="h-9 w-9 border-border/50 bg-card/60"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </m.div>

      {/* Main Content State Rendering */}
      <m.div {...itemProps}>
        {isLoading && viewMode === null ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-border/50 bg-card/85">
              <CardContent className="p-6 space-y-6 flex flex-col items-center">
                <Skeleton className="h-28 w-28 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-44" />
                <div className="space-y-2 w-full pt-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2 border-border/50 bg-card/85">
              <CardContent className="p-6 space-y-5">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : isError ? (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardContent className="p-8 text-center space-y-4">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-sm font-semibold text-destructive">
                Error al conectar con el servidor de perfil.
              </p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "questionnaire" ? (
          <Questionnaire onSuccess={handleSuccess} />
        ) : viewMode === "summary" && profile ? (
          <ProfileSummary profile={profile} onReevaluate={handleReevaluate} />
        ) : null}
      </m.div>
    </m.div>
  );
}
