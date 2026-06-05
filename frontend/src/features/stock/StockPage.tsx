import { PageHeader } from "@/components/ui";
import { Toaster } from "@/components/ui/toast";
import MovementsTab from "./MovementsTab";

export default function StockPage() {
  return (
    <>
      <PageHeader title="Harakatlar tarixi" subtitle="Barcha ombor harakatlari: kirim, chiqim, ishlab chiqarish, sotuv va inventarizatsiya" />
      <MovementsTab />
      <Toaster />
    </>
  );
}
