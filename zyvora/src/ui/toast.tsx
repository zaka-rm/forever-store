/**
 * Toasts — background confirmation that never interrupts (calm software).
 * `toast("Order confirmed")` from anywhere; optional Undo action makes safe,
 * reversible acts (archive, discontinue) one keystroke from repair — the
 * commerce-admin pattern (confirm quietly, undo cheaply).
 * Announced politely to screen readers via aria-live.
 */
import { useEffect, useState } from "react";

export interface ToastMsg {
  id: number;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

let nextId = 1;
const EVT = "zyvora:toast";

export function toast(text: string, actionLabel?: string, onAction?: () => void): void {
  window.dispatchEvent(new CustomEvent<ToastMsg>(EVT, { detail: { id: nextId++, text, actionLabel, onAction } }));
}

const LIFE_MS = 4500;
const LIFE_WITH_ACTION_MS = 7000; // leave time to reach the Undo

export function Toasts() {
  const [items, setItems] = useState<ToastMsg[]>([]);

  useEffect(() => {
    const on = (e: Event) => {
      const t = (e as CustomEvent<ToastMsg>).detail;
      setItems((prev) => [...prev.slice(-2), t]); // at most 3 visible
      window.setTimeout(
        () => setItems((prev) => prev.filter((x) => x.id !== t.id)),
        t.actionLabel ? LIFE_WITH_ACTION_MS : LIFE_MS
      );
    };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.text}</span>
          {t.actionLabel && (
            <button
              onClick={() => {
                t.onAction?.();
                setItems((prev) => prev.filter((x) => x.id !== t.id));
              }}
            >
              {t.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
