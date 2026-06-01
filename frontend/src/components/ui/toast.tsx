import { useEffect, useState, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Modal, Button, cx } from "@/components/ui";

/* ============================================================
   Toast — yengil, provider talab qilmaydigan xabarnoma tizimi.
   Ishlatish:  toast("Saqlandi")  yoki  toast("Xato", "error")
   Bir marta <Toaster /> ni daraxtga joylang (App yoki sahifa ichida).
   ============================================================ */

type Tone = "success" | "error" | "info";
type ToastItem = { id: number; message: string; tone: Tone };

let _id = 0;
let _items: ToastItem[] = [];
let _listeners: ((items: ToastItem[]) => void)[] = [];

function emit() {
  for (const l of _listeners) l(_items);
}

export function toast(message: string, tone: Tone = "success", durationMs = 3000) {
  const id = ++_id;
  _items = [..._items, { id, message, tone }];
  emit();
  setTimeout(() => {
    _items = _items.filter((t) => t.id !== id);
    emit();
  }, durationMs);
}

const TONE: Record<Tone, { icon: typeof Info; cls: string }> = {
  success: { icon: CheckCircle2, cls: "bg-success text-white" },
  error: { icon: AlertCircle, cls: "bg-danger text-white" },
  info: { icon: Info, cls: "bg-info-bg text-info-fg" },
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>(_items);
  useEffect(() => {
    _listeners.push(setItems);
    return () => {
      _listeners = _listeners.filter((l) => l !== setItems);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-20 lg:bottom-6 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {items.map((t) => {
        const m = TONE[t.tone];
        return (
          <div
            key={t.id}
            className={cx(
              "anim-pop pointer-events-auto flex items-center gap-2 max-w-sm w-full sm:w-auto rounded-btn px-3.5 py-2.5 shadow-pop text-[13px] font-semibold",
              m.cls
            )}
          >
            <m.icon size={16} className="flex-shrink-0" />
            <span className="flex-1 min-w-0">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   ConfirmDialog — native confirm() o'rniga chiroyli tasdiqlash.
   ============================================================ */

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Tasdiqlash",
  danger = false,
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="s" className="flex-1" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            variant={danger ? "no" : "ok"}
            className="flex-1"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-[13px] text-body leading-relaxed">{message}</p>
    </Modal>
  );
}
