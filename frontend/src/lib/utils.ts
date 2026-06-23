import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 2): string {
  // If backend returns fractional percentage like 0.15 (15%), we multiply by 100 or use standard percent style.
  // Wait, Intl.NumberFormat percent style expects 0.15 to represent 15%, so let's format it directly!
  // BUT wait, does the backend return 0.15 or 15.0?
  // Let's check: volatility returns vol like 0.15. So yes, it returns decimals.
  // Wait, what about VaR? VaR returns values like 0.05.
  // So yes, we format the fractional value:
  return new Intl.NumberFormat("es-ES", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function getPnlColor(value: number): string {
  if (value > 0) return "text-emerald-500";
  if (value < 0) return "text-red-500";
  return "text-muted-foreground";
}

export function getPnlBgColor(value: number): string {
  if (value > 0) return "bg-emerald-500/10";
  if (value < 0) return "bg-red-500/10";
  return "bg-muted";
}
