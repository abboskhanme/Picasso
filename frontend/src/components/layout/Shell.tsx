import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, ShoppingCart, Boxes, History, Gift, HandCoins, Wallet, LogOut, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clearToken, me, isOwner, imgSrc } from "@/lib/api";
import { cx } from "@/components/ui";

/** Foydalanuvchi avatari — rasm bo'lsa rasm, bo'lmasa ikonka. */
function Avatar({ url, className = "w-8 h-8" }: { url?: string | null; className?: string }) {
  const src = imgSrc(url);
  return (
    <span className={cx("rounded-full bg-sunken text-muted flex items-center justify-center overflow-hidden flex-shrink-0", className)}>
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <UserRound size={16} />}
    </span>
  );
}

// ownerOnly: faqat egasi/administrator ko'radi (sotuvchidan yashiriladi)
const nav: { to: string; icon: LucideIcon; label: string; end?: boolean; ownerOnly?: boolean }[] = [
  { to: "/", icon: LayoutDashboard, label: "Bosh sahifa", end: true },
  { to: "/sotuv", icon: ShoppingCart, label: "Sotuv" },
  { to: "/nasiya", icon: HandCoins, label: "Nasiya" },
  { to: "/zaxira", icon: Boxes, label: "Zaxira" },
  { to: "/toplamlar", icon: Gift, label: "To'plamlar" },
  { to: "/moliya", icon: Wallet, label: "Moliya", ownerOnly: true },
  { to: "/ombor", icon: History, label: "Harakatlar" },
];

function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const sq = size === "sm" ? "w-8 h-8 text-[15px]" : "w-9 h-9 text-base";
  return (
    <div className="flex items-center gap-2.5">
      <div className={cx("rounded-[10px] bg-brand-600 text-white font-bold flex items-center justify-center flex-shrink-0", sq)}>P</div>
      <div className="leading-none">
        <div className="font-bold text-ink text-[15px] tracking-[-0.01em]">Picasso</div>
        <div className="text-[10.5px] text-faint font-medium mt-0.5 uppercase tracking-wide">Shokolad ERP</div>
      </div>
    </div>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: me, staleTime: Infinity });
  const visibleNav = nav.filter((n) => !n.ownerOnly || isOwner(user?.role));
  function logout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-bg overflow-x-clip">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[244px] flex-shrink-0 bg-card border-r border-border sticky top-0 h-screen flex-col">
        <div className="px-5 h-16 flex items-center border-b border-line">
          <Logo />
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {visibleNav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => cx(
                "flex items-center gap-3 px-3 h-10 rounded-btn text-[13.5px] font-medium transition-colors",
                isActive ? "bg-brand-50 text-brand-700 font-semibold" : "text-muted hover:bg-sunken hover:text-body"
              )}>
              {({ isActive }) => (
                <>
                  <n.icon size={18} strokeWidth={2} className={isActive ? "text-brand-600" : ""} />
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-line flex flex-col gap-0.5">
          <NavLink to="/sozlamalar"
            className={({ isActive }) => cx(
              "flex items-center gap-2.5 px-2.5 h-12 rounded-btn transition-colors",
              isActive ? "bg-brand-50" : "hover:bg-sunken"
            )}>
            <Avatar url={user?.avatar_url} className="w-8 h-8" />
            <span className="min-w-0 leading-tight">
              <span className="block text-[13px] font-semibold text-ink truncate">{user?.full_name || "Profil"}</span>
              <span className="block text-[11px] text-faint truncate">{user?.email}</span>
            </span>
          </NavLink>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 h-10 rounded-btn text-[13.5px] font-medium text-muted hover:bg-sunken hover:text-body transition-colors">
            <LogOut size={18} strokeWidth={2} /> Chiqish
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile app bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-card/90 backdrop-blur border-b border-border px-4 h-14 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-1">
            <NavLink to="/sozlamalar" aria-label="Sozlamalar"
              className={({ isActive }) => cx("rounded-full p-0.5 transition-colors", isActive && "ring-2 ring-brand-500")}>
              <Avatar url={user?.avatar_url} className="w-8 h-8" />
            </NavLink>
            <button onClick={logout} aria-label="Chiqish"
              className="w-9 h-9 rounded-lg text-muted hover:bg-sunken flex items-center justify-center transition-colors">
              <LogOut size={19} />
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-24 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border flex pb-[env(safe-area-inset-bottom)]">
        {visibleNav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="flex-1 min-w-0 py-2 flex flex-col items-center gap-1">
            {({ isActive }) => (
              <>
                <n.icon size={20} strokeWidth={2} className={isActive ? "text-brand-600" : "text-faint"} />
                <span className={cx("text-[9.5px] font-medium truncate max-w-full px-0.5", isActive ? "text-brand-700" : "text-faint")}>{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
