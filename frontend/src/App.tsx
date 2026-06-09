import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getToken, me, isOwner } from "@/lib/api";
import Shell from "@/components/layout/Shell";
import LoginPage from "@/features/auth/LoginPage";
import DashboardPage from "@/features/dashboard/DashboardPage";
import SalesPage from "@/features/sales/SalesPage";
import ZaxiraPage from "@/features/stock/ZaxiraPage";
import StockPage from "@/features/stock/StockPage";
import SetsPage from "@/features/sets/SetsPage";
import NasiyaPage from "@/features/nasiya/NasiyaPage";
import FinancePage from "@/features/finance/FinancePage";
import SettingsPage from "@/features/settings/SettingsPage";

function Protected() {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <Shell><Outlet /></Shell>;
}

/** Faqat egasi/administrator kira oladigan sahifalar uchun (masalan Moliya). */
function OwnerOnly() {
  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: me, staleTime: Infinity });
  if (isLoading) return null;
  if (!isOwner(data?.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Protected />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/sotuv" element={<SalesPage />} />
          <Route path="/nasiya" element={<NasiyaPage />} />
          <Route path="/zaxira" element={<ZaxiraPage />} />
          <Route path="/toplamlar" element={<SetsPage />} />
          <Route element={<OwnerOnly />}>
            <Route path="/moliya" element={<FinancePage />} />
          </Route>
          <Route path="/ombor" element={<StockPage />} />
          <Route path="/sozlamalar" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
