import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, Receipt, ArrowDownRight, HandCoins, Wallet,
  ArrowUpRight, BarChart3, Trophy, AlertTriangle, PieChart as PieIcon, Activity,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { api, fmt, fmtShort } from "@/lib/api";
import { DashboardData } from "@/types";
import { Card, Section, StatCard, Segmented, PageHeader, Empty, Spinner, ItemPic } from "@/components/ui";

const C = {
  brand: "#774a2a",
  accent: "#c07d28",
  success: "#15915b",
  danger: "#d64545",
  info: "#2f6fd6",
  warn: "#c07c12",
  muted: "#697586",
  faint: "#9aa2ad",
  line: "#eef0f2",
};

const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const fmtDay = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

const PM_LABEL: Record<string, string> = { naqd: "Naqd", karta: "Karta", nasiya: "Nasiya" };
const PM_COLOR: Record<string, string> = { naqd: C.success, karta: C.info, nasiya: C.warn };

function ChartTip({ active, payload, label, money = true }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-btn shadow-pop px-3 py-2">
      {label != null && <div className="text-2xs font-semibold text-muted mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 text-[12px] text-ink">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="text-muted">{p.name}:</span>
          <span className="font-semibold nums">{money ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function TrendChip({ now, prev }: { now: number; prev: number }) {
  if (prev <= 0) return null;
  const pct = Math.round(((now - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-2xs font-semibold px-1.5 py-0.5 rounded-md nums ${up ? "bg-success-bg text-success-fg" : "bg-danger-bg text-danger-fg"}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? "+" : ""}{pct}%
    </span>
  );
}

export default function DashboardPage() {
  const [statView, setStatView] = useState<"today" | "finance">("today");
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/reports/dashboard"),
  });

  if (isLoading) return <Spinner />;
  if (error) return <Empty icon={AlertTriangle} text={(error as Error).message} />;
  if (!data) return null;

  const daily = (data.daily_sales ?? []).map((d) => ({ ...d, label: fmtDay(d.date) }));
  const cashflow = (data.cashflow_daily ?? []).map((d) => ({ ...d, label: fmtDay(d.date) }));
  const pm = (data.payment_methods ?? []).map((p) => ({
    ...p, label: PM_LABEL[p.method] ?? p.method, fill: PM_COLOR[p.method] ?? C.brand,
  }));
  const pmTotal = pm.reduce((a, p) => a + p.value, 0);
  const maxTop = Math.max(...data.top_products.map((p) => p.revenue), 1);
  const hasSales = daily.some((d) => d.revenue > 0);
  const hasFlow = cashflow.some((d) => d.in > 0 || d.out > 0);

  const statViews = {
    today: [
      { tone: "g" as const, icon: TrendingUp, value: fmt(data.today_revenue), label: "Bugungi sotuv" },
      { tone: "o" as const, icon: Receipt, value: `${data.today_count} ta`, label: "Operatsiyalar" },
      { tone: "p" as const, icon: ArrowDownRight, value: fmt(data.month_out), label: "Oylik chiqim" },
      { tone: "b" as const, icon: HandCoins, value: fmt(data.nasiya_total), label: "Jami nasiya" },
    ],
    finance: [
      { tone: "g" as const, icon: Wallet, value: fmt(data.balance), label: "Kassa qoldig'i" },
      { tone: "o" as const, icon: ArrowUpRight, value: fmt(data.month_in), label: "Oylik kirim" },
      { tone: "p" as const, icon: ArrowDownRight, value: fmt(data.month_out), label: "Oylik chiqim" },
      { tone: "b" as const, icon: TrendingUp, value: fmt(data.month_revenue), label: "Oylik sotuv" },
    ],
  };
  const stats = statViews[statView];

  return (
    <>
      <PageHeader title="Bosh sahifa" subtitle="Bugungi savdo va moliyaviy ko'rsatkichlar" />

      <div className="flex items-center justify-between gap-3 mb-2.5">
        <Section>{statView === "today" ? "Bugungi holat" : "Moliyaviy holat"}</Section>
        <Segmented
          value={statView}
          onChange={setStatView}
          options={[
            { value: "today", label: "Bugun" },
            { value: "finance", label: "Moliya" },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s, i) => (
          <StatCard key={i} tone={s.tone} icon={s.icon} value={s.value} label={s.label} />
        ))}
      </div>

      {data.low_stock.length > 0 && (
        <Card className="mb-6 border-warn-bg !bg-warn-bg/40" padded>
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle size={16} className="text-warn-fg" />
            <span className="text-[13px] font-semibold text-warn-fg">Zaxira tugayapti</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {data.low_stock.map((p) => (
              <div key={p.name} className="flex items-center gap-2 text-[13px] text-body">
                <ItemPic image={p.image_url} emoji={p.emoji} className="w-6 h-6 text-base" rounded="rounded-md" />
                <span className="font-medium">{p.name}</span>
                <span className="text-muted">— qoldi</span>
                <span className="font-semibold text-warn-fg nums">{p.stock} {p.unit}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 30 kunlik sotuv trendi + to'lov usullari */}
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2">
          <div className="mb-2.5 flex items-center justify-between">
            <Section className="flex items-center gap-1.5"><Activity size={14} /> Sotuv dinamikasi — 30 kun</Section>
            <TrendChip now={data.month_revenue} prev={data.prev_month_revenue} />
          </div>
          <Card padded>
            {!hasSales ? <Empty icon={BarChart3} text="Hali sotuv yo'q" /> : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.brand} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={C.brand} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={C.line} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.faint }} tickLine={false} axisLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 10, fill: C.faint }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtShort(v)} width={42} />
                    <Tooltip content={<ChartTip />} cursor={{ stroke: C.faint, strokeDasharray: "3 3" }} />
                    <Area type="monotone" dataKey="revenue" name="Sotuv" stroke={C.brand} strokeWidth={2}
                      fill="url(#gradRev)" dot={false} activeDot={{ r: 4, fill: C.brand, stroke: "#fff", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Section className="mb-2.5 flex items-center gap-1.5"><PieIcon size={14} /> To'lov usullari — joriy oy</Section>
          <Card padded>
            {pmTotal === 0 ? <Empty icon={PieIcon} text="Hali sotuv yo'q" /> : (
              <>
                <div className="h-40 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pm} dataKey="value" nameKey="label" innerRadius={48} outerRadius={70}
                        paddingAngle={2} strokeWidth={0}>
                        {pm.map((p, i) => <Cell key={i} fill={p.fill} />)}
                      </Pie>
                      <Tooltip content={<ChartTip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[15px] font-bold text-ink nums">{fmtShort(pmTotal)}</span>
                    <span className="text-2xs text-muted">jami</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 mt-3">
                  {pm.map((p) => (
                    <div key={p.method} className="flex items-center gap-2 text-[12px]">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.fill }} />
                      <span className="text-body font-medium flex-1">{p.label}</span>
                      <span className="text-muted nums">{Math.round((p.value / pmTotal) * 100)}%</span>
                      <span className="font-semibold text-ink nums w-24 text-right">{fmtShort(p.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Kirim/chiqim + top mahsulotlar */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div>
          <Section className="mb-2.5 flex items-center gap-1.5"><BarChart3 size={14} /> Kirim / chiqim — 14 kun</Section>
          <Card padded>
            {!hasFlow ? <Empty icon={BarChart3} text="Hali harakat yo'q" /> : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashflow} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2}>
                    <CartesianGrid stroke={C.line} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.faint }} tickLine={false} axisLine={false} interval={1} />
                    <YAxis tick={{ fontSize: 10, fill: C.faint }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtShort(v)} width={42} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(16,24,40,0.04)" }} />
                    <Bar dataKey="in" name="Kirim" fill={C.success} radius={[3, 3, 0, 0]} maxBarSize={14} />
                    <Bar dataKey="out" name="Chiqim" fill={C.danger} radius={[3, 3, 0, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Section className="mb-2.5 flex items-center gap-1.5"><Trophy size={14} /> Top mahsulotlar</Section>
          <Card padded={false}>
            {data.top_products.length === 0 ? <Empty icon={BarChart3} text="Hali sotuv yo'q" /> : (
              <div className="divide-y divide-line">
                {data.top_products.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                    <span className="w-5 text-[12px] font-semibold text-faint nums">{i + 1}</span>
                    <ItemPic image={p.image_url} emoji={p.emoji} className="w-8 h-8 text-lg" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[13px] text-ink truncate mb-1">{p.name}</div>
                      <div className="h-1.5 bg-sunken rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-brand-600 transition-all"
                          style={{ width: `${Math.max((p.revenue / maxTop) * 100, 4)}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-ink text-[13px] nums">{fmt(p.revenue)}</div>
                      <div className="text-2xs text-muted nums">{p.qty} ta sotilgan</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
