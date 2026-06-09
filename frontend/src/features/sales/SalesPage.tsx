import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Minus, Trash2, ShoppingCart, Check, Search, ChevronDown } from "lucide-react";
import { api, fmt } from "@/lib/api";
import { Sale, Product, ProductSet, PaymentMethod } from "@/types";
import { Card, PageHeader, Button, Badge, Empty, Spinner, Modal, Field, Input, NumberInput, Segmented, ErrorBox, MoneyInput, PhoneInput, isPhoneComplete, cx, DateTimeField, dtToISO, DateTime, ItemPic } from "@/components/ui";
import { toast, ConfirmDialog } from "@/components/ui/toast";

const payTone: Record<string, string> = { naqd: "g", karta: "b", nasiya: "o" };
const payLabel: Record<string, string> = { naqd: "Naqd", karta: "Karta", nasiya: "Nasiya" };

export default function SalesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Sale | null>(null);
  const { data: sales, isLoading } = useQuery({ queryKey: ["sales"], queryFn: () => api.get<Sale[]>("/sales") });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["sales"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["raw"] });
    qc.invalidateQueries({ queryKey: ["nasiya"] });
    qc.invalidateQueries({ queryKey: ["flows"] });
    qc.invalidateQueries({ queryKey: ["balance"] });
    qc.invalidateQueries({ queryKey: ["movements"] });
  };

  const del = useMutation({
    mutationFn: (id: string) => api.del(`/sales/${id}`),
    onSuccess: () => { refreshAll(); toast("Sotuv o'chirildi — stok va kassa qaytarildi"); },
    onError: (e) => toast((e as Error).message, "error"),
  });

  return (
    <>
      <PageHeader title="Sotuvlar" subtitle="Barcha savdo operatsiyalari tarixi"
        action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Yangi sotuv</Button>} />

      {isLoading ? <Spinner /> : !sales?.length ? (
        <Card><Empty icon={ShoppingCart} text="Hali sotuv qayd etilmagan" action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Birinchi sotuv</Button>} /></Card>
      ) : (
        <Card padded={false}>
          <div className="divide-y divide-line">
            {sales.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                <div className="w-9 h-9 rounded-lg bg-sunken flex items-center justify-center text-lg flex-shrink-0">{s.items[0]?.emoji_snapshot ?? "🍫"}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[13px] text-ink truncate">{s.items.map((i) => `${i.name_snapshot}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ") || "To'plam"}</div>
                  <div className="mt-1"><DateTime value={s.occurred_at} /></div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className={cx("font-semibold text-[13px] nums", s.payment_method === "nasiya" ? "text-warn-fg" : "text-success-fg")}>+{fmt(s.total)}</div>
                  <Badge tone={payTone[s.payment_method]}>{payLabel[s.payment_method]}</Badge>
                </div>
                <button onClick={() => setDeleting(s)} title="O'chirish"
                  className="w-8 h-8 rounded-lg text-faint hover:text-danger hover:bg-danger-bg flex items-center justify-center flex-shrink-0 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {open && <AddSaleModal onClose={() => setOpen(false)} onSaved={() => {
        refreshAll();
        setOpen(false);
      }} />}

      {deleting && <ConfirmDialog title="Sotuvni o'chirish" danger confirmLabel="O'chirish"
        message={<>
          <b>{fmt(deleting.total)}</b> miqdoridagi sotuv o'chirilsinmi?<br /><br />
          Bunda unga bog'liq <b>barcha transaksiyalar orqaga qaytadi</b>: mahsulot va qadoqlash
          stoklari tiklanadi, kassa yozuvi o'chiriladi{deleting.payment_method === "nasiya" ? ", nasiya qarzi bekor bo'ladi" : ""}.
          Bu amalni ortga qaytarib bo'lmaydi.
        </>}
        onConfirm={() => del.mutate(deleting.id)} onClose={() => setDeleting(null)} />}
    </>
  );
}

type CartLine = { product_id: string; name: string; emoji: string; image_url: string | null; unit: string; qty: number; unit_price: number; stock: number };

/* ---------- Professional qidiruvli dropdown — mahsulot tanlash ---------- */
function ProductPicker({ products, onPick }: { products: Product[]; onPick: (p: Product) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Tashqariga bosilganda yopish
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const list = products.filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={cx(
          "w-full h-10 px-3 rounded-btn border bg-card flex items-center justify-between gap-2 text-left transition-all",
          open ? "border-brand-500 shadow-focus" : "border-border hover:bg-sunken/50"
        )}>
        <span className="flex items-center gap-2 text-[13px] text-muted">
          <Search size={15} className="text-faint" /> Mahsulot qidirish va tanlash…
        </span>
        <ChevronDown size={16} className={cx("text-muted transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-card border border-border rounded-card shadow-pop overflow-hidden anim-pop">
          <div className="p-2 border-b border-line">
            <div className="relative">
              <Search size={14} className="text-faint absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nomi bo'yicha qidirish…"
                className="w-full h-8 pl-8 pr-2.5 rounded-btn bg-sunken text-[12.5px] text-ink placeholder:text-faint outline-none" />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto scroll-thin py-1">
            {!list.length ? (
              <div className="py-7 text-center text-[12.5px] text-muted">Hech narsa topilmadi</div>
            ) : (
              list.map((p) => {
                const out = p.stock <= 0;
                return (
                  <button key={p.id} type="button" disabled={out}
                    onClick={() => { onPick(p); setOpen(false); setQ(""); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-brand-50/60 disabled:opacity-45 disabled:pointer-events-none transition-colors">
                    <ItemPic image={p.image_url} emoji={p.emoji} className="w-8 h-8 text-base" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-medium text-ink truncate">{p.name}</span>
                      <span className="block text-2xs text-muted nums">{fmt(p.price)}</span>
                    </span>
                    <Badge tone={out ? "r" : p.stock <= p.min_stock ? "o" : "g"}>
                      {out ? "Tugagan" : `${p.stock} ${p.unit}`}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddSaleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<"dona" | "set">("dona");
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => api.get<Product[]>("/products") });
  const { data: sets } = useQuery({ queryKey: ["sets"], queryFn: () => api.get<ProductSet[]>("/sets") });

  const [cart, setCart] = useState<CartLine[]>([]);
  const [setId, setSetId] = useState("");
  const [pay, setPay] = useState<PaymentMethod>("naqd");
  const [cName, setCName] = useState(""); const [cPhone, setCPhone] = useState("");
  const [when, setWhen] = useState("");

  const selectedSet = sets?.find((s) => s.id === setId);
  const total = mode === "set" ? (selectedSet?.price ?? 0) : cart.reduce((a, l) => a + l.qty * l.unit_price, 0);

  function addToCart(p: Product) {
    setCart((c) => {
      const ex = c.find((l) => l.product_id === p.id);
      if (ex) return c.map((l) => l.product_id === p.id ? { ...l, qty: l.qty + 1 } : l);
      return [...c, { product_id: p.id, name: p.name, emoji: p.emoji, image_url: p.image_url, unit: p.unit, qty: 1, unit_price: p.price, stock: p.stock }];
    });
  }
  const setQty = (id: string, qty: number) => setCart((c) => c.map((l) => l.product_id === id ? { ...l, qty: Math.max(1, qty) } : l));
  const setPrice = (id: string, price: number) => setCart((c) => c.map((l) => l.product_id === id ? { ...l, unit_price: Math.max(0, price) } : l));
  const remove = (id: string) => setCart((c) => c.filter((l) => l.product_id !== id));

  const mut = useMutation({
    mutationFn: () => api.post("/sales", mode === "set"
      ? { kind: "set", set_id: setId, payment_method: pay, customer_name: cName || null, customer_phone: cPhone || null, occurred_at: dtToISO(when) }
      : { kind: "dona", payment_method: pay, items: cart.map((l) => ({ product_id: l.product_id, qty: l.qty, unit_price: l.unit_price })), customer_name: cName || null, customer_phone: cPhone || null, occurred_at: dtToISO(when) }),
    onSuccess: onSaved,
  });

  const canSave = (mode === "set" ? !!setId : cart.length > 0) && (pay !== "nasiya" || (cName && isPhoneComplete(cPhone))) && !mut.isPending;

  return (
    <Modal title="Yangi sotuv" tall onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xs text-muted">Jami summa</div>
            <div className="text-[18px] font-bold text-ink nums">{fmt(total)}</div>
          </div>
          <Button variant="ok" onClick={() => mut.mutate()} disabled={!canSave} className="px-5">
            <Check size={16} /> {mut.isPending ? "Saqlanmoqda…" : "Sotuvni saqlash"}
          </Button>
        </div>
      }>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />

      <Field label="Sotuv turi">
        <Segmented className="w-full" value={mode} onChange={setMode}
          options={[{ value: "dona", label: "Mahsulot" }, { value: "set", label: "To'plam" }]} />
      </Field>

      {mode === "dona" ? (
        <>
          <Field label="Mahsulot qo'shish">
            <ProductPicker products={products ?? []} onPick={addToCart} />
          </Field>

          {cart.length > 0 && (
            <div className="rounded-btn border border-border divide-y divide-line mb-3.5">
              {cart.map((l) => (
                <div key={l.product_id} className="flex items-center gap-2 p-2.5">
                  <ItemPic image={l.image_url} emoji={l.emoji} className="w-7 h-7 text-base" rounded="rounded-md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-ink truncate">{l.name}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-20 sm:w-28"><MoneyInput compact value={l.unit_price} onChange={(v) => setPrice(l.product_id, v)} /></div>
                      <span className="text-2xs text-muted">so'm</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQty(l.product_id, l.qty - 1)} className="w-7 h-7 rounded-md border border-border text-muted hover:bg-sunken flex items-center justify-center"><Minus size={14} /></button>
                    <NumberInput bare value={l.qty} onChange={(v) => setQty(l.product_id, v)} className="w-10 h-7 text-center rounded-md border border-border text-[12px] font-semibold focus:border-brand-500" />
                    <button onClick={() => setQty(l.product_id, l.qty + 1)} className="w-7 h-7 rounded-md border border-border text-muted hover:bg-sunken flex items-center justify-center"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => remove(l.product_id)} className="w-7 h-7 rounded-md text-danger hover:bg-danger-bg flex items-center justify-center"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <Field label="To'plamni tanlang">
          <div className="grid gap-2 max-h-52 overflow-y-auto scroll-thin pr-0.5">
            {!sets?.length ? <div className="text-[12.5px] text-muted py-3 text-center">To'plam yo'q. «To'plamlar» bo'limida yarating.</div> :
              sets.map((s) => (
                <button key={s.id} onClick={() => setSetId(s.id)}
                  className={cx("flex items-center gap-2.5 p-2.5 rounded-btn border text-left transition-colors",
                    setId === s.id ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-border bg-card hover:bg-sunken")}>
                  <ItemPic image={s.image_url} emoji={s.emoji} className="w-9 h-9 text-xl" />
                  <span className="flex-1">
                    <span className="block text-[13px] font-medium text-ink">{s.name}</span>
                    <span className="block text-2xs text-muted">{s.items.length} ta mahsulot</span>
                  </span>
                  <span className="font-semibold text-[13px] text-ink nums">{fmt(s.price)}</span>
                </button>
              ))}
          </div>
        </Field>
      )}

      <Field label="To'lov turi">
        <Segmented className="w-full" value={pay} onChange={(v) => setPay(v as PaymentMethod)}
          options={(["naqd", "karta", "nasiya"] as PaymentMethod[]).map((m) => ({ value: m, label: payLabel[m] }))} />
      </Field>

      {pay === "nasiya" && (
        <div className="rounded-btn border border-warn-bg bg-warn-bg/40 p-3 mb-1">
          <div className="text-[12px] font-semibold text-warn-fg mb-2">Nasiya uchun mijoz ma'lumoti</div>
          <Input placeholder="Mijoz ismi" className="mb-2" value={cName} onChange={(e) => setCName(e.target.value)} />
          <PhoneInput value={cPhone} onChange={setCPhone} />
        </div>
      )}

      <DateTimeField value={when} onChange={setWhen} />
    </Modal>
  );
}
