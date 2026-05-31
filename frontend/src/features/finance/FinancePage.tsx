import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowDownLeft, ArrowUpRight, Check, Wallet, Scale } from "lucide-react";
import { api, fmt } from "@/lib/api";
import { CashFlow } from "@/types";
import { Card, PageHeader, Section, StatCard, Button, Empty, Spinner, Modal, Field, Input, Segmented, ErrorBox, cx } from "@/components/ui";

const OUT_CATS = ["Ijara", "Maosh", "Xom ashyo", "Qadoqlash", "Kommunal", "Reklama", "Boshqa xarajat"];
const IN_CATS = ["Investitsiya", "Qo'shimcha kirim"];

export default function FinancePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const bal = useQuery({ queryKey: ["balance"], queryFn: () => api.get<{ balance: number; total_in: number; total_out: number }>("/finance/balance") });
  const flows = useQuery({ queryKey: ["flows"], queryFn: () => api.get<CashFlow[]>("/finance/cash-flows") });
  if (bal.isLoading || flows.isLoading) return <Spinner />;

  return (
    <>
      <PageHeader title="Moliya" subtitle="Kassa qoldig'i, kirim va chiqimlar"
        action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Kirim / Chiqim</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard tone="g" icon={Wallet} value={fmt(bal.data!.balance)} label="Kassa qoldig'i" />
        <StatCard tone="o" icon={ArrowDownLeft} value={fmt(bal.data!.total_in)} label="Jami kirim" />
        <StatCard tone="p" icon={ArrowUpRight} value={fmt(bal.data!.total_out)} label="Jami chiqim" />
        <StatCard tone="b" icon={Scale} value={fmt(bal.data!.total_in - bal.data!.total_out)} label="Saldo" />
      </div>

      <Section className="mb-2.5">Pul oqimi tarixi</Section>
      {!flows.data?.length ? (
        <Card><Empty icon={Wallet} text="Hali pul oqimi yo'q" action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Kirim / Chiqim</Button>} /></Card>
      ) : (
        <Card padded={false}>
          <div className="divide-y divide-line">
            {flows.data.map((c) => (
              <div key={c.id} className="flex justify-between items-center gap-3 px-4 sm:px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cx("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", c.direction === "in" ? "bg-success-bg text-success-fg" : "bg-danger-bg text-danger-fg")}>
                    {c.direction === "in" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-[13px] text-ink truncate">{c.note || c.category || (c.direction === "in" ? "Kirim" : "Chiqim")}</div>
                    <div className="text-2xs text-muted nums">{c.category} · {new Date(c.occurred_at).toLocaleDateString("uz-UZ")}</div>
                  </div>
                </div>
                <div className={cx("font-semibold text-[13px] nums flex-shrink-0", c.direction === "in" ? "text-success-fg" : "text-danger-fg")}>{c.direction === "in" ? "+" : "−"}{fmt(c.amount)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {open && <FlowModal onClose={() => setOpen(false)} onSaved={() => {
        qc.invalidateQueries({ queryKey: ["flows"] });
        qc.invalidateQueries({ queryKey: ["balance"] });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
        setOpen(false);
      }} />}
    </>
  );
}

function FlowModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [dir, setDir] = useState<"in" | "out">("out");
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState("Ijara");
  const [note, setNote] = useState("");

  const cats = dir === "in" ? IN_CATS : OUT_CATS;
  const mut = useMutation({
    mutationFn: () => api.post("/finance/cash-flows", { direction: dir, amount, category, note: note || null }),
    onSuccess: onSaved,
  });

  function pickDir(d: "in" | "out") {
    setDir(d);
    setCategory(d === "in" ? IN_CATS[0] : OUT_CATS[0]);
  }

  return (
    <Modal title="Pul oqimi" onClose={onClose}
      footer={<Button variant={dir === "in" ? "ok" : "no"} className="w-full" onClick={() => mut.mutate()} disabled={amount <= 0 || mut.isPending}><Check size={16} /> {mut.isPending ? "Saqlanmoqda…" : dir === "in" ? "Kirimni saqlash" : "Chiqimni saqlash"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <Field label="Yo'nalish">
        <Segmented className="w-full" value={dir} onChange={pickDir}
          options={[
            { value: "out", label: <span className="flex items-center gap-1.5"><ArrowUpRight size={14} /> Chiqim</span> },
            { value: "in", label: <span className="flex items-center gap-1.5"><ArrowDownLeft size={14} /> Kirim</span> },
          ]} />
      </Field>

      <Field label="Kategoriya">
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={cx("px-3 h-8 rounded-btn text-[12px] font-medium border transition-colors",
                category === c ? "border-brand-500 bg-brand-50 text-brand-700" : "border-border bg-card text-muted hover:bg-sunken")}>{c}</button>
          ))}
        </div>
      </Field>

      <Field label="Summa (so'm)"><Input type="number" min={0} value={amount} onChange={(e) => setAmount(+e.target.value)} /></Field>
      <Field label="Izoh (ixtiyoriy)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="masalan: May oyi ijarasi" /></Field>
    </Modal>
  );
}
