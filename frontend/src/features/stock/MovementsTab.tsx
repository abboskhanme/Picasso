import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Filter, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Movement, MoveType } from "@/types";
import { Card, Dropdown, Badge, Spinner, Empty, Button, DateTime, DatePicker } from "@/components/ui";
import { toast, ConfirmDialog } from "@/components/ui/toast";
import { MOVE_META, unitLabel, nf } from "./lib";

const TYPE_OPTIONS: { v: string; l: string }[] = [
  { v: "", l: "Barcha turlar" },
  { v: "buy", l: "Kirim" },
  { v: "produce", l: "Ishlab chiqarish" },
  { v: "use", l: "Sarflash" },
  { v: "sale", l: "Sotuv" },
  { v: "adjust", l: "Tuzatish" },
  { v: "writeoff", l: "Brak" },
];

export default function MovementsTab() {
  const qc = useQueryClient();
  const [itemType, setItemType] = useState("");
  const [moveType, setMoveType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [deleting, setDeleting] = useState<Movement | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => api.del(`/stock/movements/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["raw"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["flows"] });
      qc.invalidateQueries({ queryKey: ["balance"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["reorder"] });
      toast("Yozuv o'chirildi — stok va kassa qaytarildi");
    },
    onError: (e) => toast((e as Error).message, "error", 5000),
  });

  const params = new URLSearchParams();
  if (itemType) params.set("item_type", itemType);
  if (moveType) params.set("move_type", moveType);
  if (from) params.set("date_from", from);
  if (to) params.set("date_to", to);
  params.set("limit", "500");

  const { data, isLoading } = useQuery({
    queryKey: ["movements", "global", itemType, moveType, from, to],
    queryFn: () => api.get<Movement[]>(`/stock/movements?${params.toString()}`),
  });
  const rows = data ?? [];

  const reset = () => { setItemType(""); setMoveType(""); setFrom(""); setTo(""); };

  return (
    <>
      <Card className="mb-4" padded>
        <div className="flex items-center gap-2 mb-3 text-muted">
          <Filter size={15} /><span className="text-[12.5px] font-semibold">Filtrlar</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <Dropdown value={itemType} onChange={setItemType}
            options={[
              { v: "", l: "Barcha elementlar" },
              { v: "product", l: "Tayyor mahsulot" },
              { v: "raw", l: "Xomashyo / qadoqlash" },
            ]} />
          <Dropdown value={moveType} onChange={setMoveType} options={TYPE_OPTIONS} />
          <DatePicker value={from} onChange={setFrom} />
          <DatePicker value={to} onChange={setTo} />
        </div>
        {(itemType || moveType || from || to) && (
          <Button variant="ghost" size="sm" className="mt-2.5" onClick={reset}>Filtrlarni tozalash</Button>
        )}
      </Card>

      {isLoading ? <Spinner /> : !rows.length ? (
        <Card><Empty icon={History} text="Tanlangan davr uchun harakat topilmadi" /></Card>
      ) : (
        <Card padded={false}>
          <div className="flex flex-col divide-y divide-line">
            {rows.map((m) => {
              const meta = MOVE_META[m.move_type as MoveType] ?? MOVE_META.manual;
              const Ico = meta.icon;
              const pos = m.delta > 0;
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${pos ? "bg-success-bg text-success-fg" : m.delta < 0 ? "bg-warn-bg text-warn-fg" : "bg-sunken text-muted"}`}>
                    <Ico size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink text-[13.5px] truncate">{m.item_name}</span>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <DateTime value={m.occurred_at} />
                      {m.note && <span className="text-2xs text-muted truncate">{m.note}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-[13px] font-semibold nums ${pos ? "text-success-fg" : m.delta < 0 ? "text-danger-fg" : "text-muted"}`}>
                      {pos ? "+" : ""}{nf(m.delta)} {unitLabel(m.unit)}
                    </div>
                    <div className="text-2xs text-faint nums">→ {nf(m.balance_after)}</div>
                  </div>
                  <button onClick={() => setDeleting(m)} title="O'chirish"
                    className="w-8 h-8 rounded-lg text-faint hover:text-danger hover:bg-danger-bg flex items-center justify-center flex-shrink-0 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {deleting && <ConfirmDialog title="Harakatni o'chirish" danger confirmLabel="O'chirish"
        message={<>
          <b>{deleting.item_name}</b> — {MOVE_META[deleting.move_type as MoveType]?.label ?? deleting.move_type}{" "}
          ({deleting.delta > 0 ? "+" : ""}{nf(deleting.delta)} {unitLabel(deleting.unit)}) yozuvi o'chirilsinmi?<br /><br />
          Unga bog'liq <b>barcha transaksiyalar orqaga qaytadi</b>: stok tiklanadi, bog'liq
          kassa yozuvi o'chiriladi. Sotuv/ishlab chiqarish harakatlari esa faqat o'z bo'limida o'chiriladi.
        </>}
        onConfirm={() => del.mutate(deleting.id)} onClose={() => setDeleting(null)} />}
    </>
  );
}
