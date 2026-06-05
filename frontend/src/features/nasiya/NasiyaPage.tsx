import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Phone, HandCoins, Check, CheckCircle2 } from "lucide-react";
import { api, fmt, fmtPhone } from "@/lib/api";
import { CustomerBalance } from "@/types";
import { Card, PageHeader, Section, StatCard, Button, Empty, Spinner, Modal, Field, Input, ErrorBox, MoneyInput, cx, DateTimeField, dtToISO } from "@/components/ui";

export default function NasiyaPage() {
  const { data, isLoading } = useQuery({ queryKey: ["nasiya"], queryFn: () => api.get<CustomerBalance[]>("/nasiya") });
  const [payTarget, setPayTarget] = useState<CustomerBalance | null>(null);
  const qc = useQueryClient();

  if (isLoading) return <Spinner />;
  const open = data?.filter((c) => c.debt > 0) ?? [];
  const total = open.reduce((a, c) => a + c.debt, 0);

  return (
    <>
      <PageHeader title="Nasiya" subtitle="Mijozlardan olinadigan qarzlar va to'lovlar" />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard tone="p" icon={HandCoins} value={fmt(total)} label="Jami nasiya qarz" />
        <StatCard tone="b" icon={Phone} value={`${open.length} ta`} label="Nasiyachilar" />
      </div>

      <Section className="mb-2.5">Ochiq nasiyalar</Section>
      {!open.length ? (
        <Card><Empty icon={CheckCircle2} text="Ochiq nasiya yo'q — barcha qarzlar yopilgan" /></Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {open.map((c) => (
            <Card key={c.customer_id} className="!mb-0">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-ink truncate">{c.name}</div>
                  <div className="text-2xs text-muted flex items-center gap-1 mt-0.5 nums"><Phone size={12} /> {fmtPhone(c.phone)}</div>
                </div>
                <Button variant="ok" size="sm" onClick={() => setPayTarget(c)}>To'lov qabul qilish</Button>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-2xs text-muted">Joriy qarz</div>
                  <div className="text-[20px] font-bold text-danger-fg nums">{fmt(c.debt)}</div>
                </div>
                <div className="text-right text-2xs text-muted nums leading-relaxed">
                  <div>Olingan: {fmt(c.total_nasiya)}</div>
                  <div>To'langan: {fmt(c.total_paid)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {payTarget && <PayModal customer={payTarget} onClose={() => setPayTarget(null)} onSaved={() => {
        qc.invalidateQueries({ queryKey: ["nasiya"] });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
        qc.invalidateQueries({ queryKey: ["flows"] });
        setPayTarget(null);
      }} />}
    </>
  );
}

function PayModal({ customer, onClose, onSaved }: { customer: CustomerBalance; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(customer.debt);
  const [note, setNote] = useState("");
  const [when, setWhen] = useState("");

  const mut = useMutation({
    mutationFn: () => api.post(`/nasiya/${customer.customer_id}/pay`, { amount, note: note || null, occurred_at: dtToISO(when) }),
    onSuccess: onSaved,
  });

  const remaining = customer.debt - amount;
  return (
    <Modal title={`To'lov · ${customer.name}`} onClose={onClose}
      footer={<Button variant="ok" className="w-full" onClick={() => mut.mutate()} disabled={amount <= 0 || amount > customer.debt || mut.isPending}><Check size={16} /> {mut.isPending ? "Saqlanmoqda…" : "To'lovni qabul qilish"}</Button>}>
      <ErrorBox message={mut.isError ? (mut.error as Error).message : undefined} />
      <div className="rounded-btn border border-danger-bg bg-danger-bg/50 p-3 mb-4 text-center">
        <div className="text-2xs text-muted">Joriy qarz</div>
        <div className="text-[20px] font-bold text-danger-fg nums">{fmt(customer.debt)}</div>
      </div>

      <Field label="To'lov summasi (so'm)"><MoneyInput thousands value={amount} onChange={setAmount} /></Field>
      <div className="flex gap-2 -mt-1.5 mb-3.5">
        <button onClick={() => setAmount(Math.round(customer.debt / 2))} className="flex-1 h-8 rounded-btn bg-sunken border border-border text-[12px] font-medium text-body hover:bg-card transition-colors">Yarmi</button>
        <button onClick={() => setAmount(customer.debt)} className="flex-1 h-8 rounded-btn bg-sunken border border-border text-[12px] font-medium text-body hover:bg-card transition-colors">To'liq</button>
      </div>
      <Field label="Izoh (ixtiyoriy)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="masalan: qisman to'lov" /></Field>
      <DateTimeField value={when} onChange={setWhen} />

      {amount > 0 && amount <= customer.debt && (
        <div className="text-[12.5px] text-muted">To'lovdan keyin qoladi: <b className={cx("nums", remaining > 0 ? "text-danger-fg" : "text-success-fg")}>{fmt(Math.max(0, remaining))}</b></div>
      )}
    </Modal>
  );
}
