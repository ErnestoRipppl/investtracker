"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExcelDropzone } from "@/components/import/excel-dropzone";
import { ImportPreview } from "@/components/import/import-preview";
import { Info, HelpCircle, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportResponse {
  sheets_processed: number;
  total_imported: number;
  errors: string[];
  warnings: string[];
  duplicates_skipped: number;
}

export default function ImportPage() {
  const [result, setResult] = React.useState<ImportResponse | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleReset = () => {
    setResult(null);
    setErrorMsg(null);
  };

  const handleDownloadTemplate = () => {
    // Generate a simple CSV mock template and download it
    const headers = "Fecha,Ticker / Activo,Tipo (Compra/Venta),Cantidad,Precio Unit. (€),Comisión (€),Total Invertido (€),Notas\n";
    const example = "2026-06-21,AAPL,Compra,10,150.50,1.50,1506.50,Compra inicial de Apple\n";
    const blob = new Blob([headers + example], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_importacion_investtracker.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 transition-all duration-300 ease-out">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Importar Excel / CSV</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Carga archivos de transacciones en lote para actualizar tu portfolio de forma masiva
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone & Preview Feedback */}
        <div className="lg:col-span-2 space-y-6">
          {errorMsg && (
            <Card className="border-rose-500/20 bg-rose-500/5">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-500">Error de Procesamiento</p>
                  <p className="text-xs text-rose-200 mt-1">{errorMsg}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setErrorMsg(null)}
                  className="h-7 px-2 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 shrink-0"
                >
                  Cerrar
                </Button>
              </CardContent>
            </Card>
          )}

          {!result ? (
            <ExcelDropzone onSuccess={setResult} onError={setErrorMsg} />
          ) : (
            <ImportPreview result={result} onReset={handleReset} />
          )}
        </div>

        {/* Instructions Panel */}
        <div>
          <Card className="border-border/50 bg-card/85 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b border-border/10">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-emerald-500" />
                <CardTitle className="text-base font-semibold">Formato Requerido</CardTitle>
              </div>
              <CardDescription>Instrucciones de formato para una carga correcta</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs leading-relaxed text-muted-foreground">
              <div className="space-y-2">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  Nombres de columnas exactos:
                </p>
                <div className="p-3 bg-secondary/30 rounded-lg border border-border/20 font-mono text-[10px] space-y-1 overflow-x-auto text-foreground">
                  <div>Fecha</div>
                  <div>Ticker / Activo</div>
                  <div>Tipo (Compra/Venta)</div>
                  <div>Cantidad</div>
                  <div>Precio Unit. (€)</div>
                  <div>Comisión (€)</div>
                  <div>Total Invertido (€)</div>
                  <div>Notas</div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-foreground">Tipos soportados:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Tipo de operación: <code className="text-emerald-500 bg-emerald-500/5 px-1 py-0.5 rounded">Compra</code> (o BUY), <code className="text-rose-500 bg-rose-500/5 px-1 py-0.5 rounded">Venta</code> (o SELL) o <code className="text-teal-500 bg-teal-500/5 px-1 py-0.5 rounded">Dividendo</code>.</li>
                  <li>Fecha: Formato AAAA-MM-DD o estándar de Excel.</li>
                  <li>Cantidad y Precios: Numéricos (ej. 10.50).</li>
                </ul>
              </div>

              <div className="pt-2 border-t border-border/15">
                <Button
                  onClick={handleDownloadTemplate}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 text-xs h-9 border-border/50 bg-secondary/10 hover:bg-secondary/20"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-500" />
                  Descargar Plantilla CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
