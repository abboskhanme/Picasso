import {
  ArrowDownToLine, ArrowUpFromLine, Factory, ShoppingCart, SlidersHorizontal,
  Trash2, RotateCcw, PencilLine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MoveType } from "@/types";

/* ---------- o'lchov ---------- */
export const unitLabel = (u?: string | null) => (u === "gramm" ? "gr" : u || "");

/* ---------- birliklar va mutanosib konvertatsiya ----------
   Bir o'lchamdagi birliklar o'zaro aylanadi (kg↔gramm, litr↔ml, metr↔sm).
   Backenddagi units.py bilan bir xil koeffitsientlar. */
const UNIT_DIM: Record<string, [string, number]> = {
  gramm: ["mass", 1], gr: ["mass", 1], kg: ["mass", 1000],
  ml: ["volume", 1], litr: ["volume", 1000],
  sm: ["length", 1], metr: ["length", 100],
};
// shu o'lchamdagi birliklarni qaysi tartibda ko'rsatamiz (yirikdan maydaga)
const DIM_UNITS: Record<string, string[]> = {
  mass: ["kg", "gramm"], volume: ["litr", "ml"], length: ["metr", "sm"],
};

/** qty ni `from` birligidan `to` birligiga aylantiradi (mos kelmasa o'zgartirmaydi). */
export function convertUnit(qty: number, from?: string | null, to?: string | null): number {
  if (!from || !to || from === to) return qty;
  const f = UNIT_DIM[from], t = UNIT_DIM[to];
  if (f && t && f[0] === t[0]) return (qty * f[1]) / t[1];
  return qty;
}

/** Berilgan ombor birligi uchun retseptda tanlash mumkin bo'lgan birliklar. */
export function compatibleUnits(base?: string | null): { v: string; l: string }[] {
  if (!base) return [];
  const info = UNIT_DIM[base];
  if (!info) return [{ v: base, l: unitLabel(base) }];      // dona/quti/paket — faqat o'zi
  return DIM_UNITS[info[0]].map((u) => ({ v: u, l: unitLabel(u) }));
}

/* ---------- zaxira holati ---------- */
export function stockState(stock: number, min: number) {
  if (stock === 0) return { tone: "r" as const, label: "Tugagan", avatar: "bg-danger-bg text-danger-fg", ring: "border-danger-bg", bar: "bg-danger" };
  if (stock <= min) return { tone: "o" as const, label: "Kam qoldi", avatar: "bg-warn-bg text-warn-fg", ring: "border-warn-bg", bar: "bg-warn" };
  return { tone: "g" as const, label: "Yetarli", avatar: "bg-success-bg text-success-fg", ring: "border-border", bar: "bg-success" };
}

/* ---------- qidiruv + saralash ---------- */
export type SortKey = "low" | "name" | "value";
export const SORT_OPTIONS: { v: SortKey; l: string }[] = [
  { v: "low", l: "Avval kam qolgani" },
  { v: "name", l: "Nomi (A→Z)" },
  { v: "value", l: "Qiymati (katta→kichik)" },
];
function severity(stock: number, min: number) {
  if (stock === 0) return 0;
  if (stock <= min) return 1;
  return 2;
}
export function sortAndFilter<T extends { name: string; stock: number; min_stock: number }>(
  items: T[], query: string, sort: SortKey, priceOf: (i: T) => number,
): T[] {
  const q = query.trim().toLowerCase();
  const out = items.filter((i) => !q || i.name.toLowerCase().includes(q));
  if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "value") out.sort((a, b) => priceOf(b) * b.stock - priceOf(a) * a.stock);
  else out.sort((a, b) => severity(a.stock, a.min_stock) - severity(b.stock, b.min_stock) || a.stock - b.stock);
  return out;
}

/* ---------- harakat turi metadatasi ---------- */
export const MOVE_META: Record<MoveType, { label: string; icon: LucideIcon; tone: string; sign: 1 | -1 | 0 }> = {
  buy:      { label: "Kirim",            icon: ArrowDownToLine,    tone: "g", sign: 1 },
  produce:  { label: "Ishlab chiqarish", icon: Factory,           tone: "g", sign: 1 },
  use:      { label: "Sarflandi",        icon: ArrowUpFromLine,    tone: "o", sign: -1 },
  sale:     { label: "Sotuv",            icon: ShoppingCart,       tone: "b", sign: -1 },
  adjust:   { label: "Tuzatish",         icon: SlidersHorizontal,  tone: "neutral", sign: 0 },
  writeoff: { label: "Brak",             icon: Trash2,             tone: "r", sign: -1 },
  return:   { label: "Qaytarish",        icon: RotateCcw,          tone: "g", sign: 1 },
  manual:   { label: "Qo'lda",           icon: PencilLine,         tone: "neutral", sign: 0 },
};

/* ---------- sana formatlash ---------- */
const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
export function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${hh}:${mm}`;
}
export function daysUntil(s?: string | null): number | null {
  if (!s) return null;
  const d = new Date(s);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}
export const nf = (n: number) => Number(n).toLocaleString("uz-UZ", { maximumFractionDigits: 3 });

/* ---------- zaxira progress bari ---------- */
export function StockBar({ stock, min }: { stock: number; min: number }) {
  const st = stockState(stock, min);
  // shkala: min ni o'rta nuqta deb olamiz, 0..min*2 oralig'i
  const pct = Math.max(4, Math.min(100, (stock / Math.max(min * 2, 1)) * 100));
  return (
    <div className="mt-2">
      <div className="h-1.5 w-full rounded-full bg-sunken overflow-hidden">
        <div className={`h-full rounded-full ${st.bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
