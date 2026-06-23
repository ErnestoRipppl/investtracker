"use client";

import * as React from "react";
import { Transaction, TransactionType } from "@/lib/types";
import { useDeleteTransaction, TransactionFilters } from "@/hooks/use-transactions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { Edit2, Trash2, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface TransactionTableProps {
  transactions: Transaction[];
  totalCount: number;
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  onEdit: (transaction: Transaction) => void;
}

export function TransactionTable({
  transactions,
  totalCount,
  filters,
  onFiltersChange,
  onEdit,
}: TransactionTableProps) {
  const deleteMutation = useDeleteTransaction();

  const limit = filters.limit || 10;
  const skip = filters.skip || 0;
  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const handlePageChange = (newPage: number) => {
    const newSkip = (newPage - 1) * limit;
    onFiltersChange({
      ...filters,
      skip: newSkip,
    });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer y recalculará tu cartera.")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Transacción eliminada con éxito");
      } catch (error) {
        toast.error((error as Error).message || "Error al eliminar la transacción");
      }
    }
  };

  const getTypeBadge = (type: TransactionType) => {
    switch (type) {
      case "BUY":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 capitalize font-medium text-[10px]">
            Compra
          </Badge>
        );
      case "SELL":
        return (
          <Badge className="bg-rose-500/10 text-rose-500 border border-rose-500/20 capitalize font-medium text-[10px]">
            Venta
          </Badge>
        );
      case "DIVIDEND":
        return (
          <Badge className="bg-teal-500/10 text-teal-500 border border-teal-500/20 capitalize font-medium text-[10px]">
            Dividendo
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="capitalize text-[10px]">
            {type}
          </Badge>
        );
    }
  };

  // Helper to calculate total transaction cash effect
  const calculateTotalInvested = (tx: Transaction) => {
    const principal = tx.quantity * tx.price;
    if (tx.type === "BUY") {
      return principal + tx.fees;
    }
    if (tx.type === "SELL") {
      return principal - tx.fees;
    }
    return principal; // Dividend or other
  };

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-md">
        <Table>
          <TableHeader className="border-b border-border/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[110px] font-semibold text-muted-foreground">Fecha</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Ticker</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Tipo</TableHead>
              <TableHead className="text-right font-semibold text-muted-foreground">Cantidad</TableHead>
              <TableHead className="text-right font-semibold text-muted-foreground">Precio Unit.</TableHead>
              <TableHead className="text-right font-semibold text-muted-foreground">Comisión</TableHead>
              <TableHead className="text-right font-semibold text-muted-foreground">Total</TableHead>
              <TableHead className="max-w-[200px] font-semibold text-muted-foreground">Notas</TableHead>
              <TableHead className="w-[100px] text-right font-semibold text-muted-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="border-none">
            {transactions.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  No se encontraron transacciones con los filtros actuales.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow
                  key={tx.id}
                  className="border-b border-border/30 hover:bg-accent/40 transition-colors"
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(tx.date).toLocaleDateString("es-ES")}
                  </TableCell>
                  <TableCell className="font-bold text-foreground">{tx.ticker}</TableCell>
                  <TableCell>{getTypeBadge(tx.type)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-medium">
                    {tx.quantity.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 6 })}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(tx.price, tx.currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {formatCurrency(tx.fees, tx.currency)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono text-xs font-bold",
                      tx.type === "BUY" ? "text-emerald-500" : tx.type === "SELL" ? "text-rose-500" : "text-teal-500"
                    )}
                  >
                    {tx.type === "BUY" ? "-" : "+"}
                    {formatCurrency(calculateTotalInvested(tx), tx.currency)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={tx.notes || ""}>
                    {tx.notes || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(tx)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        title="Editar transacción"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tx.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Eliminar transacción"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {transactions.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center text-sm text-muted-foreground">
            No se encontraron transacciones.
          </div>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="rounded-xl border border-border/30 p-4 space-y-3 bg-card/85 shadow-sm"
            >
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(tx.date).toLocaleDateString("es-ES")}
                </span>
                {getTypeBadge(tx.type)}
              </div>

              <div className="flex justify-between items-end border-b border-border/10 pb-2">
                <div>
                  <span className="font-bold text-lg text-foreground">{tx.ticker}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {tx.quantity} units @ {formatCurrency(tx.price, tx.currency)}
                  </span>
                </div>
                <div
                  className={cn(
                    "text-sm font-bold font-mono",
                    tx.type === "BUY" ? "text-emerald-500" : tx.type === "SELL" ? "text-rose-500" : "text-teal-500"
                  )}
                >
                  {tx.type === "BUY" ? "-" : "+"}
                  {formatCurrency(calculateTotalInvested(tx), tx.currency)}
                </div>
              </div>

              {tx.notes && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3 shrink-0" />
                  <span className="truncate">{tx.notes}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-1">
                <span className="text-xs text-muted-foreground font-medium">
                  Comisión: {formatCurrency(tx.fees, tx.currency)}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(tx)}
                    className="h-8 px-2.5 text-xs flex items-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(tx.id)}
                    className="h-8 px-2.5 text-xs flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/40 px-4 py-3 shadow-sm">
          <div className="text-xs text-muted-foreground">
            Mostrando <span className="font-medium text-foreground">{skip + 1}</span> a{" "}
            <span className="font-medium text-foreground">
              {Math.min(skip + limit, totalCount)}
            </span>{" "}
            de <span className="font-medium text-foreground">{totalCount}</span> transacciones
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium px-2.5">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
