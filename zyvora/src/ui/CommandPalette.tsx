/**
 * Command palette (Ctrl/⌘+K) — one field that reaches everything: views,
 * actions, and the business itself (customers, products, orders by name).
 * The commerce-admin pattern done ZYVORA's way: results come from Business
 * Memory projections, so what you find is always the current truth.
 * Keyboard: ↑↓ move, Enter runs, Esc closes. Focus is restored on close.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoney } from "../core/engine";
import { setDeepLink } from "../core/deepLink";
import type { WorkspaceState } from "../core/types";
import { Icons, type IconName } from "./icons";

export interface Command {
  id: string;
  group: "Go to" | "Actions" | "Customers" | "Products" | "Orders";
  label: string;
  hint?: string;
  icon: IconName;
  run: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  state: WorkspaceState;
  navigate: (view: string) => void;
  actions: { label: string; icon: IconName; run: () => void }[];
}

const NAV_TARGETS: { view: string; label: string; icon: IconName }[] = [
  { view: "today", label: "Today", icon: "today" },
  { view: "notifications", label: "Notifications", icon: "bell" },
  { view: "orders", label: "Orders", icon: "orders" },
  { view: "automations", label: "Workflows", icon: "automation" },
  { view: "finance", label: "Finance", icon: "finance" },
  { view: "customers", label: "Customers", icon: "customers" },
  { view: "inventory", label: "Inventory", icon: "inventory" },
  { view: "promos", label: "Promos", icon: "promos" },
  { view: "analytics", label: "Analytics", icon: "analytics" },
  { view: "ask", label: "Ask ZYVORA", icon: "ask" },
  { view: "import", label: "Import", icon: "import" },
  { view: "team", label: "Team", icon: "team" },
  { view: "memory", label: "Business Memory", icon: "memory" },
];

export function CommandPalette({ open, onClose, state, navigate, actions }: Props) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      restoreRef.current = document.activeElement as HTMLElement | null;
      setQ("");
      setIdx(0);
      // Focus after the overlay paints.
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      restoreRef.current?.focus?.();
    }
  }, [open]);

  const results = useMemo<Command[]>(() => {
    const needle = q.trim().toLowerCase();
    const match = (s: string) => s.toLowerCase().includes(needle);
    const out: Command[] = [];

    for (const n of NAV_TARGETS) {
      if (!needle || match(n.label)) {
        out.push({
          id: `go.${n.view}`, group: "Go to", label: n.label, icon: n.icon,
          run: () => navigate(n.view),
        });
      }
    }
    for (const a of actions) {
      if (!needle || match(a.label)) {
        out.push({ id: `act.${a.label}`, group: "Actions", label: a.label, icon: a.icon, run: a.run });
      }
    }
    if (needle.length >= 2) {
      const seen = new Set<string>();
      for (const o of state.orders) {
        if (!seen.has(o.customer) && match(o.customer)) seen.add(o.customer);
      }
      for (const i of state.invoices) {
        if (!seen.has(i.customer) && match(i.customer)) seen.add(i.customer);
      }
      for (const name of [...seen].slice(0, 5)) {
        out.push({
          id: `cust.${name}`, group: "Customers", label: name, icon: "customers",
          hint: "open profile",
          run: () => { setDeepLink("customer", name); navigate("customers"); },
        });
      }
      for (const p of state.products.filter((p) => !p.discontinued && match(p.name)).slice(0, 5)) {
        out.push({
          id: `prod.${p.productId}`, group: "Products", label: p.name,
          hint: `${p.stock} in stock · ${formatMoney(p.price)}`, icon: "inventory",
          run: () => { setDeepLink("product", p.productId); navigate("inventory"); },
        });
      }
      for (const o of state.orders.filter((o) => match(o.customer)).slice(0, 4)) {
        out.push({
          id: `ord.${o.orderId}`, group: "Orders",
          label: `${o.customer} — ${o.lines.map((l) => `${l.qty}× ${l.productName}`).join(", ")}`,
          hint: o.status, icon: "orders",
          run: () => { setDeepLink("order", o.orderId); navigate("orders"); },
        });
      }
    }
    return out.slice(0, 24);
  }, [q, state, navigate, actions]);

  useEffect(() => setIdx(0), [q]);

  if (!open) return null;

  const runIdx = (i: number) => {
    const r = results[i];
    if (r) {
      onClose();
      r.run();
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); runIdx(idx); }
    else if (e.key === "Tab") {
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>('input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  let lastGroup = "";
  return (
    <div className="cmdk-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKey}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search views, actions, customers, products, orders…"
          aria-label="Search"
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-results"
          aria-activedescendant={results.length > 0 ? `cmdk-option-${idx}` : undefined}
          aria-autocomplete="list"
        />
        <span className="sr-only" aria-live="polite">
          {results.length === 1 ? "1 result" : `${results.length} results`}
        </span>
        <div className="cmdk-list" id="cmdk-results" role="listbox" aria-label="Search results">
          {results.length === 0 && <div className="cmdk-empty">Nothing matches “{q}”.</div>}
          {results.map((r, i) => {
            const header = r.group !== lastGroup ? <div className="cmdk-group" key={`g.${r.group}`}>{r.group}</div> : null;
            lastGroup = r.group;
            return (
              <div key={r.id} role="presentation">
                {header}
                <button
                  id={`cmdk-option-${i}`}
                  className={`cmdk-item${i === idx ? " active" : ""}`}
                  role="option"
                  aria-selected={i === idx}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => runIdx(i)}
                >
                  {Icons[r.icon]()}
                  <span>{r.label}</span>
                  {r.hint && <span className="hint">{r.hint}</span>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="cmdk-foot">
          <span><kbd>↑↓</kbd> move</span>
          <span><kbd>Enter</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
