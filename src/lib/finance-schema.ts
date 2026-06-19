export interface FinanceRow {
  symbol: string;
  label: string;
  ok: boolean;
  price: number;
  changePct: number;
  currency: string;
  spark: number[];
}
