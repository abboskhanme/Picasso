import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Movement } from "@/types";
import { Modal, Field, Input, NumberInput, Button, Badge, Spinner, Empty, ErrorBox, DateTimeField, dtToISO, DateTime } from "@/components/ui";
import { toast, ConfirmDialog } from "@/components/ui/toast";
import { MOVE_META, unitLabel, nf } from "./lib";

type ItemRef = { id: string; name: string; unit: string; stock: number };
type ItemType = "product" | "raw";

/* ---------- Inventarizatsiya (sanab tuzatish) ---------- */
export function CountModal({ item, itemType, onClose, onSaved }:
  { item: ItemRef; itemType: ItemType; onClose: () => void; onSaved: () => void }) {
  const [actual, setActual] = useState<number>(item.stock);
  const [note, setNote] = useState("");
  const [when, setWhen] = useState("");
  const u = unitLabel(item.unit);
  const diff = actual - item.stock;
  const mut = useMutation({
    mutationFn: () => api.post("/stock/count", { item_type: itemType, item_id: item.id, actual_qty: actual, note: note || null, occurred_at: dtToISO(when) }),
    onSuccess: onSaved,
  });
  return (
    <Modal title={"Inventarizatsiya · " + item.name} onClose={onClose}
      footer={<Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Saqlanmoqda…" : "Tasdiqlash"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <div className="text-[12.5px] text-muted mb-3.5">Tizimdagi qoldiq: <b className="text-ink nums">{nf(item.stock)} {u}</b></div>
      <Field label={`Aniq sanab chiqilgan miqdor (${u})`}>
        <NumberInput value={actual} onChange={setActual} />
      </Field>
      {Math.abs(diff) > 1e-9 && (
        <div className={`text-[12.5px] font-semibold mb-3.5 ${diff < 0 ? "text-danger-fg" : "text-success-fg"}`}>
          Farq: {diff > 0 ? "+" : ""}{nf(diff)} {u} {diff < 0 ? "(kamomad)" : "(ortiqcha)"}
        </div>
      )}
      <Field label="Izoh (ixtiyoriy)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="masalan: oylik inventarizatsiya" /></Field>
      <DateTimeField value={when} onChange={setWhen} />
    </Modal>
  );
}

/* ---------- Brak / yo'qotish ---------- */
export function WriteoffModal({ item, itemType, onClose, onSaved }:
  { item: ItemRef; itemType: ItemType; onClose: () => void; onSaved: () => void }) {
  const [qty, setQty] = useState(0);
  const [note, setNote] = useState("");
  const [when, setWhen] = useState("");
  const u = unitLabel(item.unit);
  const mut = useMutation({
    mutationFn: () => api.post("/stock/writeoff", { item_type: itemType, item_id: item.id, qty, note: note || null, occurred_at: dtToISO(when) }),
    onSuccess: onSaved,
  });
  return (
    <Modal title={"Brak / yo'qotish · " + item.name} onClose={onClose}
      footer={<Button variant="no" className="w-full" onClick={() => mut.mutate()} disabled={qty <= 0 || mut.isPending}>{mut.isPending ? "Saqlanmoqda…" : "Hisobdan chiqarish"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <div className="text-[12.5px] text-muted mb-3.5">Joriy qoldiq: <b className="text-ink nums">{nf(item.stock)} {u}</b></div>
      <Field label={`Miqdor (${u})`}><NumberInput value={qty} onChange={setQty} /></Field>
      <Field label="Sabab"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="masalan: muddati o'tgan, sinish" /></Field>
      <DateTimeField value={when} onChange={setWhen} />
    </Modal>
  );
}

/* ---------- Element harakatlar tarixi ---------- */
export function HistoryModal({ item, itemType, onClose }:
  { item: ItemRef; itemType: ItemType; onClose: () => void }) {
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState<Movement | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["movements", itemType, item.id],
    queryFn: () => api.get<Movement[]>(`/stock/movements?item_type=${itemType}&item_id=${item.id}&limit=300`),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/stock/movements/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["raw"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["flows"] });
      qc.invalidateQueries({ queryKey: ["balance"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast("Yozuv o'chirildi — stok qaytarildi");
    },
    onError: (e) => toast((e as Error).message, "error", 5000),
  });
  const rows = data ?? [];
  const u = unitLabel(item.unit);
  return (
    <Modal wide title={"Tarix · " + item.name} onClose={onClose}>
      {isLoading ? <Spinner /> : !rows.length ? (
        <Empty icon={History} text="Harakatlar hali yo'q" />
      ) : (
        <div className="flex flex-col divide-y divide-line -my-1">
          {rows.map((m) => {
            const meta = MOVE_META[m.move_type];
            const Ico = meta.icon;
            const pos = m.delta > 0;
            return (
              <div key={m.id} className="flex items-center gap-3 py-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${pos ? "bg-success-bg text-success-fg" : m.delta < 0 ? "bg-warn-bg text-warn-fg" : "bg-sunken text-muted"}`}>
                  <Ico size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {m.note && <span className="text-2xs text-muted truncate">{m.note}</span>}
                  </div>
                  <div className="mt-1"><DateTime value={m.occurred_at} /></div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-[13px] font-semibold nums ${pos ? "text-success-fg" : m.delta < 0 ? "text-danger-fg" : "text-muted"}`}>
                    {pos ? "+" : ""}{nf(m.delta)} {u}
                  </div>
                  <div className="text-2xs text-faint nums">→ {nf(m.balance_after)}</div>
                </div>
                <button onClick={() => setDeleting(m)} title="O'chirish"
                  className="w-8 h-8 rounded-lg text-faint hover:text-danger hover:bg-danger-bg flex items-center justify-center flex-shrink-0 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {deleting && <ConfirmDialog title="Harakatni o'chirish" danger confirmLabel="O'chirish"
        message={<>
          <b>{MOVE_META[deleting.move_type].label}</b> ({deleting.delta > 0 ? "+" : ""}{nf(deleting.delta)} {u}) yozuvi o'chirilsinmi?<br /><br />
          Stok va unga bog'liq kassa yozuvi <b>orqaga qaytariladi</b>. Sotuv yoki ishlab
          chiqarishga bog'liq harakatlar o'z bo'limida o'chiriladi.
        </>}
        onConfirm={() => del.mutate(deleting.id)} onClose={() => setDeleting(null)} />}
    </Modal>
  );
}
