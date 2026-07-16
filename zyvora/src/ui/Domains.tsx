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
import {
  DAY,
  projectActivities,
  projectContacts,
  projectCustomerProfiles,
  type Activity,
  type Contact,
  type CustomerTag,
} from "../core/projections";
import { messagingConfigured, sendMessage } from "../core/messaging";
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

export function CustomersView({ state, memory }: { state: WorkspaceState; memory: MemoryStore }) {
  const now = Date.now();
  const customers = projectCustomerProfiles(state, now);
  const contacts = projectContacts(memory.all());
  const activities = projectActivities(memory.all());
  const openFollowups = activities.filter((a) => !a.done && a.dueAt).length;
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div>
      <h1>Customers</h1>
      <p className="subtitle">
        The question this Domain answers: “Who matters most, and who needs attention?”
        Each profile unifies every invoice and order — one source of truth, nothing to double-enter.
        {openFollowups > 0 && ` ${openFollowups} follow-up${openFollowups > 1 ? "s" : ""} scheduled.`}
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
                      <CustomerCrm
                        customer={c.name}
                        contact={contacts.get(c.name) ?? {}}
                        activities={activities.filter((a) => a.customer === c.name)}
                        memory={memory}
                      />
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

/** Contact record + follow-up activities for one customer (CAP-000007). */
function CustomerCrm({
  customer, contact, activities, memory,
}: { customer: string; contact: Contact; activities: Activity[]; memory: MemoryStore }) {
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [city, setCity] = useState(contact.city ?? "");
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [actNote, setActNote] = useState("");
  const [dueDays, setDueDays] = useState("");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const send = async (channel: "whatsapp" | "sms") => {
    if (!phone.trim() || !msg.trim()) return;
    setSending(true); setSendResult(null);
    const r = await sendMessage(phone.trim(), msg.trim(), channel);
    setSending(false);
    if (r.ok) { setSendResult(`Sent via ${channel === "whatsapp" ? "WhatsApp" : "SMS"}.`); setMsg(""); memory.append("fact", "customer_activity_logged", { activityId: crypto.randomUUID(), customer, kind: "message", note: `${channel === "whatsapp" ? "WhatsApp" : "SMS"}: ${msg.trim()}`, at: Date.now() }); }
    else setSendResult(`Couldn't send: ${r.error}`);
  };

  const saveContact = () => {
    memory.append("fact", "customer_contact_updated", { customer, phone: phone.trim(), city: city.trim(), notes: notes.trim(), at: Date.now() });
  };
  const logActivity = () => {
    if (!actNote.trim()) return;
    const days = parseInt(dueDays, 10);
    memory.append("fact", "customer_activity_logged", {
      activityId: crypto.randomUUID(), customer, kind: days > 0 ? "followup" : "note", note: actNote.trim(),
      ...(days > 0 ? { dueAt: Date.now() + days * DAY } : {}), at: Date.now(),
    });
    setActNote(""); setDueDays("");
  };
  const complete = (id: string) => memory.append("fact", "customer_activity_completed", { activityId: id, at: Date.now() });

  return (
    <div style={{ marginTop: 12 }}>
      <div className="form-row">
        <div><label>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" style={{ width: 140 }} /></div>
        <div><label>City</label><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" style={{ width: 120 }} /></div>
        <div style={{ flex: 1 }}><label>Notes</label><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering" style={{ width: "100%" }} /></div>
        <button className="btn subtle" onClick={saveContact}>Save contact</button>
      </div>

      <div className="form-row">
        <div style={{ flex: 1 }}><label>Log a call/note or schedule a follow-up</label>
          <input value={actNote} onChange={(e) => setActNote(e.target.value)} placeholder="e.g. Called about reorder — will decide next week" style={{ width: "100%" }} /></div>
        <div><label>Follow up in (days)</label><input value={dueDays} onChange={(e) => setDueDays(e.target.value)} inputMode="numeric" placeholder="none" style={{ width: 90 }} /></div>
        <button className="btn ghost" onClick={logActivity} disabled={!actNote.trim()}>Log</button>
      </div>

      {messagingConfigured && (
        <div className="form-row">
          <div style={{ flex: 1 }}>
            <label>Message this customer{!phone.trim() && " (add a phone above first)"}</label>
            <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type a WhatsApp or SMS message…" style={{ width: "100%" }} disabled={!phone.trim()} />
          </div>
          <button className="btn" onClick={() => void send("whatsapp")} disabled={sending || !phone.trim() || !msg.trim()}>{sending ? "Sending…" : "WhatsApp"}</button>
          <button className="btn subtle" onClick={() => void send("sms")} disabled={sending || !phone.trim() || !msg.trim()}>SMS</button>
        </div>
      )}
      {sendResult && <p className="confidence-note" style={{ marginTop: 0 }}>{sendResult}</p>}

      {activities.length > 0 && (
        <ul className="timeline" style={{ marginTop: 8 }}>
          {activities.slice(0, 8).map((a) => (
            <li key={a.activityId}>
              <div className="when">
                {a.dueAt && !a.done ? `Due ${dateLabel(a.dueAt)}` : dateLabel(a.at)}
                {a.done && " · done"}
              </div>
              <div className="what">
                {!a.done && <span className="stream-tag">{a.kind}</span>}
                {a.note}
                {!a.done && (
                  <button className="link-btn" style={{ marginLeft: 10 }} onClick={() => complete(a.activityId)}>Mark done</button>
                )}
              </div>
            </li>
          ))}
        </ul>
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
            <tr><th>Product</th><th>Stock</th><th>Incoming</th><th>Sales / week</th><th>Days of stock</th><th></th></tr>
          </thead>
          <tbody>
            {state.products.map((p) => {
              const daysLeft = p.weeklySales > 0 ? Math.round(p.stock / (p.weeklySales / 7)) : null;
              const inc = state.incoming[p.productId] ?? 0;
              return (
                <tr key={p.productId}>
                  <td>{p.name}</td>
                  <td>{p.stock}</td>
                  <td className="muted">{inc > 0 ? `+${inc}` : "—"}</td>
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

      <PurchaseOrders state={state} memory={memory} />
    </div>
  );
}

/** Purchase orders & goods receipts (CAP-000006 FEAT-000045) — reorder from a supplier, receive to raise stock. */
function PurchaseOrders({ state, memory }: { state: WorkspaceState; memory: MemoryStore }) {
  const ccy = getActiveCurrency();
  const [supplier, setSupplier] = useState("Forever Living");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");

  const selected = state.products.find((p) => p.productId === productId);
  // Default the unit cost to the product's known cost when a product is picked.
  const effectiveCost = unitCost !== "" ? unitCost : selected ? String(selected.unitCost) : "";

  const createPo = () => {
    const q = parseInt(qty, 10);
    const c = parseFloat(effectiveCost);
    if (!selected || !isFinite(q) || q <= 0) return;
    memory.append("fact", "purchase_order_created", {
      poId: crypto.randomUUID(),
      supplier: supplier.trim() || "Supplier",
      lines: [{ productId: selected.productId, productName: selected.name, qty: q, unitCost: isFinite(c) && c >= 0 ? c : selected.unitCost }],
      createdAt: Date.now(),
    });
    setProductId(""); setQty(""); setUnitCost("");
  };

  const receive = (poId: string) => {
    memory.append("fact", "goods_received", { poId, at: Date.now() });
  };

  const poValue = (lines: { qty: number; unitCost: number }[]) => lines.reduce((s, l) => s + l.qty * l.unitCost, 0);

  return (
    <>
      <h2>Purchase orders</h2>
      <p className="confidence-note" style={{ marginTop: 0 }}>
        Reorder from your supplier. Creating a PO shows the units as “incoming”; receiving it raises stock
        at the cost you actually paid — feeding real margins and the reorder alerts.
      </p>
      <div className="form-row">
        <div><label>Supplier</label><input value={supplier} onChange={(e) => setSupplier(e.target.value)} style={{ width: 140 }} /></div>
        <div>
          <label>Product</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select…</option>
            {state.products.map((p) => (
              <option key={p.productId} value={p.productId}>{p.name}</option>
            ))}
          </select>
        </div>
        <div><label>Qty</label><input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" style={{ width: 70 }} /></div>
        <div><label>Unit cost ({ccy})</label><input value={effectiveCost} onChange={(e) => setUnitCost(e.target.value)} inputMode="decimal" style={{ width: 96 }} /></div>
        <button className="btn" onClick={createPo} disabled={!selected || !(parseInt(qty, 10) > 0)}>Create PO</button>
      </div>

      {state.purchaseOrders.length === 0 ? (
        <div className="quiet">No purchase orders yet.</div>
      ) : (
        <table className="records">
          <thead>
            <tr><th>Supplier</th><th>Items</th><th>Cost</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {state.purchaseOrders.map((po) => (
              <tr key={po.poId}>
                <td>{po.supplier}</td>
                <td className="muted">{po.lines.map((l) => `${l.qty}× ${l.productName}`).join(", ")}</td>
                <td>{formatMoney(poValue(po.lines))}</td>
                <td>{po.receivedAt ? <span className="muted">Received {dateLabel(po.receivedAt)}</span> : "Open"}</td>
                <td>{!po.receivedAt && <button className="link-btn" onClick={() => receive(po.poId)}>Receive</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

