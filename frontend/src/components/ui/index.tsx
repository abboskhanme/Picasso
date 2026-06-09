import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { X, Loader2, AlertCircle, Inbox, ChevronDown, ChevronLeft, ChevronRight, CalendarClock, CalendarDays, Clock, ImagePlus, Check, Search, MoreHorizontal } from "lucide-react";
import { PHONE_COUNTRIES, groupNational, phoneCountry, imgSrc, uploadImage } from "@/lib/api";

/* ---------- utils ---------- */
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/* ---------- surfaces ---------- */
export function Card({ children, className = "", padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <div className={cx("bg-card rounded-card border border-border shadow-card", padded && "p-4 sm:p-5", className)}>
      {children}
    </div>
  );
}

export function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={cx("text-[13px] font-semibold uppercase tracking-wide text-muted", className)}>{children}</h2>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h1 className="text-[19px] sm:text-[21px] font-bold text-ink tracking-[-0.01em] leading-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-muted mt-1 leading-snug">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/* ---------- stat card ---------- */
const statTone: Record<string, { ring: string; icon: string }> = {
  g: { ring: "bg-success-bg", icon: "text-success-fg" },
  o: { ring: "bg-warn-bg", icon: "text-warn-fg" },
  p: { ring: "bg-danger-bg", icon: "text-danger-fg" },
  b: { ring: "bg-info-bg", icon: "text-info-fg" },
};
export function StatCard({ value, label, tone = "g", icon: Ico, hint }:
  { value: ReactNode; label: string; tone?: "g" | "o" | "p" | "b"; icon?: LucideIcon; hint?: string }) {
  const t = statTone[tone];
  return (
    <div className="bg-card rounded-card border border-border shadow-card p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] font-medium text-muted leading-tight">{label}</span>
        {Ico && (
          <span className={cx("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", t.ring)}>
            <Ico size={15} className={t.icon} strokeWidth={2.2} />
          </span>
        )}
      </div>
      <div className="mt-1.5 text-[18px] sm:text-[20px] font-bold text-ink nums leading-tight">{value}</div>
      {hint && <div className="text-2xs text-faint mt-0.5">{hint}</div>}
    </div>
  );
}

/* ---------- buttons ---------- */
const btnBase = "inline-flex items-center justify-center gap-1.5 rounded-btn font-semibold transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none select-none focus-visible:outline-none focus-visible:shadow-focus";
const btnVariant: Record<string, string> = {
  p: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700",
  s: "bg-card text-body border border-border hover:bg-sunken active:bg-sunken",
  ok: "bg-success text-white hover:brightness-95 active:brightness-90",
  no: "bg-danger text-white hover:brightness-95 active:brightness-90",
  ghost: "bg-transparent text-muted hover:bg-sunken hover:text-body",
};
export function Button({ children, variant = "p", size = "md", className = "", ...rest }:
  { children: ReactNode; variant?: "p" | "s" | "ok" | "no" | "ghost"; size?: "sm" | "md" } &
  React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizing = size === "sm" ? "h-8 px-2.5 text-[12px]" : "h-9 px-3.5 text-[13px]";
  return (
    <button {...rest} className={cx(btnBase, btnVariant[variant], sizing, className)}>
      {children}
    </button>
  );
}

export function IconButton({ children, label, variant = "s", className = "", ...rest }:
  { children: ReactNode; label: string; variant?: "s" | "no" | "ghost" } &
  React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} aria-label={label} title={label}
      className={cx(btnBase, btnVariant[variant], "h-9 w-9 p-0", className)}>
      {children}
    </button>
  );
}

/* ---------- segmented control ---------- */
export function Segmented<T extends string>({ options, value, onChange, className = "" }:
  { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cx("inline-flex p-0.5 bg-sunken rounded-btn border border-border", className)}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cx(
            "flex-1 px-3 h-8 rounded-[7px] text-[12.5px] font-semibold transition-colors whitespace-nowrap inline-flex items-center justify-center gap-1.5",
            value === o.value ? "bg-card text-ink shadow-card" : "text-muted hover:text-body"
          )}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- badge ---------- */
const badgeTone: Record<string, string> = {
  g: "bg-success-bg text-success-fg",
  r: "bg-danger-bg text-danger-fg",
  o: "bg-warn-bg text-warn-fg",
  b: "bg-info-bg text-info-fg",
  n: "bg-brand-50 text-brand-700",
  neutral: "bg-sunken text-muted",
};
export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: string; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold leading-none", badgeTone[tone] ?? badgeTone.neutral, className)}>
      {children}
    </span>
  );
}

/* ---------- states ---------- */
export function Empty({ icon: Ico = Inbox, text, action }: { icon?: LucideIcon; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-4">
      <div className="w-12 h-12 rounded-xl bg-sunken flex items-center justify-center mb-3">
        <Ico size={22} className="text-faint" strokeWidth={1.8} />
      </div>
      <p className="text-[13px] text-muted font-medium">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Yuklanmoqda…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-[13px] font-medium">{label}</span>
    </div>
  );
}

/* ---------- modal ---------- */
export function Modal({ title, onClose, children, footer, wide = false, tall = false }:
  { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; tall?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center anim-fade"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx(
        "bg-card w-full rounded-t-2xl sm:rounded-card shadow-pop flex flex-col max-h-[92vh] sm:max-h-[88vh] anim-pop",
        wide ? "sm:max-w-2xl" : "sm:max-w-md"
      )}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line flex-shrink-0">
          <h3 className="text-[15px] font-bold text-ink">{title}</h3>
          <button onClick={onClose} aria-label="Yopish"
            className="w-8 h-8 -mr-1.5 rounded-lg text-muted hover:bg-sunken hover:text-body flex items-center justify-center transition-colors">
            <X size={18} />
          </button>
        </div>
        {/* tall: dropdown kabi ochiluvchi elementlar siqilib qolmasligi uchun balandroq oyna */}
        <div className={cx("px-5 py-4 overflow-y-auto scroll-thin", tall && "min-h-[55vh] sm:min-h-[60vh]")}>{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-line flex-shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- form ---------- */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3.5">
      <label className="text-[12.5px] font-semibold text-body block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-2xs text-faint mt-1">{hint}</p>}
    </div>
  );
}

const fieldCls = "w-full h-9 px-3 rounded-btn border border-border bg-card text-[13px] text-ink placeholder:text-faint outline-none transition-shadow focus:border-brand-500 focus:shadow-focus";
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldCls, props.className)} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldCls, "h-auto py-2 leading-snug resize-none", props.className)} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={cx(fieldCls, "appearance-none pr-8 cursor-pointer", props.className)} />
      <ChevronDown size={16} className="text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

/* ---------- professional dropdown (custom select) ---------- */

/** Brauzerning standart <select> o'rniga dizayn tizimiga mos ochiluvchi ro'yxat.
 *  Menyu portal orqali chiziladi — modal ichida ham qirqilib qolmaydi,
 *  pastda joy bo'lmasa yuqoriga ochiladi. 8 tadan ko'p variant bo'lsa qidiruv chiqadi. */
export function Dropdown({ value, onChange, options, placeholder = "Tanlang…", className = "" }:
  { value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; placeholder?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 0 });

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const up = r.bottom + 300 > window.innerHeight && r.top > 300; // pastda joy yo'q — yuqoriga
    setPos(up
      ? { bottom: window.innerHeight - r.top + 6, left: r.left, width: r.width }
      : { top: r.bottom + 6, left: r.left, width: r.width });
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const move = () => place(); // scroll/resize bo'lsa menyu joyini yangilash
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", move, true);
    window.addEventListener("resize", move);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", move, true);
      window.removeEventListener("resize", move);
    };
  }, [open]);

  const cur = options.find((o) => o.v === value);
  const searchable = options.length > 8;
  const list = searchable && q.trim()
    ? options.filter((o) => o.l.toLowerCase().includes(q.trim().toLowerCase()))
    : options;

  return (
    <>
      <button ref={btnRef} type="button" onClick={() => { if (!open) { place(); setQ(""); } setOpen((o) => !o); }}
        className={cx(
          "w-full h-9 px-3 rounded-btn border bg-card flex items-center justify-between gap-2 text-left text-[13px] transition-all",
          open ? "border-brand-500 shadow-focus" : "border-border hover:bg-sunken/50",
          className
        )}>
        <span className={cx("truncate", cur ? "text-ink" : "text-faint")}>{cur?.l ?? placeholder}</span>
        <ChevronDown size={15} className={cx("text-muted flex-shrink-0 transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && createPortal(
        <div ref={menuRef}
          style={{ position: "fixed", top: pos.top, bottom: pos.bottom, left: pos.left, minWidth: pos.width, zIndex: 80 }}
          className="max-w-[min(320px,90vw)] bg-card border border-border rounded-card shadow-pop overflow-hidden anim-pop">
          {searchable && (
            <div className="p-2 border-b border-line">
              <div className="relative">
                <Search size={13} className="text-faint absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish…"
                  className="w-full h-8 pl-7.5 pr-2.5 rounded-btn bg-sunken text-[12.5px] text-ink placeholder:text-faint outline-none"
                  style={{ paddingLeft: "1.875rem" }} />
              </div>
            </div>
          )}
          <div className="max-h-56 overflow-y-auto scroll-thin py-1">
            {!list.length ? (
              <div className="py-5 text-center text-[12px] text-muted">Hech narsa topilmadi</div>
            ) : (
              list.map((o) => {
                const on = o.v === value;
                return (
                  <button key={o.v} type="button" onClick={() => { onChange(o.v); setOpen(false); }}
                    className={cx(
                      "w-full flex items-center gap-2 px-3 py-2 text-left text-[12.5px] transition-colors",
                      on ? "bg-brand-50/70 text-brand-700 font-semibold" : "text-body font-medium hover:bg-sunken"
                    )}>
                    <span className="flex-1 truncate">{o.l}</span>
                    {on && <Check size={14} className="text-brand-600 flex-shrink-0" strokeWidth={2.5} />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ---------- overflow menyu (⋯) ---------- */

/** Uchta nuqtali (⋯) ochiluvchi amallar menyusi. Menyu portal orqali chiziladi —
 *  kartochka yoki modal overflow'i uni kesib qo'ymaydi, pastda joy bo'lmasa
 *  yuqoriga ochiladi. Har bir element: ikon + matn, ixtiyoriy `danger` rangi. */
export type MenuItem = { label: string; icon?: LucideIcon; onClick: () => void; danger?: boolean };
export function Menu({ items, label = "Boshqa amallar", className = "" }:
  { items: MenuItem[]; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const up = r.bottom + 240 > window.innerHeight && r.top > 240;
    setPos(up
      ? { bottom: window.innerHeight - r.top + 6, right: window.innerWidth - r.right }
      : { top: r.bottom + 6, right: window.innerWidth - r.right });
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const move = () => place();
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", move, true);
    window.addEventListener("resize", move);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", move, true);
      window.removeEventListener("resize", move);
    };
  }, [open]);

  return (
    <>
      <button ref={btnRef} type="button" aria-label={label} title={label}
        onClick={() => { if (!open) place(); setOpen((o) => !o); }}
        className={cx(btnBase, btnVariant.s, "h-8 w-8 p-0", className)}>
        <MoreHorizontal size={16} />
      </button>
      {open && createPortal(
        <div ref={menuRef}
          style={{ position: "fixed", top: pos.top, bottom: pos.bottom, right: pos.right, zIndex: 80 }}
          className="min-w-[176px] bg-card border border-border rounded-card shadow-pop overflow-hidden py-1 anim-pop">
          {items.map((it, i) => {
            const I = it.icon;
            return (
              <button key={i} type="button"
                onClick={() => { setOpen(false); it.onClick(); }}
                className={cx(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12.5px] font-medium transition-colors",
                  it.danger ? "text-danger-fg hover:bg-danger-bg" : "text-body hover:bg-sunken"
                )}>
                {I && <I size={15} className="flex-shrink-0" />}
                {it.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

/* ---------- pul (so'm) kiritish ---------- */
const groupDigits = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** Pul kiritish maydoni. Yozish davomida raqamlar avtomatik guruhlanadi (25 000).
 *
 *  thousands rejimi (katta summalar uchun): «000» tugmasi yo'q — foydalanuvchi faqat
 *  "ming"larni teradi, « 000» yozish davomida o'zi qo'shilib formatlanadi:
 *  "12" tersangiz maydonda darhol "12 000" ko'rinadi. Kursor doim 000 dan oldin
 *  turadi, backspace asosiy raqamni o'chiradi.
 *
 *  Oddiy rejimda aniq summa teriladi (masalan 5 350); "." / "," yoki «000» tugmasi ×1000 qiladi. */
export function MoneyInput({ value, onChange, className, placeholder, compact, thousands }:
  { value: number; onChange: (n: number) => void; className?: string; placeholder?: string; compact?: boolean; thousands?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const parse = (s: string) => {
    const d = s.replace(/\D/g, "").slice(0, 12);
    return d ? +d : 0;
  };
  const x1000 = () => { if (value > 0 && value < 1_000_000_000) onChange(value * 1000); };

  // thousands rejimi faqat 1000 ga karrali qiymat bilan ishlaydi; tashqaridan aniq
  // summa kelsa (masalan, qarzning yarmi 12 350) — oddiy ko'rinishda qoladi
  const suffixMode = !!thousands && value % 1000 === 0;
  const typed = suffixMode && value > 0 ? String(Math.round(value / 1000)) : "";
  const display = thousands
    ? (suffixMode ? (typed ? groupDigits(typed) + " 000" : "") : groupDigits(String(Math.round(value))))
    : (value > 0 ? groupDigits(String(Math.round(value))) : "");

  // Kursor « 000» ichiga o'tib ketmasin — doim terilgan qismdan keyin turadi
  const clampCaret = () => {
    const el = ref.current;
    if (!el || !suffixMode || !typed) return;
    const max = groupDigits(typed).length;
    if ((el.selectionStart ?? 0) > max) el.setSelectionRange(max, max);
  };
  useEffect(clampCaret);

  const handleThousands = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 15);
    let ts: string;
    if (!digits || /^0+$/.test(digits)) ts = "";
    else if (digits.endsWith("000") && digits.length > 3) ts = digits.slice(0, -3); // « 000» joyida — terilgan qismi olamiz
    else ts = digits.replace(/^0+/, ""); // birinchi raqam terildi yoki suffix o'chirildi
    onChange(ts ? +ts.slice(0, 9) * 1000 : 0);
  };

  return (
    <div className="relative w-full">
      <input
        ref={ref}
        inputMode="numeric"
        value={display}
        placeholder={placeholder ?? "0"}
        onChange={(e) => (thousands ? handleThousands(e.target.value) : onChange(parse(e.target.value)))}
        onSelect={clampCaret}
        onKeyDown={(e) => { if (!thousands && (e.key === "." || e.key === ",")) { e.preventDefault(); x1000(); } }}
        className={cx(compact
          ? "w-full h-7 px-2 pr-8 rounded-md border border-border text-[11px] nums outline-none focus:border-brand-500"
          : cx(fieldCls, !thousands && "pr-10", "nums"), className)}
      />
      {!thousands && (
        <button type="button" tabIndex={-1} onClick={x1000} title="Uchta nol qo'shish (×1000)"
          className={cx("absolute top-1/2 -translate-y-1/2 rounded text-faint hover:text-brand-700 hover:bg-brand-50 font-bold nums transition-colors",
            compact ? "right-1 h-5 px-1 text-[9px]" : "right-1.5 h-6 px-1.5 text-[10px]")}>
          000
        </button>
      )}
    </div>
  );
}

/* ---------- telefon kiritish ---------- */

/** Telefon raqam: O'rta Osiyo davlatini tanlash mumkin (🇺🇿 🇰🇿 🇰🇬 🇹🇯 🇹🇲),
 *  raqamlar yozish davomida davlat shabloni bo'yicha guruhlanadi.
 *  value sifatida to'liq "+998976662675" saqlanadi. */
export function PhoneInput({ value, onChange, className }:
  { value: string; onChange: (v: string) => void; className?: string }) {
  const allDigits = value.replace(/\D/g, "");
  const country =
    [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => allDigits.startsWith(c.dial)) ?? PHONE_COUNTRIES[0];
  const national = (allDigits.startsWith(country.dial) ? allDigits.slice(country.dial.length) : "").slice(0, country.len);
  const emit = (dial: string, nat: string) => onChange(nat ? "+" + dial + nat : "");

  return (
    <div className={cx("flex items-center w-full h-9 rounded-btn border border-border bg-card transition-shadow focus-within:border-brand-500 focus-within:shadow-focus", className)}>
      <div className="relative h-full shrink-0">
        <select
          value={country.code}
          onChange={(e) => {
            const next = PHONE_COUNTRIES.find((c) => c.code === e.target.value)!;
            emit(next.dial, national.slice(0, next.len));
          }}
          className="appearance-none h-full pl-3 pr-6 bg-transparent text-[13px] font-medium text-muted nums outline-none cursor-pointer"
          title={country.name}
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.flag} +{c.dial}</option>
          ))}
        </select>
        <ChevronDown size={13} className="text-faint absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
      <input
        type="tel" inputMode="numeric"
        value={groupNational(national, country.groups)}
        placeholder={country.example}
        onChange={(e) => {
          let d = e.target.value.replace(/\D/g, "");
          if (d.startsWith(country.dial) && d.length > country.len) d = d.slice(country.dial.length);
          d = d.slice(0, country.len);
          emit(country.dial, d);
        }}
        className="flex-1 min-w-0 h-full px-2 bg-transparent text-[13px] text-ink placeholder:text-faint outline-none nums"
      />
    </div>
  );
}

/** Telefon raqam tanlangan davlat uchun to'liq kiritilganmi */
export const isPhoneComplete = (v: string) => !!phoneCountry(v.replace(/\D/g, ""));

/* ---------- sana-vaqt ko'rsatish ---------- */
const DT_MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];

/** Sana va vaqtni alohida, professional chiplar ko'rinishida chiqaradi:
 *  [📅 05 iyn] [🕐 14:30]. Bugungi/kechagi sanalar "Bugun"/"Kecha" deb yoziladi,
 *  boshqa yil bo'lsa yil ham qo'shiladi. */
export function DateTime({ value, className }: { value?: string | null; className?: string }) {
  if (!value) return <span className="text-faint text-[11px]">—</span>;
  const d = new Date(value);
  const now = new Date();
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((dayStart(now) - dayStart(d)) / 86_400_000);
  const isToday = diffDays === 0;
  const dateLabel = isToday ? "Bugun" : diffDays === 1 ? "Kecha"
    : `${String(d.getDate()).padStart(2, "0")} ${DT_MONTHS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : ""}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const chip = "inline-flex items-center gap-1 h-[18px] px-1.5 rounded-md text-[10.5px] font-semibold leading-none nums";
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap align-middle", className)}>
      <span className={cx(chip, isToday ? "bg-brand-50 text-brand-700" : "bg-sunken text-muted")}>
        <CalendarDays size={10.5} className={isToday ? "text-brand-600" : "text-faint"} strokeWidth={2.2} />
        {dateLabel}
      </span>
      <span className={cx(chip, "bg-sunken text-muted")}>
        <Clock size={10.5} className="text-faint" strokeWidth={2.2} />
        {time}
      </span>
    </span>
  );
}

/* ---------- sana-vaqt tanlash (kechikkan/esdan chiqqan amallar uchun) ---------- */

/** datetime-local qiymatini API uchun ISO ko'rinishga o'tkazadi (bo'sh → null = hozir). */
export const dtToISO = (v: string): string | null => (v ? new Date(v).toISOString() : null);

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

/* ---------- professional kalendar (custom date picker) ---------- */
const UZ_MONTHS_FULL = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
const UZ_WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"]; // hafta dushanbadan boshlanadi

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Brauzerning standart kalendari o'rniga — dizayn tizimiga mos, o'zbekcha kalendar.
 *  value: "YYYY-MM-DD". max dan keyingi kunlar tanlab bo'lmaydi. */
export function DatePicker({ value, onChange, max }:
  { value: string; onChange: (v: string) => void; max?: string }) {
  const [open, setOpen] = useState(false);
  // Kalendar portal orqali document.body ga chiziladi (fixed) —
  // modal oynalarning overflow'i uni kesib qo'ymaydi.
  const [pos, setPos] = useState<{ left: number; top: number; up: boolean }>({ left: 0, top: 0, up: false });
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const sel = value ? new Date(value + "T00:00") : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [vy, setVy] = useState((sel ?? today).getFullYear());
  const [vm, setVm] = useState((sel ?? today).getMonth());

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    // Modal ichi yoki sahifa aylantirilsa — yopamiz (pozitsiya eskirmasin)
    const s = (e: Event) => { if (!panelRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    document.addEventListener("scroll", s, true);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
      document.removeEventListener("scroll", s, true);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      if (sel) { setVy(sel.getFullYear()); setVm(sel.getMonth()); }
      const r = ref.current?.getBoundingClientRect();
      if (r) {
        const up = window.innerHeight - r.bottom < 340 && r.top > 340;
        setPos({
          left: Math.max(8, Math.min(r.left, window.innerWidth - 258 - 8)),
          top: up ? r.top - 6 : r.bottom + 6,
          up,
        });
      }
    }
    setOpen((o) => !o);
  };

  const nav = (step: number) => {
    const x = new Date(vy, vm + step, 1);
    setVy(x.getFullYear()); setVm(x.getMonth());
  };

  const maxD = max ? new Date(max + "T00:00") : null;
  const pick = (d: Date) => { onChange(isoDate(d)); setOpen(false); };

  // 6×7 katak: dushanbadan boshlab, qo'shni oy kunlari xira
  const offset = (new Date(vy, vm, 1).getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => new Date(vy, vm, 1 - offset + i));

  const label = sel
    ? `${String(sel.getDate()).padStart(2, "0")} ${DT_MONTHS[sel.getMonth()]} ${sel.getFullYear()}`
    : "Sana tanlang";

  return (
    <div ref={ref} className="relative w-full">
      <button type="button" onClick={toggle}
        className={cx(
          "w-full h-9 px-3 rounded-btn border bg-card flex items-center gap-2 text-left transition-all",
          open ? "border-brand-500 shadow-focus" : "border-border hover:bg-sunken/50"
        )}>
        <CalendarDays size={14} className="text-faint flex-shrink-0" />
        <span className={cx("flex-1 text-[13px] nums", sel ? "text-ink" : "text-faint")}>{label}</span>
        <ChevronDown size={14} className={cx("text-muted transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && createPortal(
        <div ref={panelRef}
          className="fixed z-[70] w-[258px] bg-card border border-border rounded-card shadow-pop p-3 anim-pop"
          style={{ left: pos.left, top: pos.top, transform: pos.up ? "translateY(-100%)" : undefined }}>
          {/* Sarlavha: oy-yil + navigatsiya */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold text-ink pl-1">{UZ_MONTHS_FULL[vm]} {vy}</span>
            <span className="flex gap-0.5">
              <button type="button" onClick={() => nav(-1)} aria-label="Oldingi oy"
                className="w-7 h-7 rounded-lg text-muted hover:bg-sunken hover:text-ink flex items-center justify-center transition-colors">
                <ChevronLeft size={15} />
              </button>
              <button type="button" onClick={() => nav(1)} aria-label="Keyingi oy"
                className="w-7 h-7 rounded-lg text-muted hover:bg-sunken hover:text-ink flex items-center justify-center transition-colors">
                <ChevronRight size={15} />
              </button>
            </span>
          </div>

          {/* Hafta kunlari */}
          <div className="grid grid-cols-7 mb-1">
            {UZ_WEEKDAYS.map((w, i) => (
              <span key={w} className={cx("h-7 flex items-center justify-center text-[10.5px] font-semibold uppercase",
                i >= 5 ? "text-danger-fg/60" : "text-faint")}>{w}</span>
            ))}
          </div>

          {/* Kunlar */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((d, i) => {
              const inMonth = d.getMonth() === vm;
              const isSel = !!sel && d.getTime() === sel.getTime();
              const isToday = d.getTime() === today.getTime();
              const disabled = !!maxD && d.getTime() > maxD.getTime();
              return (
                <button key={i} type="button" disabled={disabled} onClick={() => pick(d)}
                  className={cx(
                    "h-8 w-8 mx-auto rounded-lg text-[12px] nums flex items-center justify-center transition-colors",
                    isSel ? "bg-brand-600 text-white font-bold"
                      : isToday ? "text-brand-700 font-bold ring-1 ring-inset ring-brand-500 hover:bg-brand-50"
                      : inMonth ? "text-ink font-medium hover:bg-sunken"
                      : "text-faint/70 hover:bg-sunken",
                    disabled && "opacity-30 pointer-events-none"
                  )}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Pastki qator */}
          <div className="flex justify-end mt-2 pt-2 border-t border-line">
            <button type="button" onClick={() => pick(today)}
              className="px-2.5 h-7 rounded-lg text-[12px] font-semibold text-brand-700 hover:bg-brand-50 transition-colors">
              Bugun
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/** Ixtiyoriy sana-vaqt maydoni. Yopiq holatda "hozirgi vaqt" deb hisoblanadi.
 *  Ochilsa — sana va vaqt ALOHIDA maydonlarda kiritiladi, vaqt 24 soatlik rejimda
 *  (raqam teriladi, ":" o'zi qo'yiladi, 23:59 dan oshmaydi). */
export function DateTimeField({ value, onChange }:
  { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(!!value);
  const date = value ? value.slice(0, 10) : "";
  const time = value.length >= 16 ? value.slice(11, 16) : "";
  const [timeText, setTimeText] = useState(time);

  // Tashqaridan qiymat o'zgarsa (masalan, ochilganda "hozir") vaqt matnini sinxronlash
  useEffect(() => { setTimeText(value.length >= 16 ? value.slice(11, 16) : ""); }, [value]);

  const emit = (d: string, t: string) => onChange(d ? `${d}T${t || "00:00"}` : "");

  /** Terish davomida: faqat raqam, ":" avtomatik, soat≤23 minut≤59. */
  const handleTime = (raw: string) => {
    let dg = raw.replace(/\D/g, "").slice(0, 4);
    if (dg.length >= 2) dg = String(Math.min(23, +dg.slice(0, 2))).padStart(2, "0") + dg.slice(2);
    if (dg.length === 4) dg = dg.slice(0, 2) + String(Math.min(59, +dg.slice(2))).padStart(2, "0");
    setTimeText(dg.length > 2 ? `${dg.slice(0, 2)}:${dg.slice(2)}` : dg);
    if (dg.length === 4) emit(date, `${dg.slice(0, 2)}:${dg.slice(2)}`);
  };

  /** Chala terilgan vaqtni to'ldirish: "9" → 09:00, "14:3" → 14:03 */
  const fixTime = () => {
    const dg = timeText.replace(/\D/g, "");
    if (!dg.length) { setTimeText(time); return; }
    const hh = String(Math.min(23, +dg.slice(0, 2))).padStart(2, "0");
    const mm = String(Math.min(59, +(dg.slice(2) || "0"))).padStart(2, "0");
    setTimeText(`${hh}:${mm}`);
    emit(date, `${hh}:${mm}`);
  };

  return (
    <div className="mb-3.5">
      {!open ? (
        <button type="button" onClick={() => { setOpen(true); onChange(nowLocal()); }}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-700 hover:text-brand-600 transition-colors">
          <CalendarClock size={14} /> Boshqa sana/vaqt tanlash
        </button>
      ) : (
        <Field label="Sana va vaqt" hint="Kechikkan amallar uchun. Bekor qilinsa — hozirgi vaqt yoziladi.">
          <div className="flex items-center gap-2">
            {/* Sana — professional kalendar */}
            <div className="flex-1 min-w-0">
              <DatePicker value={date} max={nowLocal().slice(0, 10)}
                onChange={(d) => emit(d, timeText.length === 5 ? timeText : time)} />
            </div>
            {/* Vaqt — 24 soat */}
            <div className="flex items-center h-9 w-[86px] flex-shrink-0 rounded-btn border border-border bg-card transition-shadow focus-within:border-brand-500 focus-within:shadow-focus">
              <Clock size={13} className="text-faint ml-2.5 mr-1.5 flex-shrink-0" />
              <input value={timeText} onBlur={fixTime} onChange={(e) => handleTime(e.target.value)}
                placeholder="00:00" inputMode="numeric" maxLength={5}
                className="w-full h-full pr-2 bg-transparent text-[13px] text-ink nums outline-none" />
            </div>
            {/* Bekor qilish — hozirgi vaqtga qaytadi */}
            <button type="button" onClick={() => { setOpen(false); onChange(""); }}
              title="Hozirgi vaqtga qaytarish"
              className="h-9 w-9 flex-shrink-0 rounded-btn border border-border text-muted hover:bg-sunken flex items-center justify-center transition-colors">
              <X size={15} />
            </button>
          </div>
        </Field>
      )}
    </div>
  );
}

/* ---------- mahsulot / to'plam rasmi ---------- */

/** Element rasmi: rasm bo'lsa — rasm, bo'lmasa — emoji ko'rsatadi.
 *  className orqali o'lcham va matn kattaligi beriladi (masalan "w-10 h-10 text-xl"). */
export function ItemPic({ image, emoji = "🍫", className = "w-10 h-10 text-xl", rounded = "rounded-lg" }:
  { image?: string | null; emoji?: string | null; className?: string; rounded?: string }) {
  const src = imgSrc(image);
  return (
    <span className={cx("bg-sunken flex items-center justify-center flex-shrink-0 overflow-hidden leading-none", rounded, className)}>
      {src ? <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" /> : (emoji ?? "🍫")}
    </span>
  );
}

/** Rasm tanlash/yuklash maydonchasi (formalar uchun). Tanlangan fayl darhol
 *  serverga yuklanadi va /uploads/... yo'li onChange orqali qaytariladi. */
export function ImagePicker({ value, onChange }:
  { value: string | null; onChange: (v: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const src = imgSrc(value);

  const pick = async (f?: File | null) => {
    if (!f) return;
    setBusy(true); setErr("");
    try {
      const r = await uploadImage(f);
      onChange(r.url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="relative w-16 h-16">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
          title={src ? "Rasmni almashtirish" : "Rasm yuklash"}
          className={cx(
            "w-16 h-16 rounded-xl border flex items-center justify-center overflow-hidden transition-colors",
            src ? "border-border bg-card" : "border-dashed border-border bg-sunken text-faint hover:text-brand-700 hover:border-brand-500"
          )}>
          {busy ? <Loader2 size={18} className="animate-spin text-muted" />
            : src ? <img src={src} alt="" className="w-full h-full object-cover" />
            : (
              <span className="flex flex-col items-center gap-0.5">
                <ImagePlus size={17} strokeWidth={1.8} />
                <span className="text-[9px] font-semibold">Rasm</span>
              </span>
            )}
        </button>
        {src && !busy && (
          <button type="button" onClick={() => onChange(null)} title="Rasmni olib tashlash"
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center shadow-pop">
            <X size={11} strokeWidth={2.5} />
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {err && <p className="text-2xs text-danger-fg mt-1">{err}</p>}
    </div>
  );
}

export function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 bg-danger-bg text-danger-fg text-[12.5px] font-medium rounded-btn px-3 py-2.5 mb-3.5">
      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}
