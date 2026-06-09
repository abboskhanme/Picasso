export type PaymentMethod = "naqd" | "karta" | "nasiya";
export type SaleKind = "dona" | "set";

export interface Product {
  id: string; name: string; emoji: string; image_url: string | null; price: number;
  cost_price: number; description: string | null; category: string | null;
  stock: number; min_stock: number; unit: string; is_active: boolean;
}
export interface RawMaterial {
  id: string; name: string; category: "xomashyo" | "qadoqlash";
  unit: string; unit_price: number; stock: number; min_stock: number;
}
export interface ProductSet {
  id: string; name: string; emoji: string; image_url: string | null; price: number;
  is_active: boolean; items: { product_id: string; qty: number }[];
  packaging: { material_id: string; qty: number }[];
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
export type MoveType = "buy" | "produce" | "use" | "sale" | "adjust" | "writeoff" | "return" | "manual";
export interface Movement {
  id: string; item_type: "product" | "raw"; item_id: string;
  item_name: string; item_category: string | null; unit: string | null;
  move_type: MoveType; delta: number; balance_after: number;
  unit_cost: number; cost: number;
  ref_type: string | null; note: string | null; occurred_at: string;
}
export interface RecipeLine { material_id: string; qty: number; }
export interface Recipe {
  product_id: string; items: RecipeLine[]; cost_estimate: number;
}
export interface Production {
  id: string; product_id: string; product_name: string;
  qty: number; cost_total: number; unit_cost: number;
  note: string | null; occurred_at: string;
}
export interface Batch {
  id: string; item_type: "product" | "raw"; item_id: string; item_name: string;
  qty_initial: number; qty_remaining: number; unit: string | null;
  production_date: string | null; expiry_date: string | null;
  unit_cost: number; is_active: boolean;
}
export interface ReorderItem {
  item_type: "product" | "raw"; item_id: string; name: string; unit: string;
  stock: number; min_stock: number; suggested_qty: number;
  unit_price: number; est_cost: number;
}
export interface DashboardData {
  today_revenue: number; today_count: number; month_revenue: number;
  balance: number; month_in: number; month_out: number; nasiya_total: number;
  week_sales: { day: string; value: number }[];
  top_products: { name: string; emoji: string; image_url: string | null; revenue: number; qty: number }[];
  low_stock: { name: string; emoji: string; image_url: string | null; stock: number; unit: string }[];
  daily_sales: { date: string; revenue: number; count: number }[];
  payment_methods: { method: string; value: number }[];
  cashflow_daily: { date: string; in: number; out: number }[];
  prev_month_revenue: number;
}
