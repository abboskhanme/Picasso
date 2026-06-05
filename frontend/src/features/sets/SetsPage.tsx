import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Minus, Trash2, Gift } from "lucide-react";
import { api, fmt } from "@/lib/api";
import { Product, ProductSet } from "@/types";
import { Card, PageHeader, Button, IconButton, Empty, Spinner, Modal, Field, Input, ErrorBox, MoneyInput, cx, ItemPic, ImagePicker } from "@/components/ui";

export default function SetsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const { data: sets, isLoading } = useQuery({ queryKey: ["sets"], queryFn: () => api.get<ProductSet[]>("/sets") });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => api.get<Product[]>("/products") });

  const refresh = () => qc.invalidateQueries({ queryKey: ["sets"] });
  const archive = useMutation({ mutationFn: (id: string) => api.del(`/sets/${id}`), onSuccess: refresh });

  const prodName = (id: string) => products?.find((p) => p.id === id);

  return (
    <>
      <PageHeader title="To'plamlar"
        subtitle="Bir nechta mahsulotdan iborat sovg'a to'plami — sotuvda bitta narxda sotiladi"
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
                  <div className="font-semibold text-ink">{s.name}</div>
                  <div className="text-[14px] font-bold text-brand-700 nums">{fmt(s.price)}</div>
                </div>
                <IconButton label="Arxivlash" variant="s" className="text-danger" onClick={() => { if (confirm(`"${s.name}" arxivlansinmi?`)) archive.mutate(s.id); }}><Trash2 size={15} /></IconButton>
              </div>
              <div className="mt-3 rounded-lg border border-line bg-sunken/60 divide-y divide-line">
                {s.items.map((it) => {
                  const p = prodName(it.product_id);
                  return (
                    <div key={it.product_id} className="flex items-center gap-2 text-[12.5px] px-3 py-1.5">
                      <ItemPic image={p?.image_url} emoji={p?.emoji} className="w-6 h-6 text-sm" rounded="rounded-md" />
                      <span className="flex-1 font-medium text-body truncate">{p?.name ?? "—"}</span>
                      <span className="text-muted nums">×{it.qty}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {creating && <SetForm products={products ?? []} onClose={() => setCreating(false)} onSaved={() => { refresh(); setCreating(false); }} />}
    </>
  );
}

function SetForm({ products, onClose, onSaved }: { products: Product[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [price, setPrice] = useState(0);
  const [items, setItems] = useState<Record<string, number>>({});

  const toggle = (id: string) => setItems((m) => {
    const n = { ...m };
    if (n[id]) delete n[id]; else n[id] = 1;
    return n;
  });
  const setQty = (id: string, qty: number) => setItems((m) => ({ ...m, [id]: Math.max(1, qty) }));

  const suggested = Object.entries(items).reduce((a, [id, q]) => a + (products.find((p) => p.id === id)?.price ?? 0) * q, 0);

  const mut = useMutation({
    mutationFn: () => api.post("/sets", {
      name, emoji: "🎁", image_url: imageUrl, price,
      items: Object.entries(items).map(([product_id, qty]) => ({ product_id, qty })),
    }),
    onSuccess: onSaved,
  });

  const chosen = Object.keys(items).length;
  return (
    <Modal title="Yangi to'plam" onClose={onClose}
      footer={<Button variant="ok" className="w-full" onClick={() => mut.mutate()} disabled={!name || chosen === 0 || price <= 0 || mut.isPending}>{mut.isPending ? "Saqlanmoqda…" : "To'plamni saqlash"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <div className="flex gap-3">
        <Field label="Rasm"><ImagePicker value={imageUrl} onChange={setImageUrl} /></Field>
        <div className="flex-1"><Field label="To'plam nomi" hint="Rasm yuklanmasa, kartochkada 🎁 belgisi ko'rinadi"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Valentin seti" /></Field></div>
      </div>

      <Field label={`Mahsulotlar (${chosen} ta tanlandi)`}>
        <div className="grid gap-2 max-h-52 overflow-y-auto scroll-thin pr-0.5">
          {products.map((p) => {
            const on = !!items[p.id];
            return (
              <div key={p.id} className={cx("flex items-center gap-2 p-2 rounded-btn border transition-colors", on ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-border bg-card hover:bg-sunken")}>
                <button onClick={() => toggle(p.id)} className="flex items-center gap-2 flex-1 text-left min-w-0">
                  <ItemPic image={p.image_url} emoji={p.emoji} className="w-7 h-7 text-base" rounded="rounded-md" />
                  <span className="text-[12.5px] font-medium text-ink truncate">{p.name}</span>
                </button>
                {on && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQty(p.id, items[p.id] - 1)} className="w-7 h-7 rounded-md border border-border text-muted hover:bg-sunken flex items-center justify-center"><Minus size={14} /></button>
                    <input type="number" value={items[p.id]} onChange={(e) => setQty(p.id, +e.target.value)} className="w-10 h-7 text-center rounded-md border border-border text-[12px] font-semibold nums outline-none focus:border-brand-500" />
                    <button onClick={() => setQty(p.id, items[p.id] + 1)} className="w-7 h-7 rounded-md border border-border text-muted hover:bg-sunken flex items-center justify-center"><Plus size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Field>

      <Field label="To'plam narxi (so'm)">
        <MoneyInput value={price} onChange={setPrice} />
      </Field>
      {suggested > 0 && (
        <button onClick={() => setPrice(suggested)} className="text-[12px] text-brand-700 font-medium -mt-2 hover:underline">
          Tarkib narxi: {fmt(suggested)} — narx sifatida qo'yish
        </button>
      )}
    </Modal>
  );
}
