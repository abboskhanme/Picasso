import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { getToken } from "@/lib/api";
import Shell from "@/components/layout/Shell";
import LoginPage from "@/features/auth/LoginPage";
import DashboardPage from "@/features/dashboard/DashboardPage";
import SalesPage from "@/features/sales/SalesPage";
import ZaxiraPage from "@/features/stock/ZaxiraPage";
import StockPage from "@/features/stock/StockPage";
import SetsPage from "@/features/sets/SetsPage";
import NasiyaPage from "@/features/nasiya/NasiyaPage";
import FinancePage from "@/features/finance/FinancePage";

function Protected() {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <Shell><Outlet /></Shell>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Protected />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/sotuv" element={<SalesPage />} />
          <Route path="/zaxira" element={<ZaxiraPage />} />
          <Route path="/ombor" element={<StockPage />} />
          <Route path="/toplamlar" element={<SetsPage />} />
          <Route path="/nasiya" element={<NasiyaPage />} />
          <Route path="/moliya" element={<FinancePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
