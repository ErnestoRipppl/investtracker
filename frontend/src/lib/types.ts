// ─── Transactions ───────────────────────────────────────────────

export type TransactionType = "BUY" | "SELL" | "DIVIDEND" | "SPLIT" | "TRANSFER";

export interface Transaction {
  id: number;
  ticker: string;
  asset_name: string;
  type: TransactionType;
  date: string;
  quantity: number;
  price: number;
  fees: number;
  currency: string;
  broker: string;
  notes: string | null;
  created_at: string;
}

export interface TransactionCreate {
  ticker: string;
  asset_name: string;
  type: TransactionType;
  date: string;
  quantity: number;
  price: number;
  fees?: number;
  currency?: string;
  broker?: string;
  notes?: string;
}

// ─── Assets & Holdings ─────────────────────────────────────────

export type AssetType = "Stock" | "ETF" | "Fund" | "Crypto" | "Bond" | "Other";

export interface Asset {
  ticker: string;
  name: string;
  type: AssetType;
  currency: string;
  exchange: string | null;
  isin: string | null;
}

export interface Holding {
  ticker: string;
  asset_name: string;
  asset_type: AssetType;
  quantity: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  weight: number;
  currency: string;
}

// ─── Dashboard & KPIs ──────────────────────────────────────────

export interface KPIData {
  net_worth: number;
  total_invested: number;
  total_return: number;
  total_return_pct: number;
  unrealized_pnl: number;
  realized_pnl: number;
  dividends_received: number;
  sharpe_ratio: number | null;
  volatility: number | null;
  max_drawdown: number | null;
}

export interface AllocationItem {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export interface PortfolioHistoryPoint {
  date: string;
  value: number;
  invested: number;
}

export interface DashboardData {
  kpis: KPIData;
  holdings: Holding[];
  allocation_by_type: AllocationItem[];
  allocation_by_sector: AllocationItem[];
  portfolio_history: PortfolioHistoryPoint[];
}

// ─── Quantitative Analytics ─────────────────────────────────────

export interface FormulaInfo {
  name: string;
  latex: string;
  description: string;
  value: number | null;
}

export interface RiskMetrics {
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  volatility_annual: number;
  var_95: number;
  cvar_95: number;
  beta: number | null;
  alpha: number | null;
  treynor_ratio: number | null;
  information_ratio: number | null;
  calmar_ratio: number;
  omega_ratio: number;
}

export interface QuantResult {
  risk_metrics: RiskMetrics;
  formulas: FormulaInfo[];
}

export interface MonteCarloPath {
  values: number[];
}

export interface MonteCarloResult {
  paths: MonteCarloPath[];
  percentiles: {
    p5: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
  };
  final_values: {
    mean: number;
    median: number;
    std: number;
    p5: number;
    p95: number;
  };
  time_labels: string[];
  num_simulations: number;
  time_horizon_days: number;
}

// ─── Investor Profile & Questionnaire ───────────────────────────

export interface QuestionnaireOption {
  value: string;
  label: string;
  score: number;
}

export interface QuestionnaireQuestion {
  id: string;
  text: string;
  category: string;
  options: QuestionnaireOption[];
}

export type RiskProfile =
  | "CONSERVATIVE"
  | "MODERATE_CONSERVATIVE"
  | "MODERATE"
  | "MODERATE_AGGRESSIVE"
  | "AGGRESSIVE";

export interface InvestorProfile {
  id: number;
  risk_profile: RiskProfile;
  risk_score: number;
  investment_horizon: string;
  answers: Record<string, string>;
  created_at: string;
  updated_at: string;
}

// ─── Broker & Import ────────────────────────────────────────────

export interface Broker {
  id: string;
  name: string;
  supported_formats: string[];
  logo_url: string | null;
}

export interface ImportResult {
  success: boolean;
  transactions_imported: number;
  transactions_skipped: number;
  errors: string[];
  warnings: string[];
}

// ─── Recommendations ────────────────────────────────────────────

export type RecommendationSeverity = "INFO" | "WARNING" | "CRITICAL";
export type RecommendationCategory =
  | "DIVERSIFICATION"
  | "RISK"
  | "COST"
  | "REBALANCING"
  | "TAX";

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  severity: RecommendationSeverity;
  category: RecommendationCategory;
  action_label: string | null;
  details: string | null;
}
