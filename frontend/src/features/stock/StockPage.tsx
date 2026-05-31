import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Wheat, Candy, Package, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api, fmt } from "@/lib/api";
import { Product, RawMaterial } from "@/types";
import { Card, PageHeader, Section, Button, IconButton, Badge, Empty, Spinner, Modal, Field, Input, Textarea, Select, Segmented, ErrorBox, cx } from "@/components/ui";

type Tab = "xomashyo" | "tayyor" | "qadoqlash";

const TAB_META: Record<Tab, { label: string; icon: LucideIcon }> = {
  xomashyo: { label: "Xomashyo", icon: Wheat },
  tayyor: { label: "Tayyor mahsulot", icon: Candy },
  qadoqlash: { label: "Qadoqlash", icon: Package },
};

const UNITS: Record<string, { v: string; l: string }[]> = {
  xomashyo: [{ v: "kg", l: "Kg" }, { v: "gramm", l: "gr" }],
  qadoqlash: [{ v: "dona", l: "dona" }, { v: "metr", l: "metr" }],
};
const unitLabel = (u: string) => (u === "gramm" ? "gr" : u);

function stockState(stock: number, min: number) {
  if (stock === 0) return { tone: "r", label: "Tugagan", avatar: "bg-danger-bg text-danger-fg", ring: "border-danger-bg" };
  if (stock <= min) return { tone: "o", label: "Kam qoldi", avatar: "bg-warn-bg text-warn-fg", ring: "border-warn-bg" };
  return { tone: "g", label: "Yetarli", avatar: "bg-success-bg text-success-fg", ring: "border-border" };
}

export default function StockPage() {
  const [tab, setTab] = useState<Tab>("xomashyo");
  return (
    <>
      <PageHeader title="Ombor" subtitle="Xomashyo, tayyor mahsulot va qadoqlash zaxiralari" />
      <div className="mb-5">
        <Segmented value={tab} onChange={setTab}
          options={(Object.keys(TAB_META) as Tab[]).map((k) => {
            const I = TAB_META[k].icon;
            return { value: k, label: <span className="flex items-center gap-1.5"><I size={14} /> {TAB_META[k].label}</span> };
          })} />
      </div>

      {tab === "tayyor" ? <ProductsTab /> : <RawTab category={tab} />}
    </>
  );
}

/* ===================== XOMASHYO / QADOQLASH ===================== */
function RawTab({ category }: { category: "xomashyo" | "qadoqlash" }) {
  const qc = useQueryClient();
  const [editItem, setEditItem] = useState<RawMaterial | null>(null);
  const [creating, setCreating] = useState(false);
  const [moveItem, setMoveItem] = useState<{ item: RawMaterial; mode: "buy" | "use" } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["raw", category],
    queryFn: () => api.get<RawMaterial[]>(`/stock/raw?category=${category}`),
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["raw", category] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };
  const archive = useMutation({ mutationFn: (id: string) => api.del(`/stock/raw/${id}`), onSuccess: refresh });

  const Ico = category === "qadoqlash" ? Package : Wheat;

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <Section>{category === "qadoqlash" ? "Qadoqlash materiallari" : "Xomashyo"}</Section>
        <Button onClick={() => setCreating(true)}><Plus size={16} /> Qo'shish</Button>
      </div>

      {isLoading ? <Spinner /> : !data?.length ? (
        <Card><Empty icon={Ico} text="Hozircha element yo'q" action={<Button onClick={() => setCreating(true)}><Plus size={16} /> Qo'shish</Button>} /></Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {data.map((m) => {
            const st = stockState(m.stock, m.min_stock);
            return (
              <Card key={m.id} className={cx("!mb-0", st.ring !== "border-border" && st.ring)}>
                <div className="flex items-start gap-3">
                  <div className={cx("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", st.avatar)}>
                    <Ico size={19} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink truncate">{m.name}</div>
                    <div className="text-2xs text-muted nums">{m.unit_price ? `${fmt(m.unit_price)} / ${unitLabel(m.unit)}` : `o'lchov: ${unitLabel(m.unit)}`}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      <span className="text-[13px] font-semibold text-ink nums">{m.stock} {unitLabel(m.unit)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3.5">
                  <Button variant="ok" size="sm" className="flex-1" onClick={() => setMoveItem({ item: m, mode: "buy" })}><ArrowDownToLine size={14} /> Kirim</Button>
                  <Button variant="s" size="sm" className="flex-1" onClick={() => setMoveItem({ item: m, mode: "use" })}><ArrowUpFromLine size={14} /> Sarflash</Button>
                  <IconButton label="Tahrirlash" variant="s" className="h-8 w-8" onClick={() => setEditItem(m)}><Pencil size={14} /></IconButton>
                  <IconButton label="Arxivlash" variant="s" className="h-8 w-8 text-danger" onClick={() => { if (confirm(`"${m.name}" arxivlansinmi?`)) archive.mutate(m.id); }}><Trash2 size={14} /></IconButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {creating && <RawForm category={category} onClose={() => setCreating(false)} onSaved={() => { refresh(); setCreating(false); }} />}
      {editItem && <RawForm category={category} item={editItem} onClose={() => setEditItem(null)} onSaved={() => { refresh(); setEditItem(null); }} />}
      {moveItem && <RawMoveModal {...moveItem} onClose={() => setMoveItem(null)} onSaved={() => { refresh(); setMoveItem(null); }} />}
    </>
  );
}

function RawForm({ category, item, onClose, onSaved }:
  { category: "xomashyo" | "qadoqlash"; item?: RawMaterial; onClose: () => void; onSaved: () => void }) {
  const units = UNITS[category];
  const [name, setName] = useState(item?.name ?? "");
  const [unit, setUnit] = useState(item?.unit ?? units[0].v);
  const [unitPrice, setUnitPrice] = useState(item?.unit_price ?? 0);
  const [minStock, setMinStock] = useState(item?.min_stock ?? 0);
  const [stock, setStock] = useState(item?.stock ?? 0);

  const mut = useMutation({
    mutationFn: () => item
      ? api.patch(`/stock/raw/${item.id}`, { name, unit, unit_price: unitPrice, min_stock: minStock })
      : api.post("/stock/raw", { name, category, unit, unit_price: unitPrice, min_stock: minStock, stock }),
    onSuccess: onSaved,
  });

  const title = (item ? "Tahrirlash · " : "Yangi · ") + (category === "qadoqlash" ? "Qadoqlash" : "Xomashyo");
  return (
    <Modal title={title} onClose={onClose}
      footer={<Button variant="ok" className="w-full" onClick={() => mut.mutate()} disabled={!name || mut.isPending}>{mut.isPending ? "Saqlanmoqda…" : "Saqlash"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <Field label="Nomi"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={category === "qadoqlash" ? "masalan: Sovg'a qutisi" : "masalan: Kakao kukuni"} /></Field>
      <div className="flex gap-3">
        <div className="flex-1"><Field label="O'lchov turi">
          <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {units.map((u) => <option key={u.v} value={u.v}>{u.l}</option>)}
          </Select></Field></div>
        <div className="flex-1"><Field label={`Narx (so'm / ${unitLabel(unit)})`}>
          <Input type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(+e.target.value)} /></Field></div>
      </div>
      <div className="flex gap-3">
        {!item && <div className="flex-1"><Field label={`Boshlang'ich miqdor (${unitLabel(unit)})`}>
          <Input type="number" min={0} value={stock} onChange={(e) => setStock(+e.target.value)} /></Field></div>}
        <div className="flex-1"><Field label={`Min. zaxira (${unitLabel(unit)})`}>
          <Input type="number" min={0} value={minStock} onChange={(e) => setMinStock(+e.target.value)} /></Field></div>
      </div>
    </Modal>
  );
}

function RawMoveModal({ item, mode, onClose, onSaved }:
  { item: RawMaterial; mode: "buy" | "use"; onClose: () => void; onSaved: () => void }) {
  const [qty, setQty] = useState(0);
  const [cost, setCost] = useState(0);
  const [note, setNote] = useState("");
  const u = unitLabel(item.unit);

  const mut = useMutation({
    mutationFn: () => mode === "buy"
      ? api.post("/stock/raw/buy", { material_id: item.id, qty, cost })
      : api.post("/stock/raw/use", { material_id: item.id, qty, note: note || null }),
    onSuccess: onSaved,
  });

  return (
    <Modal title={(mode === "buy" ? "Kirim · " : "Sarflash · ") + item.name} onClose={onClose}
      footer={<Button variant={mode === "buy" ? "ok" : "p"} className="w-full" onClick={() => mut.mutate()} disabled={qty <= 0 || mut.isPending}>{mut.isPending ? "Saqlanmoqda…" : mode === "buy" ? "Kirim qilish" : "Sarflash"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <div className="text-[12.5px] text-muted mb-3.5">Joriy qoldiq: <b className="text-ink nums">{item.stock} {u}</b></div>
      <Field label={`Miqdor (${u})`}><Input type="number" min={0} value={qty} onChange={(e) => setQty(+e.target.value)} /></Field>
      {mode === "buy"
        ? <Field label="Umumiy narx (so'm)"><Input type="number" min={0} value={cost} onChange={(e) => setCost(+e.target.value)} /></Field>
        : <Field label="Izoh (ixtiyoriy)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="masalan: Sut shokoladi uchun" /></Field>}
    </Modal>
  );
}

/* ===================== TAYYOR MAHSULOT ===================== */
function ProductsTab() {
  const qc = useQueryClient();
  const [editItem, setEditItem] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [stockItem, setStockItem] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["products"], queryFn: () => api.get<Product[]>("/products") });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };
  const archive = useMutation({ mutationFn: (id: string) => api.del(`/products/${id}`), onSuccess: refresh });

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <Section>Tayyor mahsulotlar</Section>
        <Button onClick={() => setCreating(true)}><Plus size={16} /> Yangi mahsulot</Button>
      </div>

      {isLoading ? <Spinner /> : !data?.length ? (
        <Card><Empty icon={Candy} text="Mahsulot yo'q" action={<Button onClick={() => setCreating(true)}><Plus size={16} /> Yangi mahsulot</Button>} /></Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {data.map((p) => {
            const st = stockState(p.stock, p.min_stock);
            const margin = p.price - p.cost_price;
            return (
              <Card key={p.id} className={cx("!mb-0", st.ring !== "border-border" && st.ring)}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sunken flex items-center justify-center text-xl flex-shrink-0">{p.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink">{p.name}</span>
                      {p.category && <Badge tone="b">{p.category}</Badge>}
                    </div>
                    {p.description && <div className="text-2xs text-muted mt-0.5 truncate">{p.description}</div>}
                    <div className="mt-2 flex items-center gap-2">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      <span className="text-[13px] font-semibold text-ink nums">{p.stock} {p.unit}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3.5">
                  <div className="bg-sunken rounded-lg py-2 text-center"><div className="text-2xs text-muted">Tannarx</div><div className="text-[12px] font-semibold text-ink nums">{p.cost_price.toLocaleString("uz-UZ")}</div></div>
                  <div className="bg-sunken rounded-lg py-2 text-center"><div className="text-2xs text-muted">Sotish</div><div className="text-[12px] font-semibold text-ink nums">{p.price.toLocaleString("uz-UZ")}</div></div>
                  <div className="bg-success-bg rounded-lg py-2 text-center"><div className="text-2xs text-success-fg/80">Foyda</div><div className={cx("text-[12px] font-semibold nums", margin >= 0 ? "text-success-fg" : "text-danger-fg")}>{margin.toLocaleString("uz-UZ")}</div></div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="ok" size="sm" className="flex-1" onClick={() => setStockItem(p)}>Qoldiq</Button>
                  <Button variant="s" size="sm" className="flex-1" onClick={() => setEditItem(p)}><Pencil size={14} /> Tahrir</Button>
                  <IconButton label="Arxivlash" variant="s" className="h-8 w-8 text-danger" onClick={() => { if (confirm(`"${p.name}" arxivlansinmi?`)) archive.mutate(p.id); }}><Trash2 size={14} /></IconButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {creating && <ProductForm onClose={() => setCreating(false)} onSaved={() => { refresh(); setCreating(false); }} />}
      {editItem && <ProductForm item={editItem} onClose={() => setEditItem(null)} onSaved={() => { refresh(); setEditItem(null); }} />}
      {stockItem && <ProductStockModal item={stockItem} onClose={() => setStockItem(null)} onSaved={() => { refresh(); setStockItem(null); }} />}
    </>
  );
}

const PROD_UNITS = [{ v: "dona", l: "dona" }, { v: "quti", l: "quti" }, { v: "paket", l: "paket" }];

function ProductForm({ item, onClose, onSaved }: { item?: Product; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [emoji, setEmoji] = useState(item?.emoji ?? "🍫");
  const [category, setCategory] = useState(item?.category ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [costPrice, setCostPrice] = useState(item?.cost_price ?? 0);
  const [price, setPrice] = useState(item?.price ?? 0);
  const [unit, setUnit] = useState(item?.unit ?? "dona");
  const [minStock, setMinStock] = useState(item?.min_stock ?? 5);
  const [stock, setStock] = useState(item?.stock ?? 0);

  const mut = useMutation({
    mutationFn: () => {
      const body = { name, emoji, category: category || null, description: description || null, cost_price: costPrice, price, unit, min_stock: minStock };
      return item ? api.patch(`/products/${item.id}`, body) : api.post("/products", { ...body, stock });
    },
    onSuccess: onSaved,
  });

  return (
    <Modal title={item ? "Mahsulotni tahrirlash" : "Yangi mahsulot"} onClose={onClose}
      footer={<Button variant="ok" className="w-full" onClick={() => mut.mutate()} disabled={!name || mut.isPending}>{mut.isPending ? "Saqlanmoqda…" : "Saqlash"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <div className="flex gap-3">
        <div className="w-20"><Field label="Emoji"><Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="text-center text-lg" /></Field></div>
        <div className="flex-1"><Field label="Nomi"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Oq shokolad bodomli" /></Field></div>
      </div>
      <Field label="Guruh / kategoriya"><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="masalan: Oq shokolad, Truffel" /></Field>
      <Field label="Tarkibi / tavsifi"><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="masalan: Oq shokolad + bodom" /></Field>
      <div className="flex gap-3">
        <div className="flex-1"><Field label="Tannarx (so'm)"><Input type="number" min={0} value={costPrice} onChange={(e) => setCostPrice(+e.target.value)} /></Field></div>
        <div className="flex-1"><Field label="Sotish narxi (so'm)"><Input type="number" min={0} value={price} onChange={(e) => setPrice(+e.target.value)} /></Field></div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1"><Field label="O'lchov"><Select value={unit} onChange={(e) => setUnit(e.target.value)}>{PROD_UNITS.map((u) => <option key={u.v} value={u.v}>{u.l}</option>)}</Select></Field></div>
        {!item && <div className="flex-1"><Field label="Boshlang'ich qoldiq"><Input type="number" min={0} value={stock} onChange={(e) => setStock(+e.target.value)} /></Field></div>}
        <div className="flex-1"><Field label="Min. zaxira"><Input type="number" min={0} value={minStock} onChange={(e) => setMinStock(+e.target.value)} /></Field></div>
      </div>
    </Modal>
  );
}

function ProductStockModal({ item, onClose, onSaved }: { item: Product; onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<"add" | "set">("add");
  const [qty, setQty] = useState(0);
  const mut = useMutation({
    mutationFn: () => api.post(`/products/${item.id}/stock`, { mode, qty }),
    onSuccess: onSaved,
  });
  return (
    <Modal title={"Qoldiq · " + item.name} onClose={onClose}
      footer={<Button variant="ok" className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Saqlanmoqda…" : "Saqlash"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <div className="text-[12.5px] text-muted mb-3.5">Joriy qoldiq: <b className="text-ink nums">{item.stock} {item.unit}</b></div>
      <Field label="Amal turi">
        <Segmented className="w-full" value={mode} onChange={setMode}
          options={[{ value: "add", label: "Qo'shish (+)" }, { value: "set", label: "O'rnatish (=)" }]} />
      </Field>
      <Field label={`Miqdor (${item.unit})`}><Input type="number" value={qty} onChange={(e) => setQty(+e.target.value)} /></Field>
    </Modal>
  );
}
