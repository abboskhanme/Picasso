import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, Wheat, Candy, Package, ArrowDownToLine, ArrowUpFromLine,
  Search, Boxes, AlertTriangle, Ban, Wallet, History, SlidersHorizontal, Factory, ChefHat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api, fmt, fmtShort } from "@/lib/api";
import type { Product, RawMaterial } from "@/types";
import {
  Card, Section, StatCard, Button, Badge, Empty, Spinner,
  Modal, Field, Input, NumberInput, Textarea, Dropdown, Segmented, ErrorBox, MoneyInput, cx,
  DateTimeField, dtToISO, ItemPic, ImagePicker, DatePicker, Menu,
} from "@/components/ui";
import { toast, ConfirmDialog } from "@/components/ui/toast";
import { stockState, SortKey, SORT_OPTIONS, sortAndFilter, unitLabel, nf, StockBar } from "./lib";
import { CountModal, WriteoffModal, HistoryModal } from "./ItemModals";
import { RecipeModal, ProduceModal } from "./ProductionModals";

type SubTab = "xomashyo" | "tayyor" | "qadoqlash";

const TAB_META: Record<SubTab, { label: ReactNode; icon: LucideIcon }> = {
  xomashyo: { label: "Xomashyo", icon: Wheat },
  // Mobil'da "Tayyor", sm+ da to'liq "Tayyor mahsulot" — tor ekranda tab sig'masligini oldini oladi
  tayyor: { label: <>Tayyor<span className="hidden sm:inline"> mahsulot</span></>, icon: Candy },
  qadoqlash: { label: "Qadoqlash", icon: Package },
};

const RAW_UNITS: Record<string, { v: string; l: string }[]> = {
  xomashyo: [{ v: "kg", l: "Kg" }, { v: "gramm", l: "gr" }, { v: "litr", l: "litr" }],
  qadoqlash: [{ v: "dona", l: "dona" }, { v: "metr", l: "metr" }],
};
const PROD_UNITS = [{ v: "dona", l: "dona" }, { v: "quti", l: "quti" }, { v: "paket", l: "paket" }];

function StatGrid({ items }: { items: { count: number; low: number; out: number; value: number } }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <StatCard value={items.count} label="Jami pozitsiya" tone="b" icon={Boxes} />
      <StatCard value={items.low} label="Kam qoldi" tone="o" icon={AlertTriangle} />
      <StatCard value={items.out} label="Tugagan" tone="p" icon={Ban} />
      <StatCard value={fmtShort(items.value) + " so'm"} label="Ombor qiymati" tone="g" icon={Wallet} />
    </div>
  );
}

function Toolbar({ query, setQuery, sort, setSort }:
  { query: string; setQuery: (v: string) => void; sort: SortKey; setSort: (v: SortKey) => void }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <div className="relative flex-1">
        <Search size={15} className="text-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nomi bo'yicha qidirish…" className="pl-9" />
      </div>
      <div className="sm:w-56">
        <Dropdown value={sort} onChange={(v) => setSort(v as SortKey)} options={SORT_OPTIONS} />
      </div>
    </div>
  );
}

export default function InventoryTab() {
  const [tab, setTab] = useState<SubTab>("xomashyo");
  return (
    <>
      <div className="mb-5">
        <Segmented value={tab} onChange={setTab}
          options={(Object.keys(TAB_META) as SubTab[]).map((k) => {
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
  const [countItem, setCountItem] = useState<RawMaterial | null>(null);
  const [writeoffItem, setWriteoffItem] = useState<RawMaterial | null>(null);
  const [historyItem, setHistoryItem] = useState<RawMaterial | null>(null);
  const [archiveItem, setArchiveItem] = useState<RawMaterial | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("low");

  const { data, isLoading } = useQuery({
    queryKey: ["raw", category],
    queryFn: () => api.get<RawMaterial[]>(`/stock/raw?category=${category}`),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["raw"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["movements"] });
    qc.invalidateQueries({ queryKey: ["reorder"] });
  };
  const archive = useMutation({
    mutationFn: (id: string) => api.del(`/stock/raw/${id}`),
    onSuccess: () => { refresh(); toast("Arxivlandi"); },
    onError: (e) => toast((e as Error).message, "error"),
  });

  const Ico = category === "qadoqlash" ? Package : Wheat;
  const all = data ?? [];
  const stats = {
    count: all.length,
    low: all.filter((m) => m.stock > 0 && m.stock <= m.min_stock).length,
    out: all.filter((m) => m.stock === 0).length,
    value: all.reduce((s, m) => s + m.stock * (m.unit_price || 0), 0),
  };
  const list = sortAndFilter(all, query, sort, (i) => i.unit_price || 0);

  return (
    <>
      <StatGrid items={stats} />
      <div className="flex items-center justify-between mb-3">
        <Section>{category === "qadoqlash" ? "Qadoqlash materiallari" : "Xomashyo"}</Section>
        <Button onClick={() => setCreating(true)}><Plus size={16} /> Qo'shish</Button>
      </div>
      {all.length > 0 && <Toolbar query={query} setQuery={setQuery} sort={sort} setSort={setSort} />}

      {isLoading ? <Spinner /> : !all.length ? (
        <Card><Empty icon={Ico} text="Hozircha element yo'q" action={<Button onClick={() => setCreating(true)}><Plus size={16} /> Qo'shish</Button>} /></Card>
      ) : !list.length ? (
        <Card><Empty icon={Search} text={`"${query}" bo'yicha hech narsa topilmadi`} /></Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {list.map((m) => {
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
                      <span className="text-[13px] font-semibold text-ink nums">{nf(m.stock)} {unitLabel(m.unit)}</span>
                      <span className="text-2xs text-faint nums">min {nf(m.min_stock)}</span>
                    </div>
                    <StockBar stock={m.stock} min={m.min_stock} />
                  </div>
                </div>
                <div className="flex gap-2 mt-3.5">
                  <Button variant="ok" size="sm" className="flex-1" onClick={() => setMoveItem({ item: m, mode: "buy" })}><ArrowDownToLine size={14} /> Kirim</Button>
                  <Button variant="s" size="sm" onClick={() => setMoveItem({ item: m, mode: "use" })}><ArrowUpFromLine size={14} /> Sarflash</Button>
                  <Menu items={[
                    { label: "Inventarizatsiya", icon: SlidersHorizontal, onClick: () => setCountItem(m) },
                    { label: "Harakatlar tarixi", icon: History, onClick: () => setHistoryItem(m) },
                    { label: "Tahrirlash", icon: Pencil, onClick: () => setEditItem(m) },
                    { label: "Brak / yo'qotish", icon: Trash2, danger: true, onClick: () => setWriteoffItem(m) },
                    { label: "Arxivlash", icon: Ban, danger: true, onClick: () => setArchiveItem(m) },
                  ]} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {creating && <RawForm category={category} onClose={() => setCreating(false)} onSaved={() => { refresh(); setCreating(false); toast("Qo'shildi"); }} />}
      {editItem && <RawForm category={category} item={editItem} onClose={() => setEditItem(null)} onSaved={() => { refresh(); setEditItem(null); toast("Saqlandi"); }} />}
      {moveItem && <RawMoveModal {...moveItem} onClose={() => setMoveItem(null)} onSaved={() => { refresh(); toast(moveItem.mode === "buy" ? "Kirim qilindi" : "Sarflandi"); setMoveItem(null); }} />}
      {countItem && <CountModal item={countItem} itemType="raw" onClose={() => setCountItem(null)} onSaved={() => { refresh(); setCountItem(null); toast("Inventarizatsiya saqlandi"); }} />}
      {writeoffItem && <WriteoffModal item={writeoffItem} itemType="raw" onClose={() => setWriteoffItem(null)} onSaved={() => { refresh(); setWriteoffItem(null); toast("Brak qayd etildi"); }} />}
      {historyItem && <HistoryModal item={historyItem} itemType="raw" onClose={() => setHistoryItem(null)} />}
      {archiveItem && <ConfirmDialog title="Arxivlash" danger confirmLabel="Arxivlash"
        message={<>"<b>{archiveItem.name}</b>" arxivlansinmi? U ro'yxatdan yashiriladi.</>}
        onConfirm={() => archive.mutate(archiveItem.id)} onClose={() => setArchiveItem(null)} />}
    </>
  );
}

function RawForm({ category, item, onClose, onSaved }:
  { category: "xomashyo" | "qadoqlash"; item?: RawMaterial; onClose: () => void; onSaved: () => void }) {
  const units = RAW_UNITS[category];
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
      footer={<Button className="w-full" onClick={() => mut.mutate()} disabled={!name || mut.isPending}>{mut.isPending ? "Saqlanmoqda…" : "Saqlash"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <Field label="Nomi"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={category === "qadoqlash" ? "masalan: Sovg'a qutisi" : "masalan: Kakao kukuni"} /></Field>
      <div className="flex gap-3">
        <div className="flex-1"><Field label="O'lchov turi">
          <Dropdown value={unit} onChange={setUnit} options={units} /></Field></div>
        <div className="flex-1"><Field label={`Narx (so'm / ${unitLabel(unit)})`}>
          <MoneyInput value={unitPrice} onChange={setUnitPrice} /></Field></div>
      </div>
      <div className="flex gap-3">
        {!item && <div className="flex-1"><Field label={`Boshlang'ich miqdor (${unitLabel(unit)})`}>
          <NumberInput value={stock} onChange={setStock} /></Field></div>}
        <div className="flex-1"><Field label={`Min. zaxira (${unitLabel(unit)})`}>
          <NumberInput value={minStock} onChange={setMinStock} /></Field></div>
      </div>
    </Modal>
  );
}

function RawMoveModal({ item, mode, onClose, onSaved }:
  { item: RawMaterial; mode: "buy" | "use"; onClose: () => void; onSaved: () => void }) {
  const [qty, setQty] = useState(0);
  const [cost, setCost] = useState(0);
  const [expiry, setExpiry] = useState("");
  const [note, setNote] = useState("");
  const [when, setWhen] = useState("");
  const u = unitLabel(item.unit);

  const mut = useMutation({
    mutationFn: () => mode === "buy"
      ? api.post("/stock/raw/buy", { material_id: item.id, qty, cost, expiry_date: expiry || null, note: note || null, occurred_at: dtToISO(when) })
      : api.post("/stock/raw/use", { material_id: item.id, qty, note: note || null, occurred_at: dtToISO(when) }),
    onSuccess: onSaved,
  });

  return (
    <Modal title={(mode === "buy" ? "Kirim · " : "Sarflash · ") + item.name} onClose={onClose}
      footer={<Button variant={mode === "buy" ? "ok" : "p"} className="w-full" onClick={() => mut.mutate()} disabled={qty <= 0 || mut.isPending}>{mut.isPending ? "Saqlanmoqda…" : mode === "buy" ? "Kirim qilish" : "Sarflash"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <div className="text-[12.5px] text-muted mb-3.5">Joriy qoldiq: <b className="text-ink nums">{nf(item.stock)} {u}</b></div>
      <Field label={`Miqdor (${u})`}><NumberInput value={qty} onChange={setQty} /></Field>
      {mode === "buy" ? (
        <>
          <Field label="Umumiy narx (so'm)"><MoneyInput thousands value={cost} onChange={setCost} /></Field>
          <Field label="Yaroqlilik muddati (ixtiyoriy)"><DatePicker value={expiry} onChange={setExpiry} /></Field>
          <Field label="Izoh (ixtiyoriy)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="masalan: hujjat raqami" /></Field>
        </>
      ) : (
        <Field label="Izoh (ixtiyoriy)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="masalan: Sut shokoladi uchun" /></Field>
      )}
      <DateTimeField value={when} onChange={setWhen} />
    </Modal>
  );
}

/* ===================== TAYYOR MAHSULOT ===================== */
function ProductsTab() {
  const qc = useQueryClient();
  const [editItem, setEditItem] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [stockItem, setStockItem] = useState<Product | null>(null);
  const [countItem, setCountItem] = useState<Product | null>(null);
  const [writeoffItem, setWriteoffItem] = useState<Product | null>(null);
  const [historyItem, setHistoryItem] = useState<Product | null>(null);
  const [recipeItem, setRecipeItem] = useState<Product | null>(null);
  const [produceItem, setProduceItem] = useState<Product | null>(null);
  const [archiveItem, setArchiveItem] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("low");

  const { data, isLoading } = useQuery({ queryKey: ["products"], queryFn: () => api.get<Product[]>("/products") });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["raw"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["movements"] });
    qc.invalidateQueries({ queryKey: ["reorder"] });
  };
  const archive = useMutation({
    mutationFn: (id: string) => api.del(`/products/${id}`),
    onSuccess: () => { refresh(); toast("Arxivlandi"); },
    onError: (e) => toast((e as Error).message, "error"),
  });

  const all = data ?? [];
  const stats = {
    count: all.length,
    low: all.filter((p) => p.stock > 0 && p.stock <= p.min_stock).length,
    out: all.filter((p) => p.stock === 0).length,
    value: all.reduce((s, p) => s + p.stock * (p.cost_price || 0), 0),
  };
  const list = sortAndFilter(all, query, sort, (i) => i.price || 0);

  return (
    <>
      <StatGrid items={stats} />
      <div className="flex items-center justify-between mb-3">
        <Section>Tayyor mahsulotlar</Section>
        <Button onClick={() => setCreating(true)}><Plus size={16} /> Yangi mahsulot</Button>
      </div>
      {all.length > 0 && <Toolbar query={query} setQuery={setQuery} sort={sort} setSort={setSort} />}

      {isLoading ? <Spinner /> : !all.length ? (
        <Card><Empty icon={Candy} text="Mahsulot yo'q" action={<Button onClick={() => setCreating(true)}><Plus size={16} /> Yangi mahsulot</Button>} /></Card>
      ) : !list.length ? (
        <Card><Empty icon={Search} text={`"${query}" bo'yicha hech narsa topilmadi`} /></Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {list.map((p) => {
            const st = stockState(p.stock, p.min_stock);
            const margin = p.price - p.cost_price;
            return (
              <Card key={p.id} className={cx("!mb-0", st.ring !== "border-border" && st.ring)}>
                <div className="flex items-start gap-3">
                  <ItemPic image={p.image_url} emoji={p.emoji} className="w-10 h-10 text-xl" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink">{p.name}</span>
                      {p.category && <Badge tone="b">{p.category}</Badge>}
                    </div>
                    {p.description && <div className="text-2xs text-muted mt-0.5 truncate">{p.description}</div>}
                    <div className="mt-2 flex items-center gap-2">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      <span className="text-[13px] font-semibold text-ink nums">{nf(p.stock)} {p.unit}</span>
                      <span className="text-2xs text-faint nums">min {nf(p.min_stock)}</span>
                    </div>
                    <StockBar stock={p.stock} min={p.min_stock} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3.5">
                  <div className="bg-sunken rounded-lg py-2 text-center"><div className="text-2xs text-muted">Tannarx</div><div className="text-[12px] font-semibold text-ink nums">{p.cost_price.toLocaleString("uz-UZ")}</div></div>
                  <div className="bg-sunken rounded-lg py-2 text-center"><div className="text-2xs text-muted">Sotish</div><div className="text-[12px] font-semibold text-ink nums">{p.price.toLocaleString("uz-UZ")}</div></div>
                  <div className="bg-success-bg rounded-lg py-2 text-center"><div className="text-2xs text-success-fg/80">Foyda</div><div className={cx("text-[12px] font-semibold nums", margin >= 0 ? "text-success-fg" : "text-danger-fg")}>{margin.toLocaleString("uz-UZ")}</div></div>
                </div>
                <div className="flex gap-2 mt-3.5">
                  <Button variant="ok" size="sm" className="flex-1" onClick={() => setProduceItem(p)}><Factory size={14} /> Ishlab chiqarish</Button>
                  <Button variant="s" size="sm" onClick={() => setRecipeItem(p)}><ChefHat size={14} /> Retsept</Button>
                  <Menu items={[
                    { label: "Qoldiq qo'shish", icon: Boxes, onClick: () => setStockItem(p) },
                    { label: "Harakatlar tarixi", icon: History, onClick: () => setHistoryItem(p) },
                    { label: "Inventarizatsiya", icon: SlidersHorizontal, onClick: () => setCountItem(p) },
                    { label: "Tahrirlash", icon: Pencil, onClick: () => setEditItem(p) },
                    { label: "Brak / yo'qotish", icon: Trash2, danger: true, onClick: () => setWriteoffItem(p) },
                    { label: "Arxivlash", icon: Ban, danger: true, onClick: () => setArchiveItem(p) },
                  ]} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {creating && <ProductForm onClose={() => setCreating(false)} onSaved={() => { refresh(); setCreating(false); toast("Mahsulot qo'shildi"); }} />}
      {editItem && <ProductForm item={editItem} onClose={() => setEditItem(null)} onSaved={() => { refresh(); setEditItem(null); toast("Saqlandi"); }} />}
      {stockItem && <ProductStockModal item={stockItem} onClose={() => setStockItem(null)} onSaved={() => { refresh(); setStockItem(null); toast("Qoldiq yangilandi"); }} />}
      {countItem && <CountModal item={countItem} itemType="product" onClose={() => setCountItem(null)} onSaved={() => { refresh(); setCountItem(null); toast("Inventarizatsiya saqlandi"); }} />}
      {writeoffItem && <WriteoffModal item={writeoffItem} itemType="product" onClose={() => setWriteoffItem(null)} onSaved={() => { refresh(); setWriteoffItem(null); toast("Brak qayd etildi"); }} />}
      {historyItem && <HistoryModal item={historyItem} itemType="product" onClose={() => setHistoryItem(null)} />}
      {recipeItem && <RecipeModal product={recipeItem} onClose={() => setRecipeItem(null)} onSaved={() => { refresh(); setRecipeItem(null); toast("Retsept saqlandi"); }} />}
      {produceItem && <ProduceModal product={produceItem} onClose={() => setProduceItem(null)} onSaved={() => { refresh(); setProduceItem(null); toast("Ishlab chiqarildi"); }} />}
      {archiveItem && <ConfirmDialog title="Arxivlash" danger confirmLabel="Arxivlash"
        message={<>"<b>{archiveItem.name}</b>" arxivlansinmi? U ro'yxatdan yashiriladi.</>}
        onConfirm={() => archive.mutate(archiveItem.id)} onClose={() => setArchiveItem(null)} />}
    </>
  );
}

function ProductForm({ item, onClose, onSaved }: { item?: Product; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null);
  const [category, setCategory] = useState(item?.category ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [costPrice, setCostPrice] = useState(item?.cost_price ?? 0);
  const [price, setPrice] = useState(item?.price ?? 0);
  const [unit, setUnit] = useState(item?.unit ?? "dona");
  const [minStock, setMinStock] = useState(item?.min_stock ?? 5);
  const [stock, setStock] = useState(item?.stock ?? 0);

  const mut = useMutation({
    mutationFn: () => {
      const body = { name, emoji: item?.emoji ?? "🍫", image_url: imageUrl, category: category || null, description: description || null, cost_price: costPrice, price, unit, min_stock: minStock };
      return item ? api.patch(`/products/${item.id}`, body) : api.post("/products", { ...body, stock });
    },
    onSuccess: onSaved,
  });

  return (
    <Modal title={item ? "Mahsulotni tahrirlash" : "Yangi mahsulot"} onClose={onClose}
      footer={<Button className="w-full" onClick={() => mut.mutate()} disabled={!name || mut.isPending}>{mut.isPending ? "Saqlanmoqda…" : "Saqlash"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <div className="flex gap-3">
        <Field label="Rasm"><ImagePicker value={imageUrl} onChange={setImageUrl} /></Field>
        <div className="flex-1"><Field label="Nomi" hint="Rasm yuklanmasa, kartochkada 🍫 belgisi ko'rinadi"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Oq shokolad bodomli" /></Field></div>
      </div>
      <Field label="Guruh / kategoriya"><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="masalan: Oq shokolad, Truffel" /></Field>
      <Field label="Tarkibi / tavsifi"><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="masalan: Oq shokolad + bodom" /></Field>
      <div className="flex gap-3">
        <div className="flex-1"><Field label="Tannarx (so'm)" hint="Retsept bo'lsa, ishlab chiqarishda avtomatik yangilanadi"><MoneyInput value={costPrice} onChange={setCostPrice} /></Field></div>
        <div className="flex-1"><Field label="Sotish narxi (so'm)"><MoneyInput value={price} onChange={setPrice} /></Field></div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1"><Field label="O'lchov"><Dropdown value={unit} onChange={setUnit} options={PROD_UNITS} /></Field></div>
        {!item && <div className="flex-1"><Field label="Boshlang'ich qoldiq"><NumberInput value={stock} onChange={setStock} /></Field></div>}
        <div className="flex-1"><Field label="Min. zaxira"><NumberInput value={minStock} onChange={setMinStock} /></Field></div>
      </div>
    </Modal>
  );
}

function ProductStockModal({ item, onClose, onSaved }: { item: Product; onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<"add" | "set">("add");
  const [qty, setQty] = useState(0);
  const [when, setWhen] = useState("");
  const mut = useMutation({
    mutationFn: () => api.post(`/products/${item.id}/stock`, { mode, qty, occurred_at: dtToISO(when) }),
    onSuccess: onSaved,
  });
  return (
    <Modal title={"Qoldiq · " + item.name} onClose={onClose}
      footer={<Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Saqlanmoqda…" : "Saqlash"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <div className="text-[12.5px] text-muted mb-3.5">Joriy qoldiq: <b className="text-ink nums">{nf(item.stock)} {item.unit}</b></div>
      <Field label="Amal turi">
        <Segmented className="w-full" value={mode} onChange={setMode}
          options={[{ value: "add", label: "Qo'shish (+)" }, { value: "set", label: "O'rnatish (=)" }]} />
      </Field>
      <Field label={`Miqdor (${item.unit})`}><NumberInput value={qty} onChange={setQty} /></Field>
      <DateTimeField value={when} onChange={setWhen} />
    </Modal>
  );
}
