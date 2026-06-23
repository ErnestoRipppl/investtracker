"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useBrokers,
  useCreateBroker,
  useUpdateBroker,
  useDeleteBroker,
  Broker,
} from "@/hooks/use-brokers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { m, AnimatePresence } from "motion/react";
import { useAppReducedMotion, fadeInUp, staggerContainer } from "@/lib/motion";
import {
  Settings,
  Palette,
  Bell,
  Database,
  Globe,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const brokerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  commission_type: z.string().default("fixed"),
  commission_fixed_eur: z.preprocess((val) => (val === "" ? 0 : Number(val)), z.number().nonnegative("Mínimo 0")),
  commission_pct: z.preprocess((val) => (val === "" ? 0 : Number(val)), z.number().nonnegative("Mínimo 0")),
  min_commission_eur: z.preprocess((val) => (val === "" ? 0 : Number(val)), z.number().nonnegative("Mínimo 0")),
  max_commission_eur: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
    z.number().nonnegative("Mínimo 0").nullable()
  ),
  custody_fee_annual_pct: z.preprocess((val) => (val === "" ? 0 : Number(val)), z.number().nonnegative("Mínimo 0")),
  fx_spread_pct: z.preprocess((val) => (val === "" ? 0 : Number(val)), z.number().nonnegative("Mínimo 0")),
  is_default: z.boolean().default(false),
});

type BrokerFormValues = z.infer<typeof brokerSchema>;

export default function SettingsPage() {
  const reducedMotion = useAppReducedMotion();
  const containerProps = reducedMotion ? {} : staggerContainer;
  const itemProps = reducedMotion
    ? {}
    : {
        initial: fadeInUp.initial,
        animate: fadeInUp.animate,
        transition: fadeInUp.transition,
      };

  const [activeTab, setActiveTab] = React.useState<"general" | "brokers">("general");

  // Broker Queries and Mutations
  const { data: brokers = [], isLoading: loadingBrokers } = useBrokers();
  const createBrokerMutation = useCreateBroker();
  const updateBrokerMutation = useUpdateBroker();
  const deleteBrokerMutation = useDeleteBroker();

  // Form State
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingBroker, setEditingBroker] = React.useState<Broker | null>(null);

  // General Settings Mock/Local States
  const [darkMode, setDarkMode] = React.useState(true);
  const [reducedMotionOption, setReducedMotionOption] = React.useState(false);
  const [mainCurrency, setMainCurrency] = React.useState("EUR");
  const [dateFormat, setDateFormat] = React.useState("DD/MM/YYYY");
  const [language, setLanguage] = React.useState("ES");
  const [priceAlerts, setPriceAlerts] = React.useState(true);

  const [rebalancingAlerts, setRebalancingAlerts] = React.useState(true);

  // Sync general settings with localStorage if available (on mount)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setDarkMode(localStorage.getItem("theme") !== "light");
      setMainCurrency(localStorage.getItem("currency") || "EUR");
      setDateFormat(localStorage.getItem("date_format") || "DD/MM/YYYY");
      setLanguage(localStorage.getItem("language") || "ES");
    }
  }, []);

  const defaultValues: Partial<BrokerFormValues> = React.useMemo(() => {
    if (editingBroker) {
      return {
        name: editingBroker.name,
        commission_type: editingBroker.commission_type,
        commission_fixed_eur: editingBroker.commission_fixed_eur,
        commission_pct: editingBroker.commission_pct,
        min_commission_eur: editingBroker.min_commission_eur,
        max_commission_eur: editingBroker.max_commission_eur,
        custody_fee_annual_pct: editingBroker.custody_fee_annual_pct,
        fx_spread_pct: editingBroker.fx_spread_pct,
        is_default: editingBroker.is_default,
      };
    }
    return {
      name: "",
      commission_type: "fixed",
      commission_fixed_eur: 0,
      commission_pct: 0,
      min_commission_eur: 0,
      max_commission_eur: null,
      custody_fee_annual_pct: 0,
      fx_spread_pct: 0,
      is_default: false,
    };
  }, [editingBroker]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<BrokerFormValues>({
    resolver: zodResolver(brokerSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (dialogOpen) {
      reset(defaultValues);
    }
  }, [dialogOpen, reset, defaultValues]);

  const handleSaveBroker = async (values: BrokerFormValues) => {
    try {
      const payload = {
        name: values.name,
        commission_type: values.commission_type,
        commission_fixed_eur: values.commission_fixed_eur,
        commission_pct: values.commission_pct,
        min_commission_eur: values.min_commission_eur,
        max_commission_eur: values.max_commission_eur,
        custody_fee_annual_pct: values.custody_fee_annual_pct,
        fx_spread_pct: values.fx_spread_pct,
        is_default: values.is_default,
      };

      if (editingBroker) {
        await updateBrokerMutation.mutateAsync({
          id: editingBroker.id,
          data: payload,
        });
        toast.success("Broker actualizado con éxito");
      } else {
        await createBrokerMutation.mutateAsync(payload);
        toast.success("Broker creado con éxito");
      }
      setDialogOpen(false);
      setEditingBroker(null);
    } catch (error) {
      toast.error((error as Error).message || "Error al guardar el broker");
    }
  };

  const handleEditBroker = (broker: Broker) => {
    setEditingBroker(broker);
    setDialogOpen(true);
  };

  const handleAddBroker = () => {
    setEditingBroker(null);
    setDialogOpen(true);
  };

  const handleDeleteBroker = async (id: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este broker?")) {
      try {
        await deleteBrokerMutation.mutateAsync(id);
        toast.success("Broker eliminado con éxito");
      } catch (error) {
        toast.error((error as Error).message || "Error al eliminar el broker");
      }
    }
  };

  const handleSaveGeneral = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", darkMode ? "dark" : "light");
      localStorage.setItem("currency", mainCurrency);
      localStorage.setItem("date_format", dateFormat);
      localStorage.setItem("language", language);
    }
    toast.success("Configuración general guardada con éxito");
  };

  const handleExportData = () => {
    toast.info("Generando exportación de datos...");
    // Mock downloading a file
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ brokers, settings: { mainCurrency, dateFormat, language } }));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "investtracker_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const brokerFormLoading = createBrokerMutation.isPending || updateBrokerMutation.isPending;

  return (
    <m.div {...containerProps} className="space-y-6">
      {/* Header */}
      <m.div {...itemProps}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Administra tus brokers, comisiones y preferencias del sistema
            </p>
          </div>
        </div>
      </m.div>

      {/* Tab Switcher */}
      <m.div {...itemProps} className="flex gap-2 border-b border-border/20 pb-px">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px ${
            activeTab === "general"
              ? "border-emerald-500 text-emerald-500 font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab("brokers")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px ${
            activeTab === "brokers"
              ? "border-emerald-500 text-emerald-500 font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Brokers & Comisiones
        </button>
      </m.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "general" ? (
          <m.div
            key="general"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Appearance */}
            <Card className="border-border/50 bg-card/85 backdrop-blur-sm shadow-md">
              <CardHeader className="pb-3 border-b border-border/10">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-emerald-500" />
                  <CardTitle className="text-base font-semibold">Apariencia y Visualización</CardTitle>
                </div>
                <CardDescription>Configura cómo se ve InvestTracker en tu dispositivo</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border/10 p-6 pt-0">
                <div className="flex items-center justify-between py-4">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-foreground">Modo Oscuro Premium</span>
                    <p className="text-xs text-muted-foreground">Utilizar la interfaz oscura con detalles esmeralda</p>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                </div>
                <div className="flex items-center justify-between py-4">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-foreground">Animaciones Reducidas</span>
                    <p className="text-xs text-muted-foreground">Desactivar transiciones y efectos complejos de movimiento</p>
                  </div>
                  <Switch checked={reducedMotionOption} onCheckedChange={setReducedMotionOption} />
                </div>
              </CardContent>
            </Card>

            {/* Regional */}
            <Card className="border-border/50 bg-card/85 backdrop-blur-sm shadow-md">
              <CardHeader className="pb-3 border-b border-border/10">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-500" />
                  <CardTitle className="text-base font-semibold">Configuración Regional</CardTitle>
                </div>
                <CardDescription>Formatos de moneda, fecha y localización de textos</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moneda Principal</Label>
                    <Select value={mainCurrency} onValueChange={setMainCurrency}>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">Euro (€ - EUR)</SelectItem>
                        <SelectItem value="USD">Dólar ($ - USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Formato de Fecha</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger id="dateFormat">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/AAAA</SelectItem>
                        <SelectItem value="YYYY-MM-DD">AAAA-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Idioma del Sistema</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ES">Español</SelectItem>
                        <SelectItem value="EN">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="border-border/50 bg-card/85 backdrop-blur-sm shadow-md">
              <CardHeader className="pb-3 border-b border-border/10">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-emerald-500" />
                  <CardTitle className="text-base font-semibold">Notificaciones y Alertas</CardTitle>
                </div>
                <CardDescription>Configura alertas automáticas de desviación de cartera</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border/10 p-6 pt-0">
                <div className="flex items-center justify-between py-4">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-foreground">Alertas de Desviación de Asignación</span>
                    <p className="text-xs text-muted-foreground">Notificar cuando un activo varíe más de un 5% de su peso objetivo</p>
                  </div>
                  <Switch checked={rebalancingAlerts} onCheckedChange={setRebalancingAlerts} />
                </div>
                <div className="flex items-center justify-between py-4">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-foreground">Alertas de Caídas Fuertes</span>
                    <p className="text-xs text-muted-foreground">Avisar si algún activo sufre una caída intradía mayor al 10%</p>
                  </div>
                  <Switch checked={priceAlerts} onCheckedChange={setPriceAlerts} />
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card className="border-border/50 bg-card/85 backdrop-blur-sm shadow-md">
              <CardHeader className="pb-3 border-b border-border/10">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-500" />
                  <CardTitle className="text-base font-semibold">Administración de Datos</CardTitle>
                </div>
                <CardDescription>Exporta copias de seguridad de tu cartera o restablece el sistema</CardDescription>
              </CardHeader>
              <CardContent className="p-6 flex flex-wrap gap-3">
                <Button onClick={handleExportData} variant="outline" className="border-border/50 bg-secondary/10">
                  Exportar Respaldo (.json)
                </Button>
                <Button
                  onClick={() => toast.success("Caché limpiada con éxito")}
                  variant="outline"
                  className="border-border/50 bg-secondary/10"
                >
                  Limpiar Caché local
                </Button>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveGeneral} className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[40px]">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Guardar Configuración General
              </Button>
            </div>
          </m.div>
        ) : (
          <m.div
            key="brokers"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Brokers List */}
            <Card className="border-border/50 bg-card/85 backdrop-blur-sm shadow-md">
              <CardHeader className="pb-3 border-b border-border/10 flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">Brokers Registrados</CardTitle>
                  <CardDescription>Brokers activos que utilizas para imputar comisiones de compra/venta</CardDescription>
                </div>
                <Button onClick={handleAddBroker} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Añadir Broker
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                {loadingBrokers ? (
                  <div className="space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
                    <p className="text-xs text-muted-foreground text-center">Cargando brokers...</p>
                  </div>
                ) : brokers.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground space-y-2">
                    <p>No tienes ningún broker registrado.</p>
                    <p className="text-xs text-muted-foreground/60">
                      Crea un broker para poder asociar tarifas de comisión automatizadas.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {brokers.map((broker) => (
                      <div
                        key={broker.id}
                        className={`rounded-xl border p-4 space-y-3 relative ${
                          broker.is_default
                            ? "border-emerald-500/40 bg-emerald-500/[0.02]"
                            : "border-border/40 bg-secondary/10"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground">{broker.name}</span>
                              {broker.is_default && (
                                <span className="rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] px-2 py-0.5 font-semibold uppercase">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase mt-0.5">
                              Tarifa: {broker.commission_type === "fixed" ? "Fija" : "Porcentual"}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditBroker(broker)}
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteBroker(broker.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Broker Pricing Grid */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/10 text-[11px] text-muted-foreground">
                          <div>
                            <p className="font-medium text-foreground/50">Comisión Fija</p>
                            <p className="font-mono text-foreground mt-0.5">{broker.commission_fixed_eur.toFixed(2)}€</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground/50">Porcentaje</p>
                            <p className="font-mono text-foreground mt-0.5">{broker.commission_pct.toFixed(2)}%</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground/50">Custodia Anual</p>
                            <p className="font-mono text-foreground mt-0.5">{broker.custody_fee_annual_pct.toFixed(2)}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Broker CRUD dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingBroker ? "Editar Broker" : "Añadir Broker"}</DialogTitle>
                  <DialogDescription>
                    Registra o modifica un broker para automatizar los cálculos de comisiones de tus transacciones.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(handleSaveBroker)} className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="broker-name">Nombre del Broker</Label>
                    <Input
                      id="broker-name"
                      placeholder="ej. Interactive Brokers, DEGIRO"
                      disabled={brokerFormLoading}
                      className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-xs font-semibold text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="commission-type">Tipo de Comisión</Label>
                      <Controller
                        name="commission_type"
                        control={control}
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={brokerFormLoading}
                          >
                            <SelectTrigger id="commission-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fijo</SelectItem>
                              <SelectItem value="percentage">Porcentual</SelectItem>
                              <SelectItem value="tiered">Escalonado</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="commission-fixed">Comisión Fija (€)</Label>
                      <Input
                        id="commission-fixed"
                        type="number"
                        step="any"
                        disabled={brokerFormLoading}
                        {...register("commission_fixed_eur")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="commission-pct">Comisión Porcentaje (%)</Label>
                      <Input
                        id="commission-pct"
                        type="number"
                        step="any"
                        disabled={brokerFormLoading}
                        {...register("commission_pct")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="min-commission">Comisión Mínima (€)</Label>
                      <Input
                        id="min-commission"
                        type="number"
                        step="any"
                        disabled={brokerFormLoading}
                        {...register("min_commission_eur")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max-commission">Comisión Máxima (€)</Label>
                      <Input
                        id="max-commission"
                        type="number"
                        step="any"
                        placeholder="Sin límite"
                        disabled={brokerFormLoading}
                        {...register("max_commission_eur")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fx-spread">Fx Spread (%)</Label>
                      <Input
                        id="fx-spread"
                        type="number"
                        step="any"
                        disabled={brokerFormLoading}
                        {...register("fx_spread_pct")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custody-fee">Comisión de Custodia Anual (%)</Label>
                    <Input
                      id="custody-fee"
                      type="number"
                      step="any"
                      disabled={brokerFormLoading}
                      {...register("custody_fee_annual_pct")}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-border/10 mt-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="is-default-switch" className="text-sm font-medium">Establecer como Default</Label>
                      <p className="text-[11px] text-muted-foreground">Asociar este broker automáticamente a nuevas transacciones</p>
                    </div>
                    <Controller
                      name="is_default"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          id="is-default-switch"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={brokerFormLoading}
                        />
                      )}
                    />
                  </div>

                  <DialogFooter className="pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      disabled={brokerFormLoading}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={brokerFormLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      {brokerFormLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Guardar Broker
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}
