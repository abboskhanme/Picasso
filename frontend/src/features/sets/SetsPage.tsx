import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Minus, Trash2, Gift, Pencil, Package } from "lucide-react";
import { api, fmt } from "@/lib/api";
import { Product, ProductSet, RawMaterial } from "@/types";
import { Card, PageHeader, Button, IconButton, Empty, Spinner, Modal, Field, Input, ErrorBox, MoneyInput, cx, ItemPic, ImagePicker } from "@/components/ui";

export default function SetsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProductSet | null>(null);
  const { data: sets, isLoading } = useQuery({ queryKey: ["sets"], queryFn: () => api.get<ProductSet[]>("/sets") });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => api.get<Product[]>("/products") });
  const { data: packaging } = useQuery({ queryKey: ["raw", "qadoqlash"], queryFn: () => api.get<RawMaterial[]>("/stock/raw?category=qadoqlash") });

  const refresh = () => qc.invalidateQueries({ queryKey: ["sets"] });
  const archive = useMutation({ mutationFn: (id: string) => api.del(`/sets/${id}`), onSuccess: refresh });

  const prod = (id: string) => products?.find((p) => p.id === id);
  const pack = (id: string) => packaging?.find((m) => m.id === id);

  return (
    <>
      <PageHeader title="To'plamlar"
        subtitle="Bir nechta tayyor mahsulot + qadoqlashdan iborat sovg'a to'plami — bitta narxda sotiladi"
        action={<Button onClick={() => setCreating(true)}><Plus size={16} /> Yangi to'plam</Button>} />

      {isLoading ? <Spinner /> : !sets?.length ? (
        <Card><Empty icon={Gift} text="Hali to'plam yaratilmagan" action={<Button onClick={() => setCreating(true)}><Plus size={16} /> Yangi to'plam</Button>} /></Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {sets.map((s) => (
            <Card key={s.id} className="!mb-0">
              <div className="flex items-start gap-3">
                <ItemPic image={s.image_url} emoji={s.emoji} className="w-10 h-10 text-xl" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink truncate">{s.name}</div>
                  <div className="text-[14px] font-bold text-brand-700 nums">{fmt(s.price)}</div>
                </div>
                <IconButton label="Tahrirlash" variant="s" className="h-8 w-8" onClick={() => setEditing(s)}><Pencil size={14} /></IconButton>
                <IconButton label="Arxivlash" variant="s" className="h-8 w-8 text-danger" onClick={() => { if (confirm(`"${s.name}" arxivlansinmi?`)) archive.mutate(s.id); }}><Trash2 size={14} /></IconButton>
              </div>

              <div className="mt-3 rounded-lg border border-line bg-sunken/60 divide-y divide-line">
                {s.items.map((it) => {
                  const p = prod(it.product_id);
                  return (
                    <div key={it.product_id} className="flex items-center gap-2 text-[12.5px] px-3 py-1.5">
                      <ItemPic image={p?.image_url} emoji={p?.emoji} className="w-6 h-6 text-sm" rounded="rounded-md" />
                      <span className="flex-1 font-medium text-body truncate">{p?.name ?? "—"}</span>
                      <span className="text-muted nums">×{it.qty}</span>
                    </div>
                  );
                })}
              </div>

              {s.packaging.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Package size={13} className="text-faint" />
                  {s.packaging.map((pk) => {
                    const m = pack(pk.material_id);
                    return (
                      <span key={pk.material_id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sunken text-[11px] font-medium text-muted">
                        {m?.name ?? "—"} <span className="nums text-faint">×{pk.qty}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <SetForm
          set={editing ?? undefined}
          products={products ?? []}
          packaging={packaging ?? []}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { refresh(); setCreating(false); setEditing(null); }}
        />
      )}
    </>
  );
}

function SetForm({ set, products, packaging, onClose, onSaved }:
  { set?: ProductSet; products: Product[]; packaging: RawMaterial[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(set?.name ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(set?.image_url ?? null);
  const [price, setPrice] = useState(set?.price ?? 0);
  const [items, setItems] = useState<Record<string, number>>(
    () => Object.fromEntries((set?.items ?? []).map((i) => [i.product_id, i.qty])));
  const [packs, setPacks] = useState<Record<string, number>>(
    () => Object.fromEntries((set?.packaging ?? []).map((p) => [p.material_id, p.qty])));

  const toggleItem = (id: string) => setItems((m) => {
    const n = { ...m }; if (n[id]) delete n[id]; else n[id] = 1; return n;
  });
  const setItemQty = (id: string, qty: number) => setItems((m) => ({ ...m, [id]: Math.max(1, qty) }));
  const togglePack = (id: string) => setPacks((m) => {
    const n = { ...m }; if (n[id]) delete n[id]; else n[id] = 1; return n;
  });
  const setPackQty = (id: string, qty: number) => setPacks((m) => ({ ...m, [id]: Math.max(1, qty) }));

  const itemsCost = Object.entries(items).reduce((a, [id, q]) => a + (products.find((p) => p.id === id)?.price ?? 0) * q, 0);
  const packCost = Object.entries(packs).reduce((a, [id, q]) => a + (packaging.find((m) => m.id === id)?.unit_price ?? 0) * q, 0);

  const mut = useMutation({
    mutationFn: () => {
      const body = {
        name, emoji: set?.emoji ?? "🎁", image_url: imageUrl, price,
        items: Object.entries(items).map(([product_id, qty]) => ({ product_id, qty })),
        packaging: Object.entries(packs).map(([material_id, qty]) => ({ material_id, qty })),
      };
      return set ? api.put(`/sets/${set.id}`, body) : api.post("/sets", body);
    },
    onSuccess: onSaved,
  });

  const chosen = Object.keys(items).length;
  return (
    <Modal wide title={set ? "To'plamni tahrirlash" : "Yangi to'plam"} onClose={onClose}
      footer={<Button variant="ok" className="w-full" onClick={() => mut.mutate()} disabled={!name || chosen === 0 || price <= 0 || mut.isPending}>{mut.isPending ? "Saqlanmoqda…" : set ? "O'zgarishlarni saqlash" : "To'plamni saqlash"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <div className="flex gap-3">
        <Field label="Rasm"><ImagePicker value={imageUrl} onChange={setImageUrl} /></Field>
        <div className="flex-1"><Field label="To'plam nomi" hint="Rasm yuklanmasa, kartochkada 🎁 belgisi ko'rinadi"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Valentin seti" /></Field></div>
      </div>

      <Field label={`Tarkibidagi mahsulotlar (${chosen} ta tanlandi)`}>
        <div className="grid gap-2 max-h-48 overflow-y-auto scroll-thin pr-0.5">
          {products.map((p) => {
            const on = !!items[p.id];
            return (
              <div key={p.id} className={cx("flex items-center gap-2 p-2 rounded-btn border transition-colors", on ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-border bg-card hover:bg-sunken")}>
                <button onClick={() => toggleItem(p.id)} className="flex items-center gap-2 flex-1 text-left min-w-0">
                  <ItemPic image={p.image_url} emoji={p.emoji} className="w-7 h-7 text-base" rounded="rounded-md" />
                  <span className="text-[12.5px] font-medium text-ink truncate">{p.name}</span>
                </button>
                {on && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setItemQty(p.id, items[p.id] - 1)} className="w-7 h-7 rounded-md border border-border text-muted hover:bg-sunken flex items-center justify-center"><Minus size={14} /></button>
                    <input type="number" value={items[p.id]} onChange={(e) => setItemQty(p.id, +e.target.value)} className="w-10 h-7 text-center rounded-md border border-border text-[12px] font-semibold nums outline-none focus:border-brand-500" />
                    <button onClick={() => setItemQty(p.id, items[p.id] + 1)} className="w-7 h-7 rounded-md border border-border text-muted hover:bg-sunken flex items-center justify-center"><Plus size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Field>

      <Field label={`Qadoqlash (${Object.keys(packs).length} ta) — sotuvda ombordan ayriladi`}>
        {!packaging.length ? (
          <p className="text-[12px] text-faint">Avval Zaxira → Qadoqlash bo'limida qadoqlash materiallari qo'shing.</p>
        ) : (
          <div className="grid gap-2 max-h-44 overflow-y-auto scroll-thin pr-0.5">
            {packaging.map((m) => {
              const on = !!packs[m.id];
              return (
                <div key={m.id} className={cx("flex items-center gap-2 p-2 rounded-btn border transition-colors", on ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-border bg-card hover:bg-sunken")}>
                  <button onClick={() => togglePack(m.id)} className="flex items-center gap-2 flex-1 text-left min-w-0">
                    <span className="w-7 h-7 rounded-md bg-sunken flex items-center justify-center flex-shrink-0"><Package size={15} className="text-muted" /></span>
                    <span className="text-[12.5px] font-medium text-ink truncate">{m.name}</span>
                  </button>
                  {on && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPackQty(m.id, packs[m.id] - 1)} className="w-7 h-7 rounded-md border border-border text-muted hover:bg-sunken flex items-center justify-center"><Minus size={14} /></button>
                      <input type="number" value={packs[m.id]} onChange={(e) => setPackQty(m.id, +e.target.value)} className="w-10 h-7 text-center rounded-md border border-border text-[12px] font-semibold nums outline-none focus:border-brand-500" />
                      <button onClick={() => setPackQty(m.id, packs[m.id] + 1)} className="w-7 h-7 rounded-md border border-border text-muted hover:bg-sunken flex items-center justify-center"><Plus size={14} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Field>

      <Field label="To'plam narxi (so'm)">
        <MoneyInput value={price} onChange={setPrice} />
      </Field>
      <div className="-mt-1.5 flex flex-col gap-1 text-[12px]">
        {itemsCost > 0 && (
          <button onClick={() => setPrice(itemsCost)} className="text-left text-brand-700 font-medium hover:underline">
            Tarkib narxi: {fmt(itemsCost)} — narx sifatida qo'yish
          </button>
        )}
        {packCost > 0 && <span className="text-faint">Qadoqlash tannarxi: {fmt(packCost)} (har sotuvda ayriladi)</span>}
      </div>
    </Modal>
  );
}
