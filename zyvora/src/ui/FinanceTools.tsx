/**
 * Finance depth (Wave 3) — goals, break-even, profit simulator.
 * Rendered inside the Finance Domain. Goals are events (editable = append a new
 * target, latest wins); break-even and the simulator are pure calculators over
 * existing projections. Each answers a decision: "am I on track / can I afford X?"
 * Canonical (governance/): CAP-000005 Finance — FEAT-000038 budgets & variance,
 * FEAT-000039 cash-flow forecasting.
 */
import { useMemo, useState } from "react";
import { formatMoney } from "../core/engine";
import { getActiveCurrency } from "../core/format";
import type { MemoryStore } from "../core/memory";
import {
  breakEven,
  closedPeriods,
  goalActual,
  monthBounds,
  profitAndLoss,
  simulateProfit,
  type ProfitAndLoss,
} from "../core/projections";
import type { GoalMetric, WorkspaceState } from "../core/types";

const GOALS: { metric: GoalMetric; label: string; money: boolean }[] = [
  { metric: "revenue", label: "Revenue this month", money: true },
  { metric: "profit", label: "Profit this month (COD orders)", money: true },
  { metric: "orders", label: "Delivered orders this month", money: false },
];

export function FinanceTools({ state, memory }: { state: WorkspaceState; memory: MemoryStore }) {
  return (
    <>
      <ProfitLossStatement state={state} memory={memory} />
      <Goals state={state} memory={memory} />
      <BreakEven state={state} />
      <Simulator />
    </>
  );
}

/** Profit & Loss statement with period selection + permanent period close (FEAT-000040). */
function ProfitLossStatement({ state, memory }: { state: WorkspaceState; memory: MemoryStore }) {
  const now = Date.now();
  // Offer the current month + the previous 5 months.
  const months = useMemo(() => {
    const out: { key: string; year: number; month: number; label: string }[] = [];
    const d = new Date(now);
    for (let i = 0; i < 6; i++) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const b = monthBounds(m.getFullYear(), m.getMonth());
      out.push({ key: `${m.getFullYear()}-${m.getMonth()}`, year: m.getFullYear(), month: m.getMonth(), label: b.label });
    }
    return out;
  }, [now]);
  const [selected, setSelected] = useState(months[0].key);
  const closed = useMemo(() => closedPeriods(memory.all()), [memory.all().length]);

  const sel = months.find((m) => m.key === selected)!;
  const bounds = monthBounds(sel.year, sel.month);
  const isCurrentMonth = selected === months[0].key;
  const lockedPnl = closed.get(selected);
  const pnl: ProfitAndLoss = lockedPnl ?? profitAndLoss(state, bounds.start, bounds.end, bounds.label);

  const closePeriod = () => {
    if (isCurrentMonth) return;
    if (!confirm(`Close ${bounds.label}? This permanently locks its Profit & Loss — the figures won't change afterward, even if past records are corrected. This is your book close.`)) return;
    memory.append("decision", "period_closed", { period: selected, pnl, closedAt: Date.now() });
  };

  const row = (l: { label: string; amount: number }, strong = false) => (
    <tr key={l.label} className={strong ? "grand" : ""}>
      <td style={strong ? { fontWeight: 700 } : undefined}>{l.label}</td>
      <td style={{ textAlign: "right", fontWeight: strong ? 700 : 400 }}>{formatMoney(l.amount)}</td>
    </tr>
  );

  return (
    <>
      <h2>Profit &amp; Loss</h2>
      <div className="form-row">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {months.map((m) => (
            <option key={m.key} value={m.key}>{m.label}{closed.has(m.key) ? " (closed)" : ""}</option>
          ))}
        </select>
        {!isCurrentMonth && !lockedPnl && (
          <button className="btn subtle" onClick={closePeriod}>Close this period</button>
        )}
        {lockedPnl && <span className="confidence-note" style={{ alignSelf: "center" }}>Closed — figures are locked.</span>}
      </div>
      <div className="card">
        <table className="records" style={{ border: "none" }}>
          <tbody>
            <tr><td colSpan={2} style={{ fontWeight: 600, color: "var(--ink-soft)" }}>Revenue</td></tr>
            {pnl.revenue.lines.map((l) => row(l))}
            {row({ label: "Net revenue", amount: pnl.revenue.netRevenue }, true)}
            <tr><td colSpan={2} style={{ height: 8 }}></td></tr>
            {row({ label: "Cost of goods sold", amount: -pnl.cogs })}
            {row({ label: `Gross profit (${pnl.grossMarginPct.toFixed(0)}% margin)`, amount: pnl.grossProfit }, true)}
            <tr><td colSpan={2} style={{ height: 8 }}></td></tr>
            <tr><td colSpan={2} style={{ fontWeight: 600, color: "var(--ink-soft)" }}>Operating expenses</td></tr>
            {pnl.operatingExpenses.lines.map((l) => row({ label: l.label, amount: -l.amount }))}
            {row({ label: "Total operating expenses", amount: -pnl.operatingExpenses.total }, true)}
            <tr><td colSpan={2} style={{ height: 8 }}></td></tr>
            {row({ label: `Net profit (${pnl.netMarginPct.toFixed(0)}% margin)`, amount: pnl.netProfit }, true)}
          </tbody>
        </table>
        <p className="confidence-note">
          {pnl.ordersDelivered} orders delivered in {pnl.periodLabel}. Revenue is recognized on
          delivery; COD orders carry their real Forever cost. {lockedPnl ? "This period is closed and locked." : isCurrentMonth ? "The current month is still open and updates live." : "Close the period to lock these figures permanently."}
        </p>
      </div>
    </>
  );
}

function Goals({ state, memory }: { state: WorkspaceState; memory: MemoryStore }) {
  const [editing, setEditing] = useState<GoalMetric | null>(null);
  const [value, setValue] = useState("");

  const save = (metric: GoalMetric) => {
    const t = parseFloat(value);
    if (!isFinite(t) || t <= 0) return;
    memory.append("fact", "goal_set", { metric, target: t, setAt: Date.now() });
    setEditing(null);
    setValue("");
  };

  return (
    <>
      <h2>Monthly goals</h2>
      {GOALS.map(({ metric, label, money }) => {
        const target = state.goals[metric];
        const actual = goalActual(state, metric);
        const pct = target ? Math.min(100, Math.round((actual / target) * 100)) : 0;
        const fmt = (n: number) => (money ? formatMoney(n) : String(Math.round(n)));
        return (
          <div className="card" key={metric}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <p className="claim" style={{ fontSize: 15, margin: 0 }}>{label}</p>
              {editing !== metric && (
                <button className="link-btn" onClick={() => { setEditing(metric); setValue(target ? String(target) : ""); }}>
                  {target ? "Edit goal" : "Set goal"}
                </button>
              )}
            </div>
            {editing === metric ? (
              <div className="form-row" style={{ marginTop: 10 }}>
                <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="Target" autoFocus style={{ width: 120 }} />
                <button className="btn" onClick={() => save(metric)}>Save</button>
                <button className="btn subtle" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            ) : target ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 12, borderRadius: 6, background: "var(--line)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#0f8a5f" : "var(--accent)", transition: "width .3s" }} />
                </div>
                <p className="confidence-note" style={{ marginTop: 6 }}>
                  {fmt(actual)} of {fmt(target)} — <strong>{pct}%</strong>
                  {pct >= 100 ? " · goal reached" : ` · ${fmt(target - actual)} to go`}
                </p>
              </div>
            ) : (
              <p className="confidence-note" style={{ marginTop: 6 }}>No goal set — set one to track progress against it.</p>
            )}
          </div>
        );
      })}
    </>
  );
}

function BreakEven({ state }: { state: WorkspaceState }) {
  const b = breakEven(state);
  if (b.avgProfitPerOrder === 0 && b.monthlyFixedExpenses === 0) return null;
  return (
    <>
      <h2>Break-even</h2>
      <div className="card">
        {b.breakEvenOrders === null ? (
          <>
            <p className="claim" style={{ fontSize: 15 }}>Break-even is unreachable at your current per-order profit.</p>
            <p className="reasoning">
              Your delivered orders currently net {formatMoney(b.avgProfitPerOrder)} each on average — at or below zero,
              so more orders won't cover fixed expenses. Fix per-order profitability first (the Orders and Promos views
              show which orders and offers lose money).
            </p>
          </>
        ) : (
          <>
            <p className="claim" style={{ fontSize: 15 }}>
              You need about <strong>{b.breakEvenOrders} delivered orders</strong> a month ({formatMoney(b.breakEvenRevenue ?? 0)}) to cover fixed expenses.
            </p>
            <p className="reasoning">
              Monthly fixed expenses of {formatMoney(b.monthlyFixedExpenses)} (your 90-day average) divided by the
              average net profit per delivered order ({formatMoney(b.avgProfitPerOrder)}). This month you're at{" "}
              {b.ordersThisMonth} delivered {b.ordersThisMonth === 1 ? "order" : "orders"} so far.
            </p>
          </>
        )}
        <table className="evidence-table">
          <tbody>
            <tr><td>Monthly fixed expenses (90-day avg)</td><td>{formatMoney(b.monthlyFixedExpenses)}</td></tr>
            <tr><td>Average net profit per delivered order</td><td>{formatMoney(b.avgProfitPerOrder)}</td></tr>
            <tr><td>Average order value</td><td>{formatMoney(b.avgOrderValue)}</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function Simulator() {
  const ccy = getActiveCurrency();
  const [f, setF] = useState({
    sellingPrice: "100",
    buyingCost: "40",
    quantity: "1",
    discount: "0",
    shippingCost: "10",
    packagingCost: "2",
    advertisingCost: "0",
  });
  const n = (s: string) => { const v = parseFloat(s); return isFinite(v) ? v : 0; };
  const r = simulateProfit({
    sellingPrice: n(f.sellingPrice),
    buyingCost: n(f.buyingCost),
    quantity: n(f.quantity),
    discount: n(f.discount),
    shippingCost: n(f.shippingCost),
    packagingCost: n(f.packagingCost),
    advertisingCost: n(f.advertisingCost),
  });
  const field = (k: keyof typeof f, label: string) => (
    <div>
      <label>{label} ({ccy})</label>
      <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} inputMode="decimal" style={{ width: 90 }} />
    </div>
  );

  return (
    <>
      <h2>Profit simulator</h2>
      <p className="confidence-note" style={{ marginTop: 0 }}>
        A calculator — nothing is saved. Change any value to see the effect on real profit before you commit.
      </p>
      <div className="form-row">
        {field("sellingPrice", "Selling price")}
        {field("buyingCost", "Buying cost")}
        <div>
          <label>Quantity</label>
          <input value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} inputMode="numeric" style={{ width: 70 }} />
        </div>
        {field("discount", "Discount / unit")}
        {field("shippingCost", "Shipping cost")}
        {field("packagingCost", "Packaging")}
        {field("advertisingCost", "Advertising")}
      </div>
      <div className="card">
        <table className="evidence-table">
          <tbody>
            <tr><td>Revenue</td><td>{formatMoney(r.revenue)}</td></tr>
            <tr><td>Product cost (COGS)</td><td>−{formatMoney(r.cogs)}</td></tr>
            <tr><td>Gross profit</td><td>{formatMoney(r.grossProfit)}</td></tr>
            <tr><td><strong>Net profit</strong></td><td><strong>{formatMoney(r.netProfit)}</strong>{r.netProfit < 0 && " — loses money"}</td></tr>
            <tr><td>Net margin</td><td>{r.marginPct.toFixed(1)}%</td></tr>
            <tr><td>ROI</td><td>{r.roiPct.toFixed(1)}%</td></tr>
            <tr><td>Units to cover order costs (break-even)</td><td>{r.breakEvenUnits === null ? "never — unit loses money" : r.breakEvenUnits}</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
