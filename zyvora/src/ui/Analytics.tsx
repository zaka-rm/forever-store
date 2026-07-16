/**
 * Analytics & Reports — governed by ZPL-041 §10/§13 and CODEX 00 P4.7:
 * every element answers "what would the Builder do differently?", comparisons
 * run against the business's own history, and every chart ships a table view.
 * Chart craft follows the dataviz method: single validated hue (#0f8a5f),
 * thin rounded marks, recessive axes, direct labels only where they earn it,
 * native per-mark tooltips, no dual axes.
 * Canonical (governance/): CAP-000008 Analytics — FEAT-000059 dashboard
 * composition, FEAT-000060 filters, FEAT-000061 drill-down, FEAT-000063
 * exports, FEAT-000064 forecast overlays.
 */
import { useState } from "react";
import { formatMoney } from "../core/engine";
import {
  DAY,
  forecast,
  orderNetProfit,
  orderRevenue,
} from "../core/projections";
import type { Order, WorkspaceState } from "../core/types";

const MARK = "#0f8a5f"; // validated: lightness band, chroma floor, contrast vs surface

interface MonthPoint {
  key: string;
  label: string;
  value: number;
}

interface DrillRow { key: string; label: string; detail: string; amount: number }

/**
 * Underlying records for one month bucket — the drill-down target (FEAT-000061).
 * `source: "revenue"` matches exactly what the revenue chart bucketed (orders +
 * invoices), so drill-down never disagrees with the bar it explains (Law II —
 * One Source of Truth felt as: no two numbers that should agree ever disagree).
 */
function drillDown(state: WorkspaceState, start: number, end: number, source: "revenue" | "profit"): DrillRow[] {
  const rows: DrillRow[] = [];
  const orders = state.orders.filter(
    (o) => o.deliveredAt && o.deliveredAt >= start && o.deliveredAt < end && o.status !== "returned"
  );
  for (const o of orders) {
    rows.push({
      key: o.orderId,
      label: `${o.customer} — ${o.lines.map((l) => `${l.qty}× ${l.productName}`).join(", ")}`,
      detail: source === "revenue" ? "order" : `net ${formatMoney(orderNetProfit(o))}`,
      amount: source === "revenue" ? orderRevenue(o) : orderNetProfit(o),
    });
  }
  if (source === "revenue") {
    for (const i of state.invoices) {
      if (i.issuedAt >= start && i.issuedAt < end) {
        rows.push({ key: i.invoiceId, label: `${i.customer} — invoice`, detail: "invoice", amount: i.amount });
      }
    }
  }
  return rows.sort((a, b) => b.amount - a.amount);
}

function lastMonths(n: number, now: number): { key: string; label: string; start: number; end: number }[] {
  const out = [];
  const d = new Date(now);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() - i + 1, 1);
    out.push({
      key: `${m.getFullYear()}-${m.getMonth()}`,
      label: m.toLocaleDateString(undefined, { month: "short" }),
      start: m.getTime(),
      end: next.getTime(),
    });
  }
  return out;
}

function bucket(
  months: ReturnType<typeof lastMonths>,
  items: { ts: number; amount: number }[]
): MonthPoint[] {
  return months.map((m) => ({
    key: m.key,
    label: m.label,
    value: items
      .filter((i) => i.ts >= m.start && i.ts < m.end)
      .reduce((s, i) => s + i.amount, 0),
  }));
}

/** Single-series bar chart: thin marks, rounded data-ends, 0-baseline, negatives supported. */
function BarChart({ data, onSelect, selectedKey }: { data: MonthPoint[]; onSelect?: (key: string) => void; selectedKey?: string | null }) {
  const W = 620;
  const H = 170;
  const PAD_L = 8;
  const PAD_B = 22;
  const PAD_T = 18;
  const max = Math.max(0, ...data.map((d) => d.value));
  const min = Math.min(0, ...data.map((d) => d.value));
  const span = max - min || 1;
  const y = (v: number) => PAD_T + ((max - v) / span) * (H - PAD_T - PAD_B);
  const zero = y(0);
  const bw = Math.min(42, (W - PAD_L * 2) / data.length - 8);
  const step = (W - PAD_L * 2) / data.length;
  const peakIdx = data.reduce((bi, d, i) => (Math.abs(d.value) > Math.abs(data[bi].value) ? i : bi), 0);
  const lastIdx = data.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" style={{ width: "100%", height: "auto" }}>
      {/* recessive baseline */}
      <line x1={PAD_L} x2={W - PAD_L} y1={zero} y2={zero} stroke="var(--line)" strokeWidth={1} />
      {data.map((d, i) => {
        const x = PAD_L + i * step + (step - bw) / 2;
        const top = d.value >= 0 ? y(d.value) : zero;
        const h = Math.max(1.5, Math.abs(y(d.value) - zero));
        const showLabel = i === peakIdx || i === lastIdx; // selective direct labels
        const isSelected = selectedKey === d.key;
        return (
          <g
            key={d.key}
            onClick={() => onSelect?.(d.key)}
            style={{ cursor: onSelect ? "pointer" : undefined }}
          >
            <rect
              x={x} y={top} width={bw} height={h} rx={4} fill={MARK}
              opacity={!selectedKey || isSelected ? 1 : 0.35}
            >
              <title>{`${d.label}: ${formatMoney(d.value)}${onSelect ? " — click to see orders" : ""}`}</title>
            </rect>
            {isSelected && (
              <rect x={x - 2} y={top - 2} width={bw + 4} height={h + 4} rx={5} fill="none" stroke={MARK} strokeWidth={1.5} />
            )}
            {showLabel && (
              <text
                x={x + bw / 2}
                y={(d.value >= 0 ? top : top + h) + (d.value >= 0 ? -5 : 13)}
                textAnchor="middle"
                fontSize={11.5}
                fill="var(--ink-soft)"
              >
                {formatMoney(d.value)}
              </text>
            )}
            <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize={11.5} fill="var(--ink-soft)">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ChartCard({
  title,
  note,
  data,
  drillable,
  state,
  months,
}: {
  title: string;
  note?: string;
  data: MonthPoint[];
  drillable?: "revenue" | "profit";
  state?: WorkspaceState;
  months?: ReturnType<typeof lastMonths>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0 && data.every((d) => d.value === 0)) return null;

  const bucket = drillable && selected ? months?.find((m) => m.key === selected) : undefined;
  const drilled = bucket && state ? drillDown(state, bucket.start, bucket.end, drillable!) : [];

  return (
    <div className="card">
      <p className="claim" style={{ fontSize: 15 }}>{title}</p>
      {note && <p className="confidence-note" style={{ marginTop: 0 }}>{note}</p>}
      <BarChart data={data} onSelect={drillable ? (k) => setSelected(k === selected ? null : k) : undefined} selectedKey={selected} />
      {bucket && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
          <p className="confidence-note" style={{ marginTop: 0, marginBottom: 6 }}>
            {drilled.length} record{drilled.length === 1 ? "" : "s"} behind {bucket.label} — this always matches the bar above.
          </p>
          {drilled.length === 0 ? (
            <p className="confidence-note">Nothing recorded in this month.</p>
          ) : (
            <table className="evidence-table">
              <tbody>
                {drilled.slice(0, 12).map((r) => (
                  <tr key={r.key}>
                    <td>{r.label}</td>
                    <td>{formatMoney(r.amount)}{drillable === "profit" ? "" : ` (${r.detail})`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      <details className="layers">
        <summary>Table view</summary>
        <table className="evidence-table">
          <tbody>
            {data.map((d) => (
              <tr key={d.key}>
                <td>{d.label}</td>
                <td>{formatMoney(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

// ------------------------------------------------------------- CSV export ---

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const iso = (ts?: number) => (ts ? new Date(ts).toISOString().slice(0, 10) : "");

/** Forecast section (ZPL-041 §14) — run-rate projections with ranges and stated assumptions. */
function Forecast({ state }: { state: WorkspaceState }) {
  const f = forecast(state);
  if (!f.revenueProjection && f.cashNext30 === null && f.stockouts.length === 0) return null;
  return (
    <>
      <h2>Forecast</h2>
      <div className="card">
        {f.revenueProjection ? (
          <p className="claim" style={{ fontSize: 15 }}>
            At this month's pace, revenue is on track for about {formatMoney(f.revenueProjection.mid)} by month-end
            <span className="muted"> (range {formatMoney(f.revenueProjection.low)}–{formatMoney(f.revenueProjection.high)})</span>.
          </p>
        ) : (
          <p className="claim" style={{ fontSize: 15 }}>Not enough of the month has passed to project revenue honestly yet.</p>
        )}
        {f.cashNext30 !== null && (
          <p className="reasoning">
            Projected cash over the next 30 days: <strong>{formatMoney(f.cashNext30)}</strong>{" "}
            {f.cashNext30 < 0 ? "— outgoings may outrun collections; the overdue invoices and pending COD are the levers." : "if the current rhythm holds."}
          </p>
        )}
        {f.stockouts.length > 0 && (
          <table className="evidence-table">
            <tbody>
              {f.stockouts.map((s) => (
                <tr key={s.name}>
                  <td>{s.name} — projected stockout</td>
                  <td>{s.daysLeft <= 0 ? "out now" : `in ~${s.daysLeft} days`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="confidence-note">
          {f.assumptions.join(" ")} Forecasts are ranges, not promises — they move as new data arrives.
        </p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- The view ---

export function AnalyticsView({ state }: { state: WorkspaceState }) {
  const now = Date.now();
  const [rangeMonths, setRangeMonths] = useState(6);
  const months = lastMonths(rangeMonths, now);

  const revenue = bucket(months, [
    ...state.invoices.map((i) => ({ ts: i.issuedAt, amount: i.amount })),
    ...state.orders
      .filter((o) => o.deliveredAt)
      .map((o) => ({ ts: o.deliveredAt as number, amount: orderRevenue(o) })),
  ]);
  const profit = bucket(
    months,
    state.orders
      .filter((o) => o.deliveredAt)
      .map((o) => ({ ts: o.deliveredAt as number, amount: orderNetProfit(o) }))
  );
  const expenses = bucket(months, state.expenses.map((e) => ({ ts: e.date, amount: e.amount })));

  // Product gross profit (delivered orders, line-level: qty × (price − cost)).
  const perProduct = new Map<string, number>();
  for (const o of state.orders) {
    if (!o.deliveredAt || o.status === "returned") continue;
    for (const l of o.lines) {
      perProduct.set(l.productName, (perProduct.get(l.productName) ?? 0) + l.qty * (l.unitPrice - l.unitCost));
    }
  }
  const topProducts = [...perProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxProd = Math.max(1, ...topProducts.map(([, v]) => Math.abs(v)));

  const empty =
    state.invoices.length === 0 && state.orders.length === 0 && state.expenses.length === 0;

  return (
    <div>
      <h1>Analytics</h1>
      <p className="subtitle">
        The question this view answers: “What changed, where is the money made and
        lost, and what deserves a closer look?” All comparisons are against your own history.
      </p>

      {empty ? (
        <div className="quiet">Charts appear as your invoices, orders, and expenses accumulate.</div>
      ) : (
        <>
          <div className="form-row" style={{ marginBottom: 4 }}>
            <span className="confidence-note" style={{ marginTop: 0 }}>Range:</span>
            {[3, 6, 12].map((n) => (
              <button
                key={n}
                className={`btn ${rangeMonths === n ? "" : "subtle"}`}
                onClick={() => setRangeMonths(n)}
              >
                {n} months
              </button>
            ))}
          </div>

          <ChartCard
            title="Revenue by month"
            note="Invoices issued plus COD orders on their delivery date — the month the revenue was actually earned. Click a bar to see exactly what's behind it."
            data={revenue}
            drillable="revenue"
            state={state}
            months={months}
          />
          <ChartCard
            title="Net profit from COD orders by month"
            note="After product cost, shipping, COD fees, and packaging. Invoices are excluded — they don't carry cost data. Click a bar to drill down."
            data={profit}
            drillable="profit"
            state={state}
            months={months}
          />
          <ChartCard title="Expenses by month" data={expenses} />

          {topProducts.length > 0 && (
            <div className="card">
              <p className="claim" style={{ fontSize: 15 }}>Gross profit by product (delivered orders)</p>
              <table className="evidence-table">
                <tbody>
                  {topProducts.map(([name, v]) => (
                    <tr key={name}>
                      <td style={{ width: "40%" }}>{name}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              height: 10,
                              borderRadius: 4,
                              background: MARK,
                              width: `${Math.max(2, (Math.abs(v) / maxProd) * 60)}%`,
                            }}
                          />
                          <span>{formatMoney(v)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="confidence-note">
                Line-level gross profit only — order-level costs (shipping, fees) are in each order's breakdown.
              </p>
            </div>
          )}

          <Forecast state={state} />

          <h2>Reports (CSV export)</h2>
          <div className="form-row">
            <button
              className="btn ghost"
              onClick={() =>
                downloadCsv(
                  "zyvora-orders.csv",
                  ["order", "customer", "created", "status", "revenue", "cogs+costs", "net_profit", "cash"],
                  state.orders.map((o) => [
                    o.orderId,
                    o.customer,
                    iso(o.createdAt),
                    o.status,
                    orderRevenue(o).toFixed(2),
                    (orderRevenue(o) - orderNetProfit(o)).toFixed(2),
                    orderNetProfit(o).toFixed(2),
                    o.cashReceivedAt ? "collected" : o.deliveredAt ? "pending" : "",
                  ])
                )
              }
            >
              Orders
            </button>
            <button
              className="btn ghost"
              onClick={() =>
                downloadCsv(
                  "zyvora-invoices.csv",
                  ["customer", "amount", "issued", "due_days", "paid"],
                  state.invoices.map((i) => [i.customer, i.amount, iso(i.issuedAt), i.dueDays, iso(i.paidAt)])
                )
              }
            >
              Invoices
            </button>
            <button
              className="btn ghost"
              onClick={() =>
                downloadCsv(
                  "zyvora-expenses.csv",
                  ["label", "amount", "date"],
                  state.expenses.map((e) => [e.label, e.amount, iso(e.date)])
                )
              }
            >
              Expenses
            </button>
          </div>
          <p className="confidence-note">
            Exports contain your full records in an open format — the same promise as the
            Business Memory export. ({state.orders.length} orders · {state.invoices.length} invoices ·{" "}
            {state.expenses.length} expenses · last {Math.round((now - Math.min(...state.invoices.map((i) => i.issuedAt), now)) / DAY)} days)
          </p>
        </>
      )}
    </div>
  );
}
