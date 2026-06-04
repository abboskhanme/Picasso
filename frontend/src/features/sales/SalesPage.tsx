import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Minus, Trash2, ShoppingCart, Check } from "lucide-react";
import { api, fmt } from "@/lib/api";
import { Sale, Product, ProductSet, PaymentMethod } from "@/types";
import { Card, PageHeader, Button, Badge, Empty, Spinner, Modal, Field, Input, Segmented, ErrorBox, MoneyInput, PhoneInput, isPhoneComplete, cx } from "@/components/ui";

const payTone: Record<string, string> = { naqd: "g", karta: "b", nasiya: "o" };
const payLabel: Record<string, string> = { naqd: "Naqd", karta: "Karta", nasiya: "Nasiya" };

export default function SalesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: sales, isLoading } = useQuery({ queryKey: ["sales"], queryFn: () => api.get<Sale[]>("/sales") });

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
                  <div className="text-2xs text-muted nums">{new Date(s.occurred_at).toLocaleString("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className={cx("font-semibold text-[13px] nums", s.payment_method === "nasiya" ? "text-warn-fg" : "text-success-fg")}>+{fmt(s.total)}</div>
                  <Badge tone={payTone[s.payment_method]}>{payLabel[s.payment_method]}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {open && <AddSaleModal onClose={() => setOpen(false)} onSaved={() => {
        qc.invalidateQueries({ queryKey: ["sales"] });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
        qc.invalidateQueries({ queryKey: ["products"] });
        qc.invalidateQueries({ queryKey: ["nasiya"] });
        qc.invalidateQueries({ queryKey: ["flows"] });
        setOpen(false);
      }} />}
    </>
  );
}

type CartLine = { product_id: string; name: string; emoji: string; unit: string; qty: number; unit_price: number; stock: number };

function AddSaleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<"dona" | "set">("dona");
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => api.get<Product[]>("/products") });
  const { data: sets } = useQuery({ queryKey: ["sets"], queryFn: () => api.get<ProductSet[]>("/sets") });

  const [cart, setCart] = useState<CartLine[]>([]);
  const [setId, setSetId] = useState("");
  const [pay, setPay] = useState<PaymentMethod>("naqd");
  const [cName, setCName] = useState(""); const [cPhone, setCPhone] = useState("");

  const selectedSet = sets?.find((s) => s.id === setId);
  const total = mode === "set" ? (selectedSet?.price ?? 0) : cart.reduce((a, l) => a + l.qty * l.unit_price, 0);

  function addToCart(p: Product) {
    setCart((c) => {
      const ex = c.find((l) => l.product_id === p.id);
      if (ex) return c.map((l) => l.product_id === p.id ? { ...l, qty: l.qty + 1 } : l);
      return [...c, { product_id: p.id, name: p.name, emoji: p.emoji, unit: p.unit, qty: 1, unit_price: p.price, stock: p.stock }];
    });
  }
  const setQty = (id: string, qty: number) => setCart((c) => c.map((l) => l.product_id === id ? { ...l, qty: Math.max(1, qty) } : l));
  const setPrice = (id: string, price: number) => setCart((c) => c.map((l) => l.product_id === id ? { ...l, unit_price: Math.max(0, price) } : l));
  const remove = (id: string) => setCart((c) => c.filter((l) => l.product_id !== id));

  const mut = useMutation({
    mutationFn: () => api.post("/sales", mode === "set"
      ? { kind: "set", set_id: setId, payment_method: pay, customer_name: cName || null, customer_phone: cPhone || null }
      : { kind: "dona", payment_method: pay, items: cart.map((l) => ({ product_id: l.product_id, qty: l.qty, unit_price: l.unit_price })), customer_name: cName || null, customer_phone: cPhone || null }),
    onSuccess: onSaved,
  });

  const canSave = (mode === "set" ? !!setId : cart.length > 0) && (pay !== "nasiya" || (cName && isPhoneComplete(cPhone))) && !mut.isPending;

  return (
    <Modal title="Yangi sotuv" onClose={onClose}
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
            <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto scroll-thin pr-0.5">
              {products?.map((p) => (
                <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock <= 0}
                  className="flex items-center gap-2 p-2 rounded-btn border border-border bg-card text-left hover:border-brand-200 hover:bg-brand-50/40 disabled:opacity-40 disabled:pointer-events-none transition-colors">
                  <span className="text-lg leading-none">{p.emoji}</span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium text-ink truncate">{p.name}</span>
                    <span className="block text-2xs text-muted nums">{fmt(p.price)} · {p.stock} {p.unit}</span>
                  </span>
                </button>
              ))}
            </div>
          </Field>

          {cart.length > 0 && (
            <div className="rounded-btn border border-border divide-y divide-line mb-3.5">
              {cart.map((l) => (
                <div key={l.product_id} className="flex items-center gap-2 p-2.5">
                  <span className="text-base leading-none">{l.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-ink truncate">{l.name}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-28"><MoneyInput compact value={l.unit_price} onChange={(v) => setPrice(l.product_id, v)} /></div>
                      <span className="text-2xs text-muted">so'm</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQty(l.product_id, l.qty - 1)} className="w-7 h-7 rounded-md border border-border text-muted hover:bg-sunken flex items-center justify-center"><Minus size={14} /></button>
                    <input type="number" value={l.qty} onChange={(e) => setQty(l.product_id, +e.target.value)} className="w-10 h-7 text-center rounded-md border border-border text-[12px] font-semibold nums outline-none focus:border-brand-500" />
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
                  <span className="text-xl leading-none">{s.emoji}</span>
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
    </Modal>
  );
}
