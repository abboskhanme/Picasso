import { PageHeader } from "@/components/ui";
import { Toaster } from "@/components/ui/toast";
import InventoryTab from "./InventoryTab";
import AlertsBar from "./AlertsBar";

export default function ZaxiraPage() {
  return (
    <>
      <PageHeader title="Zaxira" subtitle="Xomashyo, tayyor mahsulot va qadoqlash qoldiqlari" />
      <AlertsBar />
      <InventoryTab />
      <Toaster />
    </>
  );
}
