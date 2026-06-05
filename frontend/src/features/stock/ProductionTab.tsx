import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Factory, Candy, Trash2 } from "lucide-react";
import { api, fmt } from "@/lib/api";
import type { Product, Production } from "@/types";
import { Card, Section, Button, Badge, Empty, Spinner, DateTime, ItemPic } from "@/components/ui";
import { unitLabel, nf } from "./lib";
import { ProduceModal } from "./ProductionModals";
import { toast, ConfirmDialog } from "@/components/ui/toast";

export default function ProductionTab() {
  const qc = useQueryClient();
  const [produce, setProduce] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Production | null>(null);

  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => api.get<Product[]>("/products") });
  const { data: runs, isLoading } = useQuery({ queryKey: ["productions"], queryFn: () => api.get<Production[]>("/stock/productions") });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["productions"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["raw"] });
    qc.invalidateQueries({ queryKey: ["movements"] });
    qc.invalidateQueries({ queryKey: ["reorder"] });
  };

  const del = useMutation({
    mutationFn: (id: string) => api.del(`/stock/productions/${id}`),
    onSuccess: () => { refresh(); toast("Ishlab chiqarish bekor qilindi — xomashyo qaytarildi"); },
    onError: (e) => toast((e as Error).message, "error", 5000),
  });

  const list = runs ?? [];

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <Section>Ishlab chiqarish tarixi</Section>
      </div>

      {/* Tez ishlab chiqarish — mahsulot tanlash */}
      <Card className="mb-4">
        <div className="text-[12.5px] font-semibold text-body mb-2.5">Yangi ishlab chiqarish</div>
        <div className="flex flex-wrap gap-2">
          {(products ?? []).map((p) => (
            <Button key={p.id} variant="s" size="sm" onClick={() => setProduce(p)}>
              <ItemPic image={p.image_url} emoji={p.emoji} className="w-5 h-5 text-sm mr-0.5" rounded="rounded" /> {p.name}
            </Button>
          ))}
          {!(products ?? []).length && <span className="text-2xs text-faint">Avval mahsulot qo'shing</span>}
        </div>
      </Card>

      {isLoading ? <Spinner /> : !list.length ? (
        <Card><Empty icon={Factory} text="Hali ishlab chiqarish bo'lmagan" /></Card>
      ) : (
        <Card padded={false}>
          <div className="flex flex-col divide-y divide-line">
            {list.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-success-bg text-success-fg flex items-center justify-center flex-shrink-0">
                  <Candy size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-[13.5px] truncate">{r.product_name}</div>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <DateTime value={r.occurred_at} />
                    {r.note && <span className="text-2xs text-muted truncate">{r.note}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <Badge tone="g">+{nf(r.qty)} {unitLabel("dona")}</Badge>
                  <div className="text-2xs text-faint nums mt-1">tannarx {fmt(r.cost_total)}</div>
                </div>
                <button onClick={() => setDeleting(r)} title="O'chirish"
                  className="w-8 h-8 rounded-lg text-faint hover:text-danger hover:bg-danger-bg flex items-center justify-center flex-shrink-0 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {produce && <ProduceModal product={produce} onClose={() => setProduce(null)} onSaved={() => { refresh(); setProduce(null); toast("Ishlab chiqarildi"); }} />}

      {deleting && <ConfirmDialog title="Ishlab chiqarishni o'chirish" danger confirmLabel="O'chirish"
        message={<>
          <b>{deleting.product_name}</b> (+{nf(deleting.qty)}) ishlab chiqarish yozuvi o'chirilsinmi?<br /><br />
          Unga bog'liq <b>barcha transaksiyalar orqaga qaytadi</b>: sarflangan xomashyo omborga
          tiklanadi, tayyor mahsulot kirimi bekor bo'ladi. Bu amalni ortga qaytarib bo'lmaydi.
        </>}
        onConfirm={() => del.mutate(deleting.id)} onClose={() => setDeleting(null)} />}
    </>
  );
}
