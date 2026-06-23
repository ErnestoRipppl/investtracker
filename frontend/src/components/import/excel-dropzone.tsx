"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { apiUpload } from "@/lib/api";
import { Loader2, Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ImportResponse {
  sheets_processed: number;
  total_imported: number;
  errors: string[];
  warnings: string[];
  duplicates_skipped: number;
}

interface ExcelDropzoneProps {
  onSuccess: (result: ImportResponse) => void;
  onError: (error: string) => void;
}

export function ExcelDropzone({ onSuccess, onError }: ExcelDropzoneProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<string | null>(null);

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setIsUploading(true);
      setUploadProgress("Subiendo y procesando archivo...");

      try {
        const data = await apiUpload<ImportResponse>("/api/import/excel", file);
        onSuccess(data);
        toast.success("Archivo importado correctamente");
      } catch (error) {
        const errorMsg = (error as Error).message || "Error al procesar el archivo Excel";
        onError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    },
    [onSuccess, onError]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[250px] ${
        isDragActive
          ? "border-emerald-500 bg-emerald-500/5"
          : isDragReject
          ? "border-rose-500 bg-rose-500/5"
          : "border-border/60 bg-card/60 hover:border-emerald-500/40 hover:bg-emerald-500/[0.01]"
      } ${isUploading ? "pointer-events-none opacity-80" : ""}`}
    >
      <input {...getInputProps()} />

      <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-500">
        {isUploading ? (
          <Loader2 className="h-7 w-7 animate-spin" />
        ) : isDragActive ? (
          <Upload className="h-7 w-7 animate-bounce" />
        ) : (
          <FileSpreadsheet className="h-7 w-7" />
        )}
      </div>

      {isUploading ? (
        <div className="space-y-1">
          <p className="text-base font-medium text-foreground">{uploadProgress}</p>
          <p className="text-xs text-muted-foreground">Esto puede tardar unos segundos dependiendo del tamaño</p>
        </div>
      ) : isDragReject ? (
        <div className="space-y-1">
          <p className="text-base font-medium text-rose-500 flex items-center justify-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Tipo de archivo no soportado
          </p>
          <p className="text-xs text-muted-foreground">Solo se permiten archivos Excel (.xlsx o .xls)</p>
        </div>
      ) : isDragActive ? (
        <div className="space-y-1">
          <p className="text-base font-medium text-emerald-500">¡Suelta el archivo aquí!</p>
          <p className="text-xs text-muted-foreground">Procesaremos las transacciones automáticamente</p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-base font-medium text-foreground">Arrastra tu archivo de transacciones aquí</p>
          <p className="text-sm text-muted-foreground mb-4">o haz clic para buscar en tu equipo</p>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs text-muted-foreground font-medium">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Soporta formatos de Excel (.xlsx, .xls)</span>
          </div>
        </div>
      )}
    </div>
  );
}
