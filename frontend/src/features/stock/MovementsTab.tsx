import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Filter } from "lucide-react";
import { api } from "@/lib/api";
import type { Movement, MoveType } from "@/types";
import { Card, Section, Select, Input, Badge, Spinner, Empty, Button } from "@/components/ui";
import { MOVE_META, fmtDateTime, unitLabel, nf } from "./lib";

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
  const [itemType, setItemType] = useState("");
  const [moveType, setMoveType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

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
      <Section className="mb-3">Harakatlar tarixi</Section>
      <Card className="mb-4" padded>
        <div className="flex items-center gap-2 mb-3 text-muted">
          <Filter size={15} /><span className="text-[12.5px] font-semibold">Filtrlar</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <Select value={itemType} onChange={(e) => setItemType(e.target.value)}>
            <option value="">Barcha elementlar</option>
            <option value="product">Tayyor mahsulot</option>
            <option value="raw">Xomashyo / qadoqlash</option>
          </Select>
          <Select value={moveType} onChange={(e) => setMoveType(e.target.value)}>
            {TYPE_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
                    <div className="text-2xs text-faint mt-0.5">
                      {fmtDateTime(m.occurred_at)}{m.note ? ` · ${m.note}` : ""}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-[13px] font-semibold nums ${pos ? "text-success-fg" : m.delta < 0 ? "text-danger-fg" : "text-muted"}`}>
                      {pos ? "+" : ""}{nf(m.delta)} {unitLabel(m.unit)}
                    </div>
                    <div className="text-2xs text-faint nums">→ {nf(m.balance_after)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}
