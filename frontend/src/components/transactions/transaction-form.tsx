"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Transaction } from "@/lib/types";
import { useCreateTransaction, useUpdateTransaction } from "@/hooks/use-transactions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const transactionSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  ticker: z.string().min(1, "El ticker es requerido").transform(t => t.toUpperCase()),
  type: z.enum(["BUY", "SELL", "DIVIDEND"] as const, {
    errorMap: () => ({ message: "Selecciona un tipo válido" }),
  }),
  quantity: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ required_error: "La cantidad es requerida" }).positive("La cantidad debe ser mayor que 0")
  ),
  price: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ required_error: "El precio es requerido" }).positive("El precio debe ser mayor que 0")
  ),
  fees: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().nonnegative("La comisión no puede ser negativa")
  ),
  notes: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToEdit?: Transaction | null;
}

export function TransactionForm({ open, onOpenChange, transactionToEdit }: TransactionFormProps) {
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const isEditing = !!transactionToEdit;

  const defaultValues: Partial<TransactionFormValues> = React.useMemo(() => {
    if (transactionToEdit) {
      return {
        date: transactionToEdit.date.split("T")[0],
        ticker: transactionToEdit.ticker,
        type: transactionToEdit.type as "BUY" | "SELL" | "DIVIDEND",
        quantity: transactionToEdit.quantity,
        price: transactionToEdit.price,
        fees: transactionToEdit.fees,
        notes: transactionToEdit.notes || "",
      };
    }
    return {
      date: new Date().toISOString().split("T")[0],
      ticker: "",
      type: "BUY",
      quantity: undefined,
      price: undefined,
      fees: 0,
      notes: "",
    };
  }, [transactionToEdit]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open, reset, defaultValues]);

  const onSubmit = async (values: TransactionFormValues) => {
    try {
      if (isEditing && transactionToEdit) {
        await updateMutation.mutateAsync({
          id: transactionToEdit.id,
          data: {
            date: values.date,
            ticker: values.ticker,
            type: values.type,
            quantity: values.quantity,
            price: values.price,
            fees: values.fees,
            notes: values.notes || "",
          },
        });
        toast.success("Transacción actualizada con éxito");
      } else {
        await createMutation.mutateAsync({
          date: values.date,
          ticker: values.ticker,
          type: values.type,
          quantity: values.quantity,
          price: values.price,
          fees: values.fees,
          notes: values.notes || "",
          currency: "EUR",
          broker: "Default",
        });
        toast.success("Transacción creada con éxito");
      }
      onOpenChange(false);
      reset();
    } catch (error) {
      toast.error((error as Error).message || "Error al guardar la transacción");
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Transacción" : "Añadir Transacción"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los detalles de la transacción. Guarda los cambios para actualizar tu cartera."
              : "Introduce los detalles de tu nueva operación para actualizar tu portfolio en tiempo real."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Ticker y Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker</Label>
              <Input
                id="ticker"
                placeholder="ej. AAPL, TSLA"
                disabled={isLoading}
                className={errors.ticker ? "border-destructive focus-visible:ring-destructive" : ""}
                {...register("ticker")}
              />
              {errors.ticker && (
                <p className="text-xs font-semibold text-destructive">{errors.ticker.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <SelectTrigger className={errors.type ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUY">Compra (BUY)</SelectItem>
                      <SelectItem value="SELL">Venta (SELL)</SelectItem>
                      <SelectItem value="DIVIDEND">Dividendo (DIVIDEND)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-xs font-semibold text-destructive">{errors.type.message}</p>
              )}
            </div>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              type="date"
              disabled={isLoading}
              className={errors.date ? "border-destructive focus-visible:ring-destructive" : ""}
              {...register("date")}
            />
            {errors.date && (
              <p className="text-xs font-semibold text-destructive">{errors.date.message}</p>
            )}
          </div>

          {/* Cantidad y Precio */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                placeholder="0.00"
                disabled={isLoading}
                className={errors.quantity ? "border-destructive focus-visible:ring-destructive" : ""}
                {...register("quantity")}
              />
              {errors.quantity && (
                <p className="text-xs font-semibold text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Precio Unitario (€)</Label>
              <Input
                id="price"
                type="number"
                step="any"
                placeholder="0.00"
                disabled={isLoading}
                className={errors.price ? "border-destructive focus-visible:ring-destructive" : ""}
                {...register("price")}
              />
              {errors.price && (
                <p className="text-xs font-semibold text-destructive">{errors.price.message}</p>
              )}
            </div>
          </div>

          {/* Comisión */}
          <div className="space-y-2">
            <Label htmlFor="fees">Comisión (€)</Label>
            <Input
              id="fees"
              type="number"
              step="any"
              placeholder="0.00"
              disabled={isLoading}
              className={errors.fees ? "border-destructive focus-visible:ring-destructive" : ""}
              {...register("fees")}
            />
            {errors.fees && (
              <p className="text-xs font-semibold text-destructive">{errors.fees.message}</p>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Input
              id="notes"
              placeholder="ej. Split, Dividendo trimestral, etc."
              disabled={isLoading}
              {...register("notes")}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Añadir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
