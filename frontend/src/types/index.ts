export type PaymentMethod = "naqd" | "karta" | "nasiya";
export type SaleKind = "dona" | "set";

export interface Product {
  id: string; name: string; emoji: string; price: number;
  cost_price: number; description: string | null; category: string | null;
  stock: number; min_stock: number; unit: string; is_active: boolean;
}
export interface RawMaterial {
  id: string; name: string; category: "xomashyo" | "qadoqlash";
  unit: string; unit_price: number; stock: number; min_stock: number;
}
export interface ProductSet {
  id: string; name: string; emoji: string; price: number;
  is_active: boolean; items: { product_id: string; qty: number }[];
}
export interface SaleItem {
  name_snapshot: string; emoji_snapshot: string | null;
  qty: number; unit_price: number; line_total: number;
}
export interface Sale {
  id: string; kind: SaleKind; payment_method: PaymentMethod;
  total: number; occurred_at: string; items: SaleItem[];
}
export interface CustomerBalance {
  customer_id: string; name: string; phone: string | null;
  total_nasiya: number; total_paid: number; debt: number;
}
export interface CashFlow {
  id: string; direction: "in" | "out"; amount: number;
  category: string | null; note: string | null; occurred_at: string;
}
export interface DashboardData {
  today_revenue: number; today_count: number; month_revenue: number;
  balance: number; month_in: number; month_out: number; nasiya_total: number;
  week_sales: { day: string; value: number }[];
  top_products: { name: string; emoji: string; revenue: number; qty: number }[];
  low_stock: { name: string; emoji: string; stock: number; unit: string }[];
}
