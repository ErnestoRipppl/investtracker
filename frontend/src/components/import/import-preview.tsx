"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet, RefreshCw, Layers } from "lucide-react";

interface ImportResponse {
  sheets_processed: number;
  total_imported: number;
  errors: string[];
  warnings: string[];
  duplicates_skipped: number;
}

interface ImportPreviewProps {
  result: ImportResponse;
  onReset: () => void;
}

export function ImportPreview({ result, onReset }: ImportPreviewProps) {
  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Imported */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Importadas</p>
              <h4 className="text-xl font-bold font-mono text-emerald-500 mt-0.5">
                {result.total_imported}
              </h4>
            </div>
          </CardContent>
        </Card>

        {/* Duplicates Skipped */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Duplicados</p>
              <h4 className="text-xl font-bold font-mono text-blue-400 mt-0.5">
                {result.duplicates_skipped}
              </h4>
            </div>
          </CardContent>
        </Card>

        {/* Warnings */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Avisos</p>
              <h4 className="text-xl font-bold font-mono text-amber-500 mt-0.5">
                {result.warnings.length}
              </h4>
            </div>
          </CardContent>
        </Card>

        {/* Errors */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Errores</p>
              <h4 className="text-xl font-bold font-mono text-rose-500 mt-0.5">
                {result.errors.length}
              </h4>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sheets Info Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-secondary/10 border border-border/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Resumen de Importación</p>
            <p className="text-xs text-muted-foreground">
              Se procesaron {result.sheets_processed} hoja(s) de cálculo.
            </p>
          </div>
        </div>
        <Button
          onClick={onReset}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[38px] w-full sm:w-auto"
        >
          <RefreshCw className="h-4 w-4" />
          Importar otro archivo
        </Button>
      </div>

      {/* Errors list */}
      {hasErrors && (
        <Card className="border-rose-500/20 bg-rose-500/[0.02]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-rose-500">
              <XCircle className="h-5 w-5 shrink-0" />
              <CardTitle className="text-base font-semibold">Errores de Importación</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Estas líneas no se pudieron importar debido a datos incorrectos o faltantes.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[250px] overflow-y-auto space-y-2">
            {result.errors.map((error, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-200"
              >
                <span className="font-semibold text-rose-400 font-mono shrink-0">#{idx + 1}</span>
                <span className="break-all">{error}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Warnings list */}
      {hasWarnings && (
        <Card className="border-amber-500/20 bg-amber-500/[0.02]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <CardTitle className="text-base font-semibold">Alertas / Avisos</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Se han importado con éxito, pero con modificaciones automáticas o advertencias que debes comprobar.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[250px] overflow-y-auto space-y-2">
            {result.warnings.map((warning, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200"
              >
                <span className="font-semibold text-amber-400 font-mono shrink-0">#{idx + 1}</span>
                <span>{warning}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Complete Success State */}
      {!hasErrors && !hasWarnings && result.total_imported > 0 && (
        <Card className="border-emerald-500/20 bg-emerald-500/[0.02] p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3 animate-pulse" />
          <h3 className="text-lg font-bold text-emerald-400">¡Importación Completada de Forma Perfecta!</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Todas las transacciones se cargaron de manera limpia en la base de datos sin errores ni avisos.
          </p>
        </Card>
      )}
    </div>
  );
}
