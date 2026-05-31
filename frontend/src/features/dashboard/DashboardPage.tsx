import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Receipt, ArrowDownRight, HandCoins, Wallet, ArrowUpRight, BarChart3, Trophy, AlertTriangle } from "lucide-react";
import { api, fmt, fmtShort } from "@/lib/api";
import { DashboardData } from "@/types";
import { Card, Section, StatCard, PageHeader, Empty, Spinner } from "@/components/ui";

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/reports/dashboard"),
  });

  if (isLoading) return <Spinner />;
  if (error) return <Empty icon={AlertTriangle} text={(error as Error).message} />;
  if (!data) return null;

  const maxWeek = Math.max(...data.week_sales.map((w) => w.value), 1);

  return (
    <>
      <PageHeader title="Bosh sahifa" subtitle="Bugungi savdo va moliyaviy ko'rsatkichlar" />

      <Section className="mb-2.5">Bugungi holat</Section>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard tone="g" icon={TrendingUp} value={fmt(data.today_revenue)} label="Bugungi sotuv" />
        <StatCard tone="o" icon={Receipt} value={`${data.today_count} ta`} label="Operatsiyalar" />
        <StatCard tone="p" icon={ArrowDownRight} value={fmt(data.month_out)} label="Oylik chiqim" />
        <StatCard tone="b" icon={HandCoins} value={fmt(data.nasiya_total)} label="Jami nasiya" />
      </div>

      <Section className="mb-2.5">Moliyaviy holat</Section>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard tone="g" icon={Wallet} value={fmt(data.balance)} label="Kassa qoldig'i" />
        <StatCard tone="o" icon={ArrowUpRight} value={fmt(data.month_in)} label="Oylik kirim" />
        <StatCard tone="p" icon={ArrowDownRight} value={fmt(data.month_out)} label="Oylik chiqim" />
        <StatCard tone="b" icon={TrendingUp} value={fmt(data.month_revenue)} label="Oylik sotuv" />
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
                <span className="text-base leading-none">{p.emoji}</span>
                <span className="font-medium">{p.name}</span>
                <span className="text-muted">— qoldi</span>
                <span className="font-semibold text-warn-fg nums">{p.stock} {p.unit}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <div>
          <Section className="mb-2.5 flex items-center gap-1.5"><BarChart3 size={14} /> Haftalik sotuv</Section>
          <Card>
            <div className="flex flex-col gap-2.5">
              {data.week_sales.map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[11px] text-muted w-8 text-right font-medium">{w.day}</span>
                  <div className="flex-1 bg-sunken rounded-md h-6 overflow-hidden">
                    <div className="h-full rounded-md bg-brand-600 flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${Math.max((w.value / maxWeek) * 100, w.value > 0 ? 8 : 0)}%` }}>
                      {w.value > 0 && <span className="text-[10px] font-semibold text-white nums">{fmtShort(w.value)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                    <span className="text-lg leading-none">{p.emoji}</span>
                    <div className="flex-1 min-w-0 font-medium text-[13px] text-ink truncate">{p.name}</div>
                    <div className="text-right">
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
