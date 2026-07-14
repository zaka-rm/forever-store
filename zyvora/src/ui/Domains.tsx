/**
 * Domain views — the Information Layer surfaces (CODEX 00 D.2, D.7 level 4).
 * Records are available on purpose, never ambient. Facts are appended through
 * Business Memory only; every table below is a projection (D.9).
 * Navigation mirrors the Builder's mental model, not the database (E.4).
 * Currency-neutral: amounts format in the Workspace's own currency (ZPL-040).
 */
import { Fragment, useState } from "react";
import { ENVELOPES, cashCenter, formatMoney } from "../core/engine";
import { getActiveCurrency } from "../core/format";
import type { MemoryStore } from "../core/memory";
import { DAY, projectCustomerProfiles, type CustomerTag } from "../core/projections";
import type { WorkspaceState } from "../core/types";
import { FinanceTools } from "./FinanceTools";

const dateLabel = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// ------------------------------------------------------------------ Finance

export function FinanceView({ state, memory }: { state: WorkspaceState; memory: MemoryStore }) {
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDays, setDueDays] = useState("14");
  const [expLabel, setExpLabel] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const now = Date.now();
  const ccy = getActiveCurrency();

  const addInvoice = () => {
    const value = parseFloat(amount);
    if (!customer.trim() || !isFinite(value) || value <= 0) return;
    memory.append("fact", "invoice_issued", {
      invoiceId: crypto.randomUUID(),
      customer: customer.trim(),
      amount: value,
      issuedAt: Date.now(),
      dueDays: parseInt(dueDays, 10) || 14,
    });
    setCustomer("");
    setAmount("");
  };

  const addExpense = () => {
    const value = parseFloat(expAmount);
    if (!expLabel.trim() || !isFinite(value) || value <= 0) return;
    memory.append("fact", "expense_recorded", {
      expenseId: crypto.randomUUID(),
      label: expLabel.trim(),
      amount: value,
      date: Date.now(),
    });
    setExpLabel("");
    setExpAmount("");
  };

  return (
    <div>
      <h1>Finance</h1>
      <p className="subtitle">
        The question this Domain answers: “Where does my money actually stand, and what should I collect or cut?”
      </p>

      <CashCenter state={state} />

      <h2>New invoice</h2>
      <div className="form-row">
        <div>
          <label>Customer</label>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" />
        </div>
        <div>
          <label>Amount ({ccy})</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" style={{ width: 110 }} />
        </div>
        <div>
          <label>Due (days)</label>
          <input value={dueDays} onChange={(e) => setDueDays(e.target.value)} inputMode="numeric" style={{ width: 80 }} />
        </div>
        <button className="btn" onClick={addInvoice}>Add invoice</button>
      </div>

      <h2>Invoices</h2>
      {state.invoices.length === 0 ? (
        <div className="quiet">No invoices yet.</div>
      ) : (
        <table className="records">
          <thead>
            <tr><th>Customer</th><th>Amount</th><th>Issued</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {state.invoices.map((inv) => {
              const overdue = !inv.paidAt && now > inv.issuedAt + inv.dueDays * DAY;
              return (
                <tr key={inv.invoiceId}>
                  <td>{inv.customer}</td>
                  <td>{formatMoney(inv.amount)}</td>
                  <td className="muted">{dateLabel(inv.issuedAt)}</td>
                  <td>
                    {inv.paidAt
                      ? <span className="muted">Paid {dateLabel(inv.paidAt)}</span>
                      : overdue
                        ? <strong>Overdue {Math.round((now - (inv.issuedAt + inv.dueDays * DAY)) / DAY)}d</strong>
                        : "Open"}
                  </td>
                  <td>
                    {!inv.paidAt && (
                      <button
                        className="link-btn"
                        onClick={() =>
                          memory.append("fact", "invoice_paid", { invoiceId: inv.invoiceId, paidAt: Date.now() })
                        }
                      >
                        Mark paid
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2>New expense</h2>
      <div className="form-row">
        <div>
          <label>Label</label>
          <input value={expLabel} onChange={(e) => setExpLabel(e.target.value)} placeholder="Rent, supplier, wages…" />
        </div>
        <div>
          <label>Amount ({ccy})</label>
          <input value={expAmount} onChange={(e) => setExpAmount(e.target.value)} inputMode="decimal" placeholder="0.00" style={{ width: 110 }} />
        </div>
        <button className="btn" onClick={addExpense}>Add expense</button>
      </div>

      <h2>Expenses</h2>
      {state.expenses.length === 0 ? (
        <div className="quiet">No expenses yet.</div>
      ) : (
        <table className="records">
          <thead><tr><th>Label</th><th>Amount</th><th>Date</th></tr></thead>
          <tbody>
            {state.expenses.slice(0, 20).map((e) => (
              <tr key={e.expenseId}>
                <td>{e.label}</td>
                <td>{formatMoney(e.amount)}</td>
                <td className="muted">{dateLabel(e.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <FinanceTools state={state} memory={memory} />
    </div>
  );
}

/** Cash Center — collected vs. pending COD, and the 3-envelope allocation (ZPL-041 §3, §8). */
function CashCenter({ state }: { state: WorkspaceState }) {
  const c = cashCenter(state);
  const hasAnything = state.invoices.length > 0 || state.orders.length > 0 || state.expenses.length > 0;
  if (!hasAnything) return null;
  return (
    <>
      <h2>Cash center</h2>
      <div className="stats" style={{ marginBottom: 14 }}>
        <div className="stat">
          <div className="k">Cash available</div>
          <div className="v">{formatMoney(c.cashAvailable)}</div>
        </div>
        <div className="stat">
          <div className="k">Pending with couriers (COD)</div>
          <div className="v">{formatMoney(c.cashPendingCod)}</div>
        </div>
        <div className="stat">
          <div className="k">Collected, last 30 days</div>
          <div className="v">{formatMoney(c.collected30)}</div>
        </div>
        <div className="stat">
          <div className="k">Expenses, last 30 days</div>
          <div className="v">{formatMoney(c.expenses30)}</div>
        </div>
      </div>
      {c.collected30 > 0 && (
        <div className="card">
          <p className="claim" style={{ fontSize: 15 }}>
            Three-envelope allocation of the last 30 days' collections
          </p>
          <table className="evidence-table">
            <tbody>
              <tr>
                <td>Stock envelope ({Math.round(ENVELOPES.stock * 100)}%) — reserved for restocking</td>
                <td>{formatMoney(c.envelopes.stock)}</td>
              </tr>
              <tr>
                <td>Expense envelope ({Math.round(ENVELOPES.expenses * 100)}%) — operations</td>
                <td>
                  {formatMoney(c.envelopes.expenses)}
                  {c.expenseOverspend > 0 && (
                    <strong> — exceeded by {formatMoney(c.expenseOverspend)}</strong>
                  )}
                </td>
              </tr>
              <tr>
                <td>Profit envelope ({Math.round(ENVELOPES.profit * 100)}%) — your real profit</td>
                <td>{formatMoney(c.envelopes.profit)}</td>
              </tr>
            </tbody>
          </table>
          <p className="confidence-note">
            {c.expenseOverspend > 0
              ? "Expenses above the envelope are silently consuming your stock and profit envelopes — the Today view has the detail."
              : "Spending is within the expense envelope this month."}
          </p>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Customers

const TAG_STYLE: Record<CustomerTag, { label: string; cls: string }> = {
  new: { label: "New", cls: "domain" },
  returning: { label: "Returning", cls: "domain" },
  vip: { label: "VIP", cls: "" },
  "at-risk": { label: "At risk", cls: "strategic" },
  "high-refusal": { label: "High refusal", cls: "strategic" },
};

export function CustomersView({ state }: { state: WorkspaceState }) {
  const now = Date.now();
  const customers = projectCustomerProfiles(state, now);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div>
      <h1>Customers</h1>
      <p className="subtitle">
        The question this Domain answers: “Who matters most, and who needs attention?”
        Each profile unifies every invoice and order — one source of truth, nothing to double-enter.
      </p>
      {customers.length === 0 ? (
        <div className="quiet">Customers will appear as you issue invoices or create orders.</div>
      ) : (
        <table className="records">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Lifetime revenue</th>
              <th>Lifetime profit</th>
              <th>Tags</th>
              <th>Last seen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <Fragment key={c.name}>
                <tr>
                  <td>{c.name}</td>
                  <td>{formatMoney(c.lifetimeRevenue)}</td>
                  <td>{c.hasProfitData ? formatMoney(c.lifetimeProfit) : <span className="muted">—</span>}</td>
                  <td>
                    {c.tags.map((t) => (
                      <span key={t} className={`badge ${TAG_STYLE[t].cls}`}>{TAG_STYLE[t].label}</span>
                    ))}
                  </td>
                  <td className="muted">
                    {c.lastActivityAt ? `${Math.round((now - c.lastActivityAt) / DAY)} days ago` : "—"}
                  </td>
                  <td>
                    <button className="link-btn" onClick={() => setOpen(open === c.name ? null : c.name)}>
                      {open === c.name ? "Hide" : "Profile"}
                    </button>
                  </td>
                </tr>
                {open === c.name && (
                  <tr>
                    <td colSpan={6}>
                      <table className="evidence-table">
                        <tbody>
                          <tr><td>Interactions (invoices + orders)</td><td>{c.interactions}</td></tr>
                          <tr><td>Average order value</td><td>{formatMoney(c.avgOrderValue)}</td></tr>
                          <tr>
                            <td>Usual rhythm</td>
                            <td>{c.medianGapDays ? `every ~${Math.round(c.medianGapDays)} days` : "—"}</td>
                          </tr>
                          <tr>
                            <td>COD reliability (delivered vs. refused)</td>
                            <td>
                              {c.codReliability === null
                                ? "no COD orders yet"
                                : `${Math.round(c.codReliability * 100)}% — ${c.ordersDelivered} delivered, ${c.ordersRefused} refused`}
                            </td>
                          </tr>
                          {c.hasProfitData && (
                            <tr>
                              <td>Profit margin on delivered orders</td>
                              <td>
                                {c.lifetimeRevenue > 0
                                  ? `${Math.round((c.lifetimeProfit / c.lifetimeRevenue) * 100)}%`
                                  : "—"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      <p className="confidence-note">
                        Lifetime profit counts only delivered orders (which carry cost data); paid invoices
                        contribute to revenue but not to the profit figure.
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Inventory

export function InventoryView({ state, memory }: { state: WorkspaceState; memory: MemoryStore }) {
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [weekly, setWeekly] = useState("");
  const [lead, setLead] = useState("14");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const ccy = getActiveCurrency();

  const addProduct = () => {
    const s = parseInt(stock, 10);
    const w = parseFloat(weekly);
    const c = parseFloat(cost);
    const p = parseFloat(price);
    if (!name.trim() || !isFinite(s) || s < 0) return;
    memory.append("fact", "product_added", {
      productId: crypto.randomUUID(),
      name: name.trim(),
      stock: s,
      weeklySales: isFinite(w) && w >= 0 ? w : 0,
      leadTimeDays: parseInt(lead, 10) || 14,
      unitCost: isFinite(c) && c >= 0 ? c : 0,
      price: isFinite(p) && p >= 0 ? p : 0,
    });
    setName(""); setStock(""); setWeekly(""); setCost(""); setPrice("");
  };

  return (
    <div>
      <h1>Inventory</h1>
      <p className="subtitle">
        The question this Domain answers: “What should I reorder, when, and what is quietly not selling?”
      </p>

      <h2>New product</h2>
      <div className="form-row">
        <div><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" /></div>
        <div><label>Stock</label><input value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" style={{ width: 76 }} /></div>
        <div><label>Sales / week</label><input value={weekly} onChange={(e) => setWeekly(e.target.value)} inputMode="decimal" style={{ width: 90 }} /></div>
        <div><label>Lead time (d)</label><input value={lead} onChange={(e) => setLead(e.target.value)} inputMode="numeric" style={{ width: 90 }} /></div>
        <div><label>Unit cost ({ccy})</label><input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" style={{ width: 96 }} /></div>
        <div><label>Price ({ccy})</label><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" style={{ width: 88 }} /></div>
        <button className="btn" onClick={addProduct}>Add product</button>
      </div>

      <h2>Products</h2>
      {state.products.length === 0 ? (
        <div className="quiet">No products yet.</div>
      ) : (
        <table className="records">
          <thead>
            <tr><th>Product</th><th>Stock</th><th>Sales / week</th><th>Days of stock</th><th></th></tr>
          </thead>
          <tbody>
            {state.products.map((p) => {
              const daysLeft = p.weeklySales > 0 ? Math.round(p.stock / (p.weeklySales / 7)) : null;
              return (
                <tr key={p.productId}>
                  <td>{p.name}</td>
                  <td>{p.stock}</td>
                  <td className="muted">{p.weeklySales}</td>
                  <td className="muted">{daysLeft === null ? "not selling" : `~${daysLeft} days`}</td>
                  <td>
                    <button
                      className="link-btn"
                      onClick={() => {
                        const raw = prompt(`Adjust stock for "${p.name}" (e.g. +50 received, -3 damaged):`, "+0");
                        if (raw === null) return;
                        const delta = parseInt(raw, 10);
                        if (!isFinite(delta) || delta === 0) return;
                        memory.append("fact", "stock_adjusted", {
                          productId: p.productId,
                          delta,
                          reason: "manual adjustment",
                        });
                      }}
                    >
                      Adjust stock
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

