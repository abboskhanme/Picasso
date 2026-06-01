import { useState } from "react";
import { Factory, History } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader, Segmented } from "@/components/ui";
import { Toaster } from "@/components/ui/toast";
import ProductionTab from "./ProductionTab";
import MovementsTab from "./MovementsTab";

type Tab = "ishlab" | "harakat";

const TABS: { value: Tab; label: string; icon: LucideIcon }[] = [
  { value: "ishlab", label: "Ishlab chiqarish", icon: Factory },
  { value: "harakat", label: "Harakatlar tarixi", icon: History },
];

export default function StockPage() {
  const [tab, setTab] = useState<Tab>("ishlab");
  return (
    <>
      <PageHeader title="Ombor jurnali" subtitle="Ishlab chiqarish partiyalari va barcha ombor harakatlari tarixi" />

      <div className="mb-5 overflow-x-auto scroll-thin -mx-1 px-1">
        <Segmented value={tab} onChange={setTab}
          options={TABS.map((t) => {
            const I = t.icon;
            return { value: t.value, label: <span className="flex items-center gap-1.5 whitespace-nowrap"><I size={14} /> {t.label}</span> };
          })} />
      </div>

      {tab === "ishlab" && <ProductionTab />}
      {tab === "harakat" && <MovementsTab />}

      <Toaster />
    </>
  );
}
