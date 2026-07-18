/**
 * Domain views — the Information Layer surfaces (CODEX 00 D.2, D.7 level 4).
 * Records are available on purpose, never ambient. Facts are appended through
 * Business Memory only; every table below is a projection (D.9).
 * Navigation mirrors the Builder's mental model, not the database (E.4).
 * Currency-neutral: amounts format in the Workspace's own currency (ZPL-040).
 */
import { Fragment, useEffect, useState } from "react";
import { consumeDeepLink } from "../core/deepLink";
import { ENVELOPES, cashCenter, formatMoney } from "../core/engine";
import { getActiveCurrency } from "../core/format";
import type { MemoryStore } from "../core/memory";
import {
  DAY,
  cashCalendar,
  projectActivities,
  projectContacts,
  projectCustomerProfiles,
  type Activity,
  type Contact,
  type CustomerTag,
} from "../core/projections";
import { messagingConfigured, sendMessage } from "../core/messaging";
import { SEGMENT_LABEL, SEGMENT_TONE, computeRfm, refillDueList, reorderDueList } from "../core/retention";
import { storyForCustomer } from "../core/story";
import { toast } from "./toast";
import { appPrompt } from "./dialog";
import type { Product, WorkspaceState } from "../core/types";
import { FinanceTools } from "./FinanceTools";
import { PageHeader } from "./PageHeader";

const dateLabel = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// ------------------------------------------------------------------ Finance

export function FinanceView({ state, memory }: { state: WorkspaceState; memory: MemoryStore }) {
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDays, setDueDays] = useState("14");
  const [expLabel, setExpLabel] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [creating, setCreating] = useState<"invoice" | "expense" | null>(null);
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
    setCreating(null);
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
    setCreating(null);
  };

  return (
    <div>
      <PageHeader
        title="Finance"
        description="See where the money stands, what is overdue, and which costs deserve attention."
        actions={
          <>
            <button className="btn subtle" onClick={() => setCreating((v) => v === "expense" ? null : "expense")}>Record expense</button>
            <button className="btn" onClick={() => setCreating((v) => v === "invoice" ? null : "invoice")}>Create invoice</button>
          </>
        }
      />

      <CashCenter state={state} />
      <CashCalendarPanel state={state} memory={memory} />

      {creating === "invoice" && (
      <section className="card form-card" aria-labelledby="new-invoice-title">
      <div className="section-heading"><div><h2 id="new-invoice-title">Create invoice</h2><p>Record what the customer owes and when it is due.</p></div></div>
      <div className="form-row">
        <div>
          <label htmlFor="invoice-customer">Customer</label>
          <input id="invoice-customer" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="invoice-amount">Amount ({ccy})</label>
          <input id="invoice-amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" style={{ width: 120 }} />
        </div>
        <div>
          <label htmlFor="invoice-due">Due (days)</label>
          <input id="invoice-due" value={dueDays} onChange={(e) => setDueDays(e.target.value)} inputMode="numeric" style={{ width: 90 }} />
        </div>
        <button className="btn" onClick={addInvoice}>Add invoice</button>
      </div>
      </section>
      )}

      <h2>Invoices</h2>
      {state.invoices.length === 0 ? (
        <div className="quiet">No invoices yet.</div>
      ) : (
        <div className="table-scroll" role="region" aria-label="Invoices table" tabIndex={0}>
        <table className="records">
          <thead>
            <tr><th>Customer</th><th>Amount</th><th>Issued</th><th>Status</th><th>Actions</th></tr>
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
                      ? <span className="tone success">Paid {dateLabel(inv.paidAt)}</span>
                      : overdue
                        ? <span className="tone attention">Overdue {Math.round((now - (inv.issuedAt + inv.dueDays * DAY)) / DAY)}d</span>
                        : <span className="tone info">Open</span>}
                  </td>
                  <td>
                    {!inv.paidAt && (
                      <button
                        className="btn mini"
                        onClick={() => {
                          memory.append("fact", "invoice_paid", { invoiceId: inv.invoiceId, paidAt: Date.now() });
                          toast(`${inv.customer}'s invoice marked paid — ${formatMoney(inv.amount)}`);
                        }}
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
        </div>
      )}

      {creating === "expense" && (
      <section className="card form-card" aria-labelledby="new-expense-title">
      <div className="section-heading"><div><h2 id="new-expense-title">Record expense</h2><p>Add a cost to the ledger so cash and margins stay honest.</p></div></div>
      <div className="form-row">
        <div>
          <label htmlFor="expense-label">Label</label>
          <input id="expense-label" value={expLabel} onChange={(e) => setExpLabel(e.target.value)} placeholder="Rent, supplier, wages…" />
        </div>
        <div>
          <label htmlFor="expense-amount">Amount ({ccy})</label>
          <input id="expense-amount" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} inputMode="decimal" placeholder="0.00" style={{ width: 120 }} />
        </div>
        <button className="btn" onClick={addExpense}>Add expense</button>
      </div>
      </section>
      )}

      <h2>Expenses</h2>
      {state.expenses.length === 0 ? (
        <div className="quiet">No expenses yet.</div>
      ) : (
        <div className="table-scroll" role="region" aria-label="Expenses table" tabIndex={0}>
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
        </div>
      )}

      <FinanceTools state={state} memory={memory} />
    </div>
  );
}

/**
 * Cash calendar — "what money can I expect, and when": dated invoice buckets,
 * undated courier cash shown honestly as its own bucket, plus a one-tap
 * WhatsApp reminder per overdue invoice (the collect workflow).
 */
function CashCalendarPanel({ state, memory }: { state: WorkspaceState; memory: MemoryStore }) {
  const cal = cashCalendar(state);
  const contacts = projectContacts(memory.all());
  const overdueEntries = cal.entries.filter((e) => e.overdueDays > 0).slice(0, 6);
  if (cal.entries.length === 0 && cal.codPending.count === 0) return null;

  return (
    <>
      <h2>Cash calendar</h2>
      <div className="stats" style={{ marginBottom: 14 }}>
        <div className="stat">
          <div className="k">Overdue — collect now</div>
          <div className="v">{formatMoney(cal.overdue.total)}</div>
        </div>
        <div className="stat">
          <div className="k">Due in 7 days</div>
          <div className="v">{formatMoney(cal.next7.total)}</div>
        </div>
        <div className="stat">
          <div className="k">Due in 8–30 days</div>
          <div className="v">{formatMoney(cal.next30.total)}</div>
        </div>
        <div className="stat">
          <div className="k">With couriers (no date)</div>
          <div className="v">{formatMoney(cal.codPending.total)}</div>
        </div>
      </div>
      {cal.avgDailyExpense !== null && cal.overdue.total > 0 && (
        <p className="confidence-note" style={{ marginTop: 0 }}>
          Your outgoings average {formatMoney(cal.avgDailyExpense)}/day — collecting the overdue bucket alone funds
          ≈ {Math.floor(cal.overdue.total / cal.avgDailyExpense)} days of operations.
        </p>
      )}
      {overdueEntries.length > 0 && (
        <div className="card">
          <p className="claim" style={{ fontSize: 15 }}>Collect first</p>
          <div className="table-scroll">
            <table className="records">
              <tbody>
                {overdueEntries.map((e) => {
                  const phone = contacts.get(e.customer)?.phone?.trim();
                  const reminder =
                    `Hello ${e.customer}, a gentle reminder: invoice of ${formatMoney(e.amount)} ` +
                    `is ${e.overdueDays} day${e.overdueDays > 1 ? "s" : ""} past due. ` +
                    `Could you let us know when to expect payment? Thank you!`;
                  const inv = state.invoices.find(
                    (i) => !i.paidAt && i.customer === e.customer && i.issuedAt + i.dueDays * 86_400_000 === e.dueAt
                  );
                  return (
                    <tr key={`${e.customer}-${e.dueAt}`}>
                      <td>{e.customer}</td>
                      <td>{formatMoney(e.amount)}</td>
                      <td className="muted">{e.overdueDays}d overdue</td>
                      <td>
                        <div className="row-actions">
                          {messagingConfigured && phone && (
                            <button
                              className="btn mini"
                              onClick={async () => {
                                const r = await sendMessage(phone, reminder, "whatsapp");
                                if (r.ok) {
                                  memory.append("fact", "customer_activity_logged", {
                                    activityId: crypto.randomUUID(), customer: e.customer, kind: "message",
                                    note: `WhatsApp payment reminder: ${reminder}`, at: Date.now(),
                                  });
                                  toast(`Reminder sent to ${e.customer}`);
                                } else toast(`Couldn't send: ${r.error}`);
                              }}
                            >
                              WhatsApp
                            </button>
                          )}
                          <button
                            className="btn subtle mini"
                            onClick={async () => {
                              await navigator.clipboard?.writeText(reminder).catch(() => undefined);
                              toast("Reminder copied");
                            }}
                          >
                            Copy
                          </button>
                          {inv && (
                            <button
                              className="btn subtle mini"
                              onClick={() => {
                                memory.append("fact", "invoice_paid", { invoiceId: inv.invoiceId, paidAt: Date.now() });
                                toast(`${e.customer}'s invoice marked paid — ${formatMoney(e.amount)}`);
                              }}
                            >
                              Mark paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
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
  const allCustomers = projectCustomerProfiles(state, now);
  const archivedSet = new Set(state.archivedCustomers);
  const customers = allCustomers.filter((c) => !archivedSet.has(c.name));
  const archivedCustomers = allCustomers.filter((c) => archivedSet.has(c.name));
  const contacts = projectContacts(memory.all());
  const activities = projectActivities(memory.all());
  const openFollowups = activities.filter((a) => !a.done && a.dueAt).length;
  const [open, setOpen] = useState<string | null>(null);
  const [custQ, setCustQ] = useState("");
  const [tagFilter, setTagFilter] = useState<CustomerTag | "all">("all");
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(() => new Set());

  // Command-palette deep link: open the exact profile that was searched for.
  useEffect(() => {
    const k = consumeDeepLink("customer");
    if (k) setOpen(k);
  }, []);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => document.getElementById("customer-profile")?.scrollIntoView({ block: "start" }));
  }, [open]);

  const custNeedle = custQ.trim().toLowerCase();
  const visibleCustomers = customers.filter(
    (c) =>
      (tagFilter === "all" || c.tags.includes(tagFilter)) &&
      (!custNeedle || c.name.toLowerCase().includes(custNeedle))
  );
  const selectedCustomer = open ? customers.find((c) => c.name === open) ?? null : null;
  const TAG_TABS: { id: CustomerTag | "all"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "vip", label: "VIP" },
    { id: "at-risk", label: "At risk" },
    { id: "new", label: "New" },
    { id: "high-refusal", label: "High refusal" },
  ];

  const restore = (name: string) =>
    memory.append("fact", "customer_restored", { customer: name, at: Date.now() });
  const archive = (name: string) => {
    memory.append("fact", "customer_archived", { customer: name, at: Date.now() });
    if (open === name) setOpen(null);
    // Safe + reversible → no blocking confirm; a calm toast with Undo instead.
    toast(`${name} archived — history stays in your figures`, "Undo", () => restore(name));
  };
  const toggleCustomer = (name: string) => {
    setSelectedCustomers((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const allVisibleCustomersSelected = visibleCustomers.length > 0 && visibleCustomers.every((c) => selectedCustomers.has(c.name));
  const toggleAllCustomers = () => {
    setSelectedCustomers((current) => {
      const next = new Set(current);
      if (allVisibleCustomersSelected) visibleCustomers.forEach((c) => next.delete(c.name));
      else visibleCustomers.forEach((c) => next.add(c.name));
      return next;
    });
  };
  const archiveSelectedCustomers = () => {
    const names = [...selectedCustomers];
    names.forEach((name) => memory.append("fact", "customer_archived", { customer: name, at: Date.now() }));
    if (open && selectedCustomers.has(open)) setOpen(null);
    setSelectedCustomers(new Set());
    toast(`${names.length} customer${names.length === 1 ? "" : "s"} archived`, "Undo", () => names.forEach(restore));
  };

  const rfm = computeRfm(customers, now);
  const dueList = reorderDueList(allCustomers, state.archivedCustomers, now);
  const refills = refillDueList(state, state.archivedCustomers, now);

  return (
    <div>
      <PageHeader
        title="Customers"
        description={<>See who matters most and who needs attention. Every profile unifies invoices and orders.{openFollowups > 0 && ` ${openFollowups} follow-up${openFollowups > 1 ? "s" : ""} scheduled.`}</>}
      />
      {customers.length === 0 ? (
        <div className="quiet">Customers will appear as you issue invoices or create orders.</div>
      ) : (
        <>
        <div className="index-toolbar">
          <div className="segmented" role="group" aria-label="Filter customers">
            {TAG_TABS.map((t) => {
              const n = t.id === "all" ? customers.length : customers.filter((c) => c.tags.includes(t.id as CustomerTag)).length;
              return (
                <button
                  key={t.id}
                  aria-pressed={tagFilter === t.id}
                  className={tagFilter === t.id ? "active" : ""}
                  onClick={() => setTagFilter(t.id)}
                >
                  {t.label}{n > 0 && ` ${n}`}
                </button>
              );
            })}
          </div>
          <input
            type="search"
            value={custQ}
            onChange={(e) => setCustQ(e.target.value)}
            placeholder="Search customers…"
            aria-label="Search customers"
          />
        </div>
        {visibleCustomers.length === 0 ? (
          <div className="quiet">No customers match{custQ.trim() ? ` “${custQ.trim()}”` : ""} in this view.</div>
        ) : (
        <>
        <div className="record-cards" aria-label="Customers">
          {visibleCustomers.map((c) => (
            <article className="record-card" key={`mobile-${c.name}`}>
              <div className="rc-head">
                <span className="rc-title rc-select-title">
                  <input type="checkbox" checked={selectedCustomers.has(c.name)} onChange={() => toggleCustomer(c.name)} aria-label={`Select ${c.name}`} />
                  {c.name}
                </span>
                <span className="rc-value">{formatMoney(c.lifetimeRevenue)}</span>
              </div>
              <p className="rc-sub">
                {c.interactions} interaction{c.interactions === 1 ? "" : "s"} · {c.lastActivityAt ? `${Math.round((now - c.lastActivityAt) / DAY)} days ago` : "no recent activity"}
              </p>
              <div className="tag-row rc-status">
                {rfm.get(c.name) && (
                  <span className={`tone ${SEGMENT_TONE[rfm.get(c.name)!.segment]}`}>
                    {SEGMENT_LABEL[rfm.get(c.name)!.segment]}
                  </span>
                )}
                {c.tags.map((t) => <span key={t} className={`badge ${TAG_STYLE[t].cls}`}>{TAG_STYLE[t].label}</span>)}
              </div>
              <div className="row-actions">
                <button
                  className="btn subtle mini"
                  aria-expanded={open === c.name}
                  aria-controls="customer-profile"
                  onClick={() => setOpen(open === c.name ? null : c.name)}
                >
                  {open === c.name ? "Close profile" : "View profile"}
                </button>
                <button className="btn mini danger" onClick={() => archive(c.name)}>Archive</button>
              </div>
            </article>
          ))}
        </div>
        <div className="table-scroll" role="region" aria-label="Customers table" tabIndex={0}>
        <table className="records desktop-table">
          <thead>
            <tr>
              <th className="checkcell"><input type="checkbox" checked={allVisibleCustomersSelected} onChange={toggleAllCustomers} aria-label="Select all visible customers" /></th>
              <th>Customer</th>
              <th>Lifetime revenue</th>
              <th>Lifetime profit</th>
              <th>Tags</th>
              <th>Last seen</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleCustomers.map((c) => (
              <Fragment key={c.name}>
                <tr>
                  <td className="checkcell"><input type="checkbox" checked={selectedCustomers.has(c.name)} onChange={() => toggleCustomer(c.name)} aria-label={`Select ${c.name}`} /></td>
                  <td>{c.name}</td>
                  <td>{formatMoney(c.lifetimeRevenue)}</td>
                  <td>{c.hasProfitData ? formatMoney(c.lifetimeProfit) : <span className="muted">—</span>}</td>
                  <td>
                    <div className="tag-row">
                      {rfm.get(c.name) && (
                        <span
                          className={`tone ${SEGMENT_TONE[rfm.get(c.name)!.segment]}`}
                          title={`RFM ${rfm.get(c.name)!.r}·${rfm.get(c.name)!.f}·${rfm.get(c.name)!.m} — recency, frequency, spend vs your own customer base`}
                        >
                          {SEGMENT_LABEL[rfm.get(c.name)!.segment]}
                        </span>
                      )}
                      {c.tags.map((t) => (
                        <span key={t} className={`badge ${TAG_STYLE[t].cls}`}>{TAG_STYLE[t].label}</span>
                      ))}
                    </div>
                  </td>
                  <td className="muted">
                    {c.lastActivityAt ? `${Math.round((now - c.lastActivityAt) / DAY)} days ago` : "—"}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn subtle mini"
                        aria-expanded={open === c.name}
                        aria-controls="customer-profile"
                        onClick={() => setOpen(open === c.name ? null : c.name)}
                      >
                        {open === c.name ? "Hide" : "Profile"}
                      </button>
                      <button className="btn mini danger" onClick={() => archive(c.name)}>Archive</button>
                    </div>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
        </div>
        {selectedCustomers.size > 0 && (
          <div className="bulk-bar" role="region" aria-label="Selected customer actions">
            <span>{selectedCustomers.size} selected</span>
            <button onClick={archiveSelectedCustomers}>Archive</button>
            <span className="spacer" />
            <button onClick={() => setSelectedCustomers(new Set())}>Clear selection</button>
          </div>
        )}
        </>
        )}
        </>
      )}

      {refills.length > 0 && (
        <section className="card" style={{ marginTop: 18, borderLeft: "3px solid var(--accent)" }} aria-labelledby="refills-due-title">
          <div className="badge-row">
            <span className="badge">Refills due</span>
            <span className="badge domain">{refills.length} predicted</span>
          </div>
          <p className="claim" id="refills-due-title" style={{ fontSize: 15.5 }}>
            Their supply is running out about now — predicted from what they bought and how long it lasts.
          </p>
          <div className="table-scroll">
            <table className="records">
              <tbody>
                {refills.slice(0, 8).map((r) => {
                  const phone = contacts.get(r.customer)?.phone?.trim();
                  const when =
                    r.daysPastEmpty > 0
                      ? `ran out ~${r.daysPastEmpty}d ago`
                      : r.daysPastEmpty === 0
                        ? "runs out about today"
                        : `runs out in ~${-r.daysPastEmpty}d`;
                  const nudge =
                    `Hello ${r.customer}! Your ${r.productName} from ${dateLabel(r.deliveredAt)} should be running low — ` +
                    `shall we prepare your refill? 🌿`;
                  return (
                    <tr key={`${r.customer}-${r.productId}`}>
                      <td>{r.customer}</td>
                      <td className="muted">{r.qty}× {r.productName}</td>
                      <td><span className={`tone ${r.daysPastEmpty >= 0 ? "attention" : "info"}`}>{when}</span></td>
                      <td>
                        <div className="row-actions">
                          {messagingConfigured && phone && (
                            <button
                              className="btn mini"
                              onClick={async () => {
                                const res = await sendMessage(phone, nudge, "whatsapp");
                                if (res.ok) {
                                  memory.append("fact", "customer_activity_logged", {
                                    activityId: crypto.randomUUID(), customer: r.customer, kind: "message",
                                    note: `WhatsApp refill nudge (${r.productName}): ${nudge}`, at: Date.now(),
                                  });
                                  toast(`Refill nudge sent to ${r.customer}`);
                                } else toast(`Couldn't send: ${res.error}`);
                              }}
                            >
                              WhatsApp
                            </button>
                          )}
                          <button
                            className="btn subtle mini"
                            onClick={async () => {
                              await navigator.clipboard?.writeText(nudge).catch(() => undefined);
                              toast("Refill message copied");
                            }}
                          >
                            Copy
                          </button>
                          <button className="btn subtle mini" onClick={() => setOpen(r.customer)}>Profile</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {dueList.length > 0 && (
        <section className="card" style={{ marginTop: 18, borderLeft: "3px solid var(--amber)" }} aria-labelledby="reorder-due-title">
          <div className="badge-row">
            <span className="badge strategic">Overdue to reorder</span>
            <span className="badge domain">{dueList.length} customer{dueList.length > 1 ? "s" : ""}</span>
          </div>
          <p className="claim" id="reorder-due-title" style={{ fontSize: 15.5 }}>
            Past their own rhythm — today's call sheet, most valuable first.
          </p>
          <div className="table-scroll">
            <table className="records">
              <tbody>
                {dueList.slice(0, 8).map((d) => {
                  const phone = contacts.get(d.name)?.phone?.trim();
                  const nudge =
                    `Hello ${d.name}! It's been about ${d.daysSince} days since your last order — ` +
                    `anything you need this week? We can prepare your usual. 🌿`;
                  return (
                    <tr key={d.name}>
                      <td>{d.name}</td>
                      <td className="muted">
                        {d.daysOverdue}d overdue <span className="muted">(usually every ~{d.usualGapDays}d)</span>
                      </td>
                      <td>≈ {formatMoney(d.expectedValue)} expected</td>
                      <td>
                        <div className="row-actions">
                          {messagingConfigured && phone && (
                            <button
                              className="btn mini"
                              onClick={async () => {
                                const r = await sendMessage(phone, nudge, "whatsapp");
                                if (r.ok) {
                                  memory.append("fact", "customer_activity_logged", {
                                    activityId: crypto.randomUUID(), customer: d.name, kind: "message",
                                    note: `WhatsApp reorder nudge: ${nudge}`, at: Date.now(),
                                  });
                                  toast(`Nudge sent to ${d.name}`);
                                } else toast(`Couldn't send: ${r.error}`);
                              }}
                            >
                              WhatsApp
                            </button>
                          )}
                          <button
                            className="btn subtle mini"
                            onClick={async () => {
                              await navigator.clipboard?.writeText(nudge).catch(() => undefined);
                              toast("Reorder message copied");
                            }}
                          >
                            Copy
                          </button>
                          <button className="btn subtle mini" onClick={() => setOpen(d.name)}>Profile</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedCustomer && (
        <section className="card detail-panel" id="customer-profile" aria-labelledby="customer-profile-title">
          <div className="section-heading">
            <div>
              <h2 id="customer-profile-title">{selectedCustomer.name}</h2>
              <p>Customer profile · invoices, orders, contact details, and follow-ups in one place.</p>
            </div>
            <button className="btn subtle mini" onClick={() => setOpen(null)}>Close</button>
          </div>
          <div className="stats compact-stats">
            {rfm.get(selectedCustomer.name) && (
              <div className="stat">
                <div className="k">Segment (R·F·M)</div>
                <div className="v" style={{ fontSize: 17 }}>
                  {SEGMENT_LABEL[rfm.get(selectedCustomer.name)!.segment]}{" "}
                  <span className="muted">
                    {rfm.get(selectedCustomer.name)!.r}·{rfm.get(selectedCustomer.name)!.f}·{rfm.get(selectedCustomer.name)!.m}
                  </span>
                </div>
              </div>
            )}
            <div className="stat"><div className="k">Lifetime revenue</div><div className="v">{formatMoney(selectedCustomer.lifetimeRevenue)}</div></div>
            <div className="stat"><div className="k">Average order</div><div className="v">{formatMoney(selectedCustomer.avgOrderValue)}</div></div>
            <div className="stat"><div className="k">Interactions</div><div className="v">{selectedCustomer.interactions}</div></div>
            <div className="stat"><div className="k">COD reliability</div><div className="v">{selectedCustomer.codReliability === null ? "—" : `${Math.round(selectedCustomer.codReliability * 100)}%`}</div></div>
          </div>
          <p className="confidence-note">
            Lifetime profit counts only delivered orders with cost data; paid invoices contribute to revenue but not the profit figure.
          </p>
          <CustomerCrm
            customer={selectedCustomer.name}
            contact={contacts.get(selectedCustomer.name) ?? {}}
            activities={activities.filter((a) => a.customer === selectedCustomer.name)}
            memory={memory}
          />

          <h2 style={{ marginTop: 22 }}>Story</h2>
          <ul className="timeline">
            {storyForCustomer(memory.all(), selectedCustomer.name).map((s, i) => (
              <li key={i}>
                <div className="when">{dateLabel(s.ts)}</div>
                <div className="what">{s.what}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {archivedCustomers.length > 0 && (
        <details className="layers" style={{ marginTop: 16 }}>
          <summary>{archivedCustomers.length} archived customer{archivedCustomers.length > 1 ? "s" : ""} — hidden from the list, still in your figures</summary>
          <table className="records" style={{ marginTop: 10 }}>
            <tbody>
              {archivedCustomers.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td className="muted">{formatMoney(c.lifetimeRevenue)} lifetime</td>
                  <td><button className="btn subtle mini" onClick={() => restore(c.name)}>Restore</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
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
        <div><label htmlFor="crm-phone">Phone</label><input id="crm-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" autoComplete="tel" style={{ width: 150 }} /></div>
        <div><label htmlFor="crm-city">City</label><input id="crm-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" autoComplete="address-level2" style={{ width: 130 }} /></div>
        <div style={{ flex: 1 }}><label htmlFor="crm-notes">Notes</label><input id="crm-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering" style={{ width: "100%" }} /></div>
        <button className="btn subtle" onClick={saveContact}>Save contact</button>
      </div>

      <div className="form-row">
        <div style={{ flex: 1 }}><label htmlFor="crm-activity">Log a call, note, or follow-up</label>
          <input id="crm-activity" value={actNote} onChange={(e) => setActNote(e.target.value)} placeholder="e.g. Called about reorder — will decide next week" style={{ width: "100%" }} /></div>
        <div><label htmlFor="crm-followup-days">Follow up in (days)</label><input id="crm-followup-days" value={dueDays} onChange={(e) => setDueDays(e.target.value)} inputMode="numeric" placeholder="none" style={{ width: 100 }} /></div>
        <button className="btn ghost" onClick={logActivity} disabled={!actNote.trim()}>Log</button>
      </div>

      {messagingConfigured && (
        <div className="form-row">
          <div style={{ flex: 1 }}>
            <label htmlFor="crm-message">Message this customer{!phone.trim() && " (add a phone above first)"}</label>
            <input id="crm-message" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type a WhatsApp or SMS message…" style={{ width: "100%" }} disabled={!phone.trim()} />
          </div>
          <button className="btn" onClick={() => void send("whatsapp")} disabled={sending || !phone.trim() || !msg.trim()}>{sending ? "Sending…" : "WhatsApp"}</button>
          <button className="btn subtle" onClick={() => void send("sms")} disabled={sending || !phone.trim() || !msg.trim()}>SMS</button>
        </div>
      )}
      {sendResult && <p className="confidence-note" role="status" style={{ marginTop: 0 }}>{sendResult}</p>}

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
                  <button className="btn subtle mini" style={{ marginLeft: 10 }} onClick={() => complete(a.activityId)}>Mark done</button>
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
  const [daysUse, setDaysUse] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [productQ, setProductQ] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(() => new Set());
  const ccy = getActiveCurrency();
  const activeProducts = state.products.filter((p) => !p.discontinued);
  const discontinued = state.products.filter((p) => p.discontinued);
  const productNeedle = productQ.trim().toLowerCase();
  const visibleProducts = activeProducts.filter((p) => !productNeedle || p.name.toLowerCase().includes(productNeedle));

  // Command-palette deep link: open the exact product's editor.
  useEffect(() => {
    const k = consumeDeepLink("product");
    if (k) setEditing(k);
  }, []);

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
      ...(parseInt(daysUse, 10) > 0 ? { daysOfUse: parseInt(daysUse, 10) } : {}),
    });
    setName(""); setStock(""); setWeekly(""); setCost(""); setPrice(""); setDaysUse("");
    setCreating(false);
  };

  const adjustStock = async (product: Product) => {
    const raw = await appPrompt({
      title: `Adjust stock — ${product.name}`,
      body: "Positive to add (received, found), negative to remove (damaged, lost). Recorded as a traceable stock movement.",
      label: "Adjustment",
      placeholder: "+50 or -3",
      confirmLabel: "Record movement",
    });
    if (raw === null) return;
    const delta = parseInt(raw, 10);
    if (!isFinite(delta) || delta === 0) return;
    memory.append("fact", "stock_adjusted", {
      productId: product.productId,
      delta,
      reason: "manual adjustment",
    });
    toast(`"${product.name}" stock ${delta > 0 ? "+" : ""}${delta}`);
  };

  const discontinueProduct = (product: Product) => {
    memory.append("fact", "product_discontinued", { productId: product.productId, at: Date.now() });
    if (editing === product.productId) setEditing(null);
    toast(`"${product.name}" discontinued — history kept`, "Undo", () =>
      memory.append("fact", "product_restored", { productId: product.productId, at: Date.now() })
    );
  };
  const toggleProduct = (id: string) => {
    setSelectedProducts((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allVisibleProductsSelected = visibleProducts.length > 0 && visibleProducts.every((p) => selectedProducts.has(p.productId));
  const toggleAllProducts = () => {
    setSelectedProducts((current) => {
      const next = new Set(current);
      if (allVisibleProductsSelected) visibleProducts.forEach((p) => next.delete(p.productId));
      else visibleProducts.forEach((p) => next.add(p.productId));
      return next;
    });
  };
  const discontinueSelectedProducts = () => {
    const ids = [...selectedProducts];
    ids.forEach((productId) => memory.append("fact", "product_discontinued", { productId, at: Date.now() }));
    if (editing && selectedProducts.has(editing)) setEditing(null);
    setSelectedProducts(new Set());
    toast(`${ids.length} product${ids.length === 1 ? "" : "s"} discontinued`, "Undo", () =>
      ids.forEach((productId) => memory.append("fact", "product_restored", { productId, at: Date.now() }))
    );
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Know what to reorder, when to reorder it, and which products are quietly not selling."
        actions={<button className="btn" onClick={() => setCreating((v) => !v)}>{creating ? "Close" : "Add product"}</button>}
      />

      {creating && (
      <section className="card form-card" aria-labelledby="new-product-title">
      <div className="section-heading"><div><h2 id="new-product-title">Add product</h2><p>Set the starting stock, sales pace, lead time, and unit economics.</p></div></div>
      <div className="form-row">
        <div><label htmlFor="product-name">Name</label><input id="product-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" /></div>
        <div><label htmlFor="product-stock">Stock</label><input id="product-stock" value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" style={{ width: 76 }} /></div>
        <div><label htmlFor="product-weekly">Sales / week</label><input id="product-weekly" value={weekly} onChange={(e) => setWeekly(e.target.value)} inputMode="decimal" style={{ width: 90 }} /></div>
        <div><label htmlFor="product-lead">Lead time (d)</label><input id="product-lead" value={lead} onChange={(e) => setLead(e.target.value)} inputMode="numeric" style={{ width: 90 }} /></div>
        <div><label htmlFor="product-cost">Unit cost ({ccy})</label><input id="product-cost" value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" style={{ width: 96 }} /></div>
        <div><label htmlFor="product-price">Price ({ccy})</label><input id="product-price" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" style={{ width: 88 }} /></div>
        <div><label htmlFor="product-daysuse" title="How many days one unit lasts a customer — powers refill reminders">Days of use</label><input id="product-daysuse" value={daysUse} onChange={(e) => setDaysUse(e.target.value)} inputMode="numeric" placeholder="e.g. 30" style={{ width: 88 }} /></div>
        <button className="btn" onClick={addProduct}>Add product</button>
      </div>
      </section>
      )}

      <h2>Products</h2>
      {activeProducts.length > 0 && (
        <div className="index-toolbar">
          <span className="resource-count">{activeProducts.length} active product{activeProducts.length === 1 ? "" : "s"}</span>
          <input
            type="search"
            value={productQ}
            onChange={(e) => setProductQ(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
          />
        </div>
      )}
      {activeProducts.length === 0 ? (
        <div className="quiet">No active products yet. Add a product to start tracking stock.</div>
      ) : visibleProducts.length === 0 ? (
        <div className="quiet">No products match “{productQ.trim()}”.</div>
      ) : (
        <>
        <div className="record-cards" aria-label="Products">
          {visibleProducts.map((p) => {
            const daysLeft = p.weeklySales > 0 ? Math.round(p.stock / (p.weeklySales / 7)) : null;
            const inc = state.incoming[p.productId] ?? 0;
            return (
              <article className="record-card" key={`mobile-${p.productId}`}>
                <div className="rc-head">
                  <span className="rc-title rc-select-title">
                    <input type="checkbox" checked={selectedProducts.has(p.productId)} onChange={() => toggleProduct(p.productId)} aria-label={`Select ${p.name}`} />
                    {p.name}
                  </span>
                  <span className="rc-value">{p.stock} in stock</span>
                </div>
                <p className="rc-sub">{inc > 0 ? `${inc} incoming · ` : ""}{p.weeklySales} sold/week · {daysLeft === null ? "not selling" : `about ${daysLeft} days left`}</p>
                <div className="row-actions">
                  <button className="btn subtle mini" aria-expanded={editing === p.productId} onClick={() => setEditing(editing === p.productId ? null : p.productId)}>{editing === p.productId ? "Close" : "Edit"}</button>
                  <button className="btn subtle mini" onClick={() => void adjustStock(p)}>Stock ±</button>
                  <button className="btn mini danger" onClick={() => discontinueProduct(p)}>Discontinue</button>
                </div>
                {editing === p.productId && <div className="inline-editor"><ProductEditor product={p} memory={memory} onDone={() => setEditing(null)} idPrefix="mobile-product-editor" /></div>}
              </article>
            );
          })}
        </div>
        <div className="table-scroll" role="region" aria-label="Products table" tabIndex={0}>
        <table className="records desktop-table">
          <thead>
            <tr>
              <th className="checkcell"><input type="checkbox" checked={allVisibleProductsSelected} onChange={toggleAllProducts} aria-label="Select all visible products" /></th>
              <th>Product</th><th>Stock</th><th>Incoming</th><th>Sales / week</th><th>Days of stock</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((p) => {
              const daysLeft = p.weeklySales > 0 ? Math.round(p.stock / (p.weeklySales / 7)) : null;
              const inc = state.incoming[p.productId] ?? 0;
              return (
                <Fragment key={p.productId}>
                  <tr>
                    <td className="checkcell"><input type="checkbox" checked={selectedProducts.has(p.productId)} onChange={() => toggleProduct(p.productId)} aria-label={`Select ${p.name}`} /></td>
                    <td>{p.name}</td>
                    <td>{p.stock}</td>
                    <td className="muted">{inc > 0 ? `+${inc}` : "—"}</td>
                    <td className="muted">{p.weeklySales}</td>
                    <td className="muted">{daysLeft === null ? "not selling" : `~${daysLeft} days`}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn subtle mini"
                          aria-expanded={editing === p.productId}
                          aria-controls={`product-editor-${p.productId}`}
                          onClick={() => setEditing(editing === p.productId ? null : p.productId)}
                        >
                          {editing === p.productId ? "Close" : "Edit"}
                        </button>
                        <button
                          className="btn subtle mini"
                          onClick={() => void adjustStock(p)}
                        >
                          Stock ±
                        </button>
                        <button
                          className="btn mini danger"
                          onClick={() => discontinueProduct(p)}
                        >
                          Discontinue
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editing === p.productId && (
                    <tr id={`product-editor-${p.productId}`}>
                      <td colSpan={7}>
                        <ProductEditor product={p} memory={memory} onDone={() => setEditing(null)} idPrefix="desktop-product-editor" />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
        {selectedProducts.size > 0 && (
          <div className="bulk-bar" role="region" aria-label="Selected product actions">
            <span>{selectedProducts.size} selected</span>
            <button onClick={discontinueSelectedProducts}>Discontinue</button>
            <span className="spacer" />
            <button onClick={() => setSelectedProducts(new Set())}>Clear selection</button>
          </div>
        )}
        </>
      )}

      {discontinued.length > 0 && (
        <details className="layers" style={{ marginTop: 16 }}>
          <summary>{discontinued.length} discontinued product{discontinued.length > 1 ? "s" : ""} — hidden from lists and advice, history kept</summary>
          <table className="records" style={{ marginTop: 10 }}>
            <tbody>
              {discontinued.map((p) => (
                <tr key={p.productId}>
                  <td>{p.name}</td>
                  <td className="muted">{p.stock} in stock</td>
                  <td><button className="btn subtle mini" onClick={() => memory.append("fact", "product_restored", { productId: p.productId, at: Date.now() })}>Restore</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      <PurchaseOrders state={state} memory={memory} />
    </div>
  );
}

/** Edit a product — appends a `product_updated` correction event (append-only; history intact). */
function ProductEditor({ product, memory, onDone, idPrefix }: { product: Product; memory: MemoryStore; onDone: () => void; idPrefix: string }) {
  const ccy = getActiveCurrency();
  const [name, setName] = useState(product.name);
  const [weekly, setWeekly] = useState(String(product.weeklySales));
  const [lead, setLead] = useState(String(product.leadTimeDays));
  const [cost, setCost] = useState(String(product.unitCost));
  const [price, setPrice] = useState(String(product.price));
  const [daysUse, setDaysUse] = useState(product.daysOfUse ? String(product.daysOfUse) : "");

  const save = () => {
    const w = parseFloat(weekly);
    const l = parseInt(lead, 10);
    const c = parseFloat(cost);
    const p = parseFloat(price);
    const du = parseInt(daysUse, 10);
    const patch: Record<string, unknown> = { productId: product.productId, at: Date.now() };
    if (name.trim() && name.trim() !== product.name) patch.name = name.trim();
    if (isFinite(w) && w >= 0 && w !== product.weeklySales) patch.weeklySales = w;
    if (isFinite(l) && l > 0 && l !== product.leadTimeDays) patch.leadTimeDays = l;
    if (isFinite(c) && c >= 0 && c !== product.unitCost) patch.unitCost = c;
    if (isFinite(p) && p >= 0 && p !== product.price) patch.price = p;
    if (isFinite(du) && du > 0 && du !== product.daysOfUse) patch.daysOfUse = du;
    if (Object.keys(patch).length > 2) {
      memory.append("fact", "product_updated", patch);
      toast(`"${(patch.name as string) ?? product.name}" updated`);
    }
    onDone();
  };

  return (
    <div>
      <div className="form-row" style={{ marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 160 }}><label htmlFor={`${idPrefix}-name`}>Name</label><input id={`${idPrefix}-name`} value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} /></div>
        <div><label htmlFor={`${idPrefix}-weekly`}>Sales / week</label><input id={`${idPrefix}-weekly`} value={weekly} onChange={(e) => setWeekly(e.target.value)} inputMode="decimal" style={{ width: 90 }} /></div>
        <div><label htmlFor={`${idPrefix}-lead`}>Lead time (d)</label><input id={`${idPrefix}-lead`} value={lead} onChange={(e) => setLead(e.target.value)} inputMode="numeric" style={{ width: 90 }} /></div>
        <div><label htmlFor={`${idPrefix}-cost`}>Unit cost ({ccy})</label><input id={`${idPrefix}-cost`} value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" style={{ width: 96 }} /></div>
        <div><label htmlFor={`${idPrefix}-price`}>Price ({ccy})</label><input id={`${idPrefix}-price`} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" style={{ width: 88 }} /></div>
        <div><label htmlFor={`${idPrefix}-daysuse`} title="How many days one unit lasts a customer — powers refill reminders">Days of use</label><input id={`${idPrefix}-daysuse`} value={daysUse} onChange={(e) => setDaysUse(e.target.value)} inputMode="numeric" placeholder="—" style={{ width: 88 }} /></div>
        <button className="btn mini" onClick={save}>Save changes</button>
        <button className="btn subtle mini" onClick={onDone}>Cancel</button>
      </div>
      <p className="confidence-note" style={{ margin: 0 }}>
        Stock is adjusted with “Stock ±” (a traceable movement), not edited here — so the ledger stays honest.
        Every save is a correction event in Business Memory; nothing is overwritten.
      </p>
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
  const [creating, setCreating] = useState(false);

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
    setCreating(false);
  };

  const receive = (poId: string) => {
    memory.append("fact", "goods_received", { poId, at: Date.now() });
  };

  const poValue = (lines: { qty: number; unitCost: number }[]) => lines.reduce((s, l) => s + l.qty * l.unitCost, 0);

  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Purchase orders</h2>
          <p>Reorder from suppliers, track incoming units, then receive them into stock at the cost actually paid.</p>
        </div>
        <button className="btn subtle" onClick={() => setCreating((v) => !v)}>{creating ? "Close" : "Create purchase order"}</button>
      </div>
      {creating && (
      <div className="card form-card">
      <div className="form-row">
        <div><label htmlFor="po-supplier">Supplier</label><input id="po-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} style={{ width: 160 }} /></div>
        <div>
          <label htmlFor="po-product">Product</label>
          <select id="po-product" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select…</option>
            {state.products.filter((p) => !p.discontinued).map((p) => (
              <option key={p.productId} value={p.productId}>{p.name}</option>
            ))}
          </select>
        </div>
        <div><label htmlFor="po-qty">Quantity</label><input id="po-qty" value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" style={{ width: 80 }} /></div>
        <div><label htmlFor="po-cost">Unit cost ({ccy})</label><input id="po-cost" value={effectiveCost} onChange={(e) => setUnitCost(e.target.value)} inputMode="decimal" style={{ width: 110 }} /></div>
        <button className="btn" onClick={createPo} disabled={!selected || !(parseInt(qty, 10) > 0)}>Create PO</button>
      </div>
      </div>
      )}

      {state.purchaseOrders.length === 0 ? (
        <div className="quiet">No purchase orders yet.</div>
      ) : (
        <div className="table-scroll" role="region" aria-label="Purchase orders table" tabIndex={0}>
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
                <td>{!po.receivedAt && <button className="btn mini" onClick={() => receive(po.poId)}>Receive</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </>
  );
}
