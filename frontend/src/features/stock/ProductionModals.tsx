import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api, fmt } from "@/lib/api";
import type { Product, RawMaterial, Recipe } from "@/types";
import { Modal, Field, Input, NumberInput, Dropdown, Button, IconButton, ErrorBox, Spinner, DateTimeField, dtToISO, DatePicker } from "@/components/ui";
import { unitLabel, nf, convertUnit, compatibleUnits } from "./lib";

/* ---------- Retsept (BOM) tahrirlash ---------- */
export function RecipeModal({ product, onClose, onSaved }:
  { product: Product; onClose: () => void; onSaved: () => void }) {
  const { data: mats } = useQuery({ queryKey: ["raw", "xomashyo"], queryFn: () => api.get<RawMaterial[]>("/stock/raw?category=xomashyo") });
  const { data: recipe, isLoading } = useQuery({ queryKey: ["recipe", product.id], queryFn: () => api.get<Recipe>(`/stock/recipe/${product.id}`) });
  type Line = { material_id: string; qty: number; unit: string };
  const [lines, setLines] = useState<Line[] | null>(null);
  const materials = mats ?? [];
  // saqlangan retsept birligi bo'sh bo'lsa — xomashyoning ombor birligi
  const unitOf = (materialId: string, u?: string | null) =>
    u || materials.find((m) => m.id === materialId)?.unit || "";
  const rows: Line[] = lines ?? (recipe?.items ?? []).map((r) => ({
    material_id: r.material_id, qty: r.qty, unit: unitOf(r.material_id, r.unit),
  }));

  const setRows = (next: Line[]) => setLines(next);
  const addLine = () => {
    const first = materials[0];
    setRows([...rows, { material_id: first?.id ?? "", qty: 0, unit: first?.unit ?? "" }]);
  };
  const updLine = (i: number, patch: Partial<Line>) =>
    setRows(rows.map((r, idx) => {
      if (idx !== i) return r;
      const next = { ...r, ...patch };
      // xomashyo o'zgarsa — birlikni yangi xomashyo birligiga moslaymiz
      if (patch.material_id) next.unit = materials.find((m) => m.id === patch.material_id)?.unit ?? "";
      return next;
    }));
  const delLine = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  const cost = rows.reduce((s, r) => {
    const m = materials.find((x) => x.id === r.material_id);
    if (!m) return s;
    return s + (m.unit_price || 0) * convertUnit(r.qty, r.unit, m.unit);
  }, 0);

  const mut = useMutation({
    mutationFn: () => api.put(`/stock/recipe/${product.id}`, {
      items: rows.filter((r) => r.material_id && r.qty > 0)
        .map((r) => ({ material_id: r.material_id, qty: r.qty, unit: r.unit || null })),
    }),
    onSuccess: onSaved,
  });

  return (
    <Modal wide title={"Retsept · " + product.name} onClose={onClose}
      footer={<Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Saqlanmoqda…" : "Retseptni saqlash"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <p className="text-[12.5px] text-muted mb-3">1 dona "{product.name}" tayyorlash uchun ketadigan xomashyo. Birlikni xohlaganingizcha tanlang — masalan un kg da tursa ham, retseptda gr da yozsangiz bo'ladi (tizim o'zi aylantiradi). Qadoqlash bu yerda kerak emas — u to'plamlarda hisoblanadi.</p>
      {isLoading ? <Spinner /> : (
        <>
          <div className="flex flex-col gap-2">
            {rows.map((r, i) => {
              const m = materials.find((x) => x.id === r.material_id);
              const unitOpts = compatibleUnits(m?.unit);
              return (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <Dropdown value={r.material_id} onChange={(v) => updLine(i, { material_id: v })}
                      placeholder="Xomashyo tanlang…"
                      options={materials.map((m2) => ({ v: m2.id, l: `${m2.name} (${unitLabel(m2.unit)})` }))} />
                  </div>
                  <div className="w-16 sm:w-20 flex-shrink-0">
                    <NumberInput value={r.qty} onChange={(v) => updLine(i, { qty: v })} placeholder="miqdor" />
                  </div>
                  <div className="w-16 sm:w-20 flex-shrink-0">
                    <Dropdown value={r.unit} onChange={(v) => updLine(i, { unit: v })}
                      options={unitOpts.length ? unitOpts : [{ v: r.unit, l: unitLabel(r.unit) }]} />
                  </div>
                  <IconButton label="O'chirish" variant="s" className="text-danger flex-shrink-0" onClick={() => delLine(i)}><Trash2 size={15} /></IconButton>
                </div>
              );
            })}
          </div>
          <Button variant="s" size="sm" className="mt-2" onClick={addLine}><Plus size={14} /> Qator qo'shish</Button>
          <div className="mt-4 flex items-center justify-between bg-sunken rounded-btn px-3 py-2.5">
            <span className="text-[12.5px] font-medium text-muted">Hisoblangan tannarx (1 dona)</span>
            <span className="text-[13px] font-bold text-ink nums">{fmt(cost)}</span>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ---------- Ishlab chiqarish ---------- */
export function ProduceModal({ product, onClose, onSaved }:
  { product: Product; onClose: () => void; onSaved: () => void }) {
  const [qty, setQty] = useState(0);
  const [expiry, setExpiry] = useState("");
  const [note, setNote] = useState("");
  const [when, setWhen] = useState("");
  const { data: mats } = useQuery({ queryKey: ["raw", "all"], queryFn: () => api.get<RawMaterial[]>("/stock/raw") });
  const { data: recipe, isLoading } = useQuery({ queryKey: ["recipe", product.id], queryFn: () => api.get<Recipe>(`/stock/recipe/${product.id}`) });
  const materials = mats ?? [];
  const lines = recipe?.items ?? [];

  const mut = useMutation({
    mutationFn: () => api.post("/stock/produce", { product_id: product.id, qty, expiry_date: expiry || null, note: note || null, occurred_at: dtToISO(when) }),
    onSuccess: onSaved,
  });

  const enough = lines.every((l) => {
    const m = materials.find((x) => x.id === l.material_id);
    return m && m.stock >= convertUnit(l.qty, l.unit, m.unit) * qty;
  });

  return (
    <Modal title={"Ishlab chiqarish · " + product.name} onClose={onClose}
      footer={<Button variant="ok" className="w-full" onClick={() => mut.mutate()} disabled={qty <= 0 || mut.isPending}>{mut.isPending ? "Bajarilmoqda…" : "Ishlab chiqarish"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      {isLoading ? <Spinner /> : !lines.length ? (
        <div className="bg-warn-bg text-warn-fg text-[12.5px] font-medium rounded-btn px-3 py-2.5 mb-1">
          Avval bu mahsulot uchun retsept belgilang.
        </div>
      ) : (
        <>
          <Field label={`Ishlab chiqarish miqdori (${unitLabel(product.unit)})`}>
            <NumberInput value={qty} onChange={setQty} />
          </Field>
          <div className="mb-3.5">
            <div className="text-[12.5px] font-semibold text-body mb-1.5">Sarflanadigan xomashyo</div>
            <div className="flex flex-col gap-1.5 bg-sunken rounded-btn p-3">
              {lines.map((l) => {
                const m = materials.find((x) => x.id === l.material_id);
                if (!m) return null;
                const need = convertUnit(l.qty, l.unit, m.unit) * qty;
                const ok = m.stock >= need;
                return (
                  <div key={l.material_id} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-body">{m.name}</span>
                    <span className={`nums font-semibold ${ok ? "text-muted" : "text-danger-fg"}`}>
                      {nf(need)} / {nf(m.stock)} {unitLabel(m.unit)}
                    </span>
                  </div>
                );
              })}
            </div>
            {qty > 0 && !enough && <p className="text-2xs text-danger-fg mt-1.5 font-medium">Ba'zi xomashyo yetarli emas.</p>}
          </div>
          <Field label="Yaroqlilik muddati (ixtiyoriy)"><DatePicker value={expiry} onChange={setExpiry} /></Field>
          <Field label="Izoh (ixtiyoriy)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="masalan: tungi smena" /></Field>
          <DateTimeField value={when} onChange={setWhen} />
        </>
      )}
    </Modal>
  );
}
