import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, PackageSearch } from "lucide-react";
import { api, fmt } from "@/lib/api";
import type { Batch, ReorderItem } from "@/types";
import { Card, Badge, Button } from "@/components/ui";
import { fmtDate, daysUntil, unitLabel, nf } from "./lib";
import { toast } from "@/components/ui/toast";

/* Muddati yaqinlashganlar + buyurtma tavsiyalari — Ombor tepasidagi ogohlantirishlar */
export default function AlertsBar() {
  const qc = useQueryClient();
  const { data: batches } = useQuery({
    queryKey: ["batches", "expiring"],
    queryFn: () => api.get<Batch[]>("/stock/batches?expiring_days=30"),
  });
  const { data: reorder } = useQuery({
    queryKey: ["reorder"],
    queryFn: () => api.get<ReorderItem[]>("/stock/reorder"),
  });

  const buy = useMutation({
    mutationFn: (r: ReorderItem) =>
      api.post("/stock/raw/buy", { material_id: r.item_id, qty: r.suggested_qty, cost: r.est_cost }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["raw"] });
      qc.invalidateQueries({ queryKey: ["reorder"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      toast("Kirim qilindi");
    },
    onError: (e) => toast((e as Error).message, "error"),
  });

  const exp = (batches ?? []).filter((b) => b.expiry_date);
  const re = reorder ?? [];
  if (!exp.length && !re.length) return null;

  return (
    <div className="grid lg:grid-cols-2 gap-4 mb-5">
      {!!exp.length && (
        <Card className="!mb-0 border-warn-bg">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-warn-bg text-warn-fg flex items-center justify-center"><CalendarClock size={15} /></span>
            <span className="text-[13px] font-semibold text-ink">Muddati yaqinlashgan ({exp.length})</span>
          </div>
          <div className="flex flex-col gap-2">
            {exp.slice(0, 5).map((b) => {
              const d = daysUntil(b.expiry_date);
              const danger = d !== null && d <= 7;
              return (
                <div key={b.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="text-body truncate min-w-0 flex-1">{b.item_name} <span className="text-faint nums">· {nf(b.qty_remaining)} {unitLabel(b.unit)}</span></span>
                  <Badge tone={danger ? "r" : "o"} className="flex-shrink-0 whitespace-nowrap">{d !== null && d < 0 ? "muddati o'tgan" : `${d} kun · ${fmtDate(b.expiry_date)}`}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {!!re.length && (
        <Card className="!mb-0 border-info-bg">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-info-bg text-info-fg flex items-center justify-center"><PackageSearch size={15} /></span>
            <span className="text-[13px] font-semibold text-ink">Buyurtma tavsiyalari ({re.length})</span>
          </div>
          <div className="flex flex-col gap-2">
            {re.slice(0, 5).map((r) => (
              <div key={r.item_id} className="flex items-center justify-between gap-2 text-[12.5px]">
                <span className="text-body truncate min-w-0 flex-1">
                  {r.name} <span className="text-faint nums">· {nf(r.stock)}/{nf(r.min_stock)} {unitLabel(r.unit)}</span>
                </span>
                <span className="text-muted nums flex-shrink-0 whitespace-nowrap">~{nf(r.suggested_qty)} {unitLabel(r.unit)}</span>
                {r.item_type === "raw" && (
                  <Button size="sm" variant="s" className="flex-shrink-0" onClick={() => buy.mutate(r)} disabled={buy.isPending || !r.suggested_qty}>
                    {r.est_cost ? fmt(r.est_cost) : "Kirim"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
