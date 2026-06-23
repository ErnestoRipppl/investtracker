"use client";

import * as React from "react";
import { useTransactions, TransactionFilters as FiltersType } from "@/hooks/use-transactions";
import { Transaction } from "@/lib/types";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "motion/react";
import { useAppReducedMotion, fadeInUp, staggerContainer } from "@/lib/motion";
import { ArrowLeftRight, Plus, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TransactionsPage() {
  const reducedMotion = useAppReducedMotion();
  const containerProps = reducedMotion ? {} : staggerContainer;
  const itemProps = reducedMotion
    ? {}
    : {
        initial: fadeInUp.initial,
        animate: fadeInUp.animate,
        transition: fadeInUp.transition,
      };

  const [filters, setFilters] = React.useState<FiltersType>({
    limit: 10,
    skip: 0,
  });

  const { data, isLoading, isError, refetch, isFetching } = useTransactions(filters);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditingTransaction(null);
    setFormOpen(true);
  };

  return (
    <m.div {...containerProps} className="space-y-6">
      {/* Header */}
      <m.div {...itemProps}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Transacciones</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Historial completo de compras, ventas y dividendos de tu cartera
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              title="Refrescar datos"
              className="h-9 w-9 border-border/50 bg-card/60"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
              onClick={handleNew}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[38px]"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Transacción</span>
            </Button>
          </div>
        </div>
      </m.div>

      {/* Filters */}
      <m.div {...itemProps}>
        <TransactionFilters filters={filters} onFiltersChange={setFilters} />
      </m.div>

      {/* Main Table / State Render */}
      <m.div {...itemProps}>
        {isLoading ? (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-emerald-500" />
                <Skeleton className="h-5 w-40" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="hidden md:grid grid-cols-7 gap-4 pb-2 border-b border-border/30">
                {Array.from({ length: 7 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="hidden md:grid grid-cols-7 gap-4 py-3 border-b border-border/20">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              ))}
              <div className="md:hidden space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-border/30 p-4 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : isError ? (
          <Card className="border-destructive/30 bg-destructive/10 backdrop-blur-sm">
            <CardContent className="p-8 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-sm font-semibold text-destructive">
                Error al cargar el historial de transacciones.
              </p>
              <Button size="sm" variant="outline" onClick={() => refetch()} className="border-destructive/30 text-destructive hover:bg-destructive/10">
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <TransactionTable
            transactions={data?.items || []}
            totalCount={data?.total || 0}
            filters={filters}
            onFiltersChange={setFilters}
            onEdit={handleEdit}
          />
        )}
      </m.div>

      {/* Transaction Form Dialog */}
      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transactionToEdit={editingTransaction}
      />
    </m.div>
  );
}
