import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { X, Loader2, AlertCircle, Inbox, ChevronDown } from "lucide-react";

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
export function Modal({ title, onClose, children, footer, wide = false }:
  { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
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
        <div className="px-5 py-4 overflow-y-auto scroll-thin">{children}</div>
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

export function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 bg-danger-bg text-danger-fg text-[12.5px] font-medium rounded-btn px-3 py-2.5 mb-3.5">
      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}
