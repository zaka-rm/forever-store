/**
 * Toasts — background confirmation that never interrupts (calm software).
 * `toast("Order confirmed")` from anywhere; optional Undo action makes safe,
 * reversible acts (archive, discontinue) one keystroke from repair — the
 * commerce-admin pattern (confirm quietly, undo cheaply).
 * Announced politely to screen readers via aria-live.
 */
import { useEffect, useRef, useState } from "react";

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
    };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => setItems((prev) => prev.filter((x) => x.id !== t.id))} />
      ))}
    </div>
  );
}

function ToastItem({ toast: item, onDismiss }: { toast: ToastMsg; onDismiss: () => void }) {
  const timer = useRef<number | null>(null);
  const remaining = useRef(item.actionLabel ? LIFE_WITH_ACTION_MS : LIFE_MS);
  const started = useRef(Date.now());

  const resume = () => {
    if (timer.current !== null) return;
    started.current = Date.now();
    timer.current = window.setTimeout(onDismiss, remaining.current);
  };
  const pause = () => {
    if (timer.current === null) return;
    window.clearTimeout(timer.current);
    timer.current = null;
    remaining.current = Math.max(500, remaining.current - (Date.now() - started.current));
  };

  useEffect(() => {
    resume();
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
    // One lifetime per toast; callbacks intentionally do not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="toast"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) resume(); }}
    >
      <span>{item.text}</span>
      {item.actionLabel && (
        <button
          onClick={() => {
            item.onAction?.();
            onDismiss();
          }}
        >
          {item.actionLabel}
        </button>
      )}
      <button className="toast-dismiss" aria-label="Dismiss notification" onClick={onDismiss}>×</button>
    </div>
  );
}
