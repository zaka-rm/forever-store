import { useState, type FormEvent } from "react";
import { calculateInvoiceTotals, invoiceFromAcceptedQuote, quoteDocumentHtml, type DocumentBranding } from "../core/documents";
import { formatMoney } from "../core/engine";
import { getActiveCurrency } from "../core/format";
import type { MemoryStore } from "../core/memory";
import type { Quote, QuoteStatus } from "../core/types";
import { appConfirm } from "./dialog";
import { toast } from "./toast";

type DraftLine = { lineId: string; description: string; qty: string; unitPrice: string };
const freshLine = (): DraftLine => ({ lineId: crypto.randomUUID(), description: "", qty: "1", unitPrice: "" });
const dateLabel = (timestamp: number) => new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function preview(html: string) {
  const win = window.open("", "_blank", "width=900,height=780");
  if (!win) { toast("Allow pop-ups to preview this estimate."); return; }
  win.document.write(html); win.document.close();
}

const toneFor = (status: QuoteStatus, expired: boolean) => expired ? "attention" : status === "accepted" || status === "converted" ? "success" : status === "declined" ? "critical" : "info";
const labelFor = (status: QuoteStatus, expired: boolean) => expired && status !== "accepted" && status !== "converted" ? "Expired" : status[0].toUpperCase() + status.slice(1);

function QuoteComposer({ memory, onClose }: { memory: MemoryStore; onClose: () => void }) {
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([freshLine()]);
  const [discount, setDiscount] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [validDays, setValidDays] = useState("14");
  const [notes, setNotes] = useState("");
  const ccy = getActiveCurrency();
  const totals = calculateInvoiceTotals(lines.map((line) => ({ qty: parseFloat(line.qty) || 0, unitPrice: parseFloat(line.unitPrice) || 0 })), parseFloat(discount) || 0, parseFloat(taxRate) || 0);

  const updateLine = (lineId: string, patch: Partial<DraftLine>) => setLines((before) => before.map((line) => line.lineId === lineId ? { ...line, ...patch } : line));
  const save = (event: FormEvent) => {
    event.preventDefault();
    const cleanLines = lines.map((line) => ({ lineId: line.lineId, description: line.description.trim(), qty: parseFloat(line.qty), unitPrice: parseFloat(line.unitPrice) }));
    if (!customer.trim() || cleanLines.some((line) => !line.description || !isFinite(line.qty) || line.qty <= 0 || !isFinite(line.unitPrice) || line.unitPrice < 0) || totals.total <= 0) {
      toast("Add a customer and complete every estimate line."); return;
    }
    const createdAt = Date.now();
    memory.append("fact", "quote_created", {
      quoteId: crypto.randomUUID(), customer: customer.trim(), customerEmail: email.trim(), customerAddress: address.trim(),
      lines: cleanLines, ...totals, notes: notes.trim(), createdAt,
      validUntil: createdAt + Math.max(1, parseInt(validDays, 10) || 14) * 86_400_000,
    });
    toast("Estimate created as a draft"); onClose();
  };

  return <form className="card form-card quote-composer" onSubmit={save} aria-labelledby="new-quote-title">
    <div className="section-heading"><div><h2 id="new-quote-title">Create estimate</h2><p>Prepare a negotiated offer without recording revenue or reserving stock.</p></div><button type="button" className="btn subtle mini" onClick={onClose}>Close</button></div>
    <div className="invoice-customer-grid">
      <label><span>Customer *</span><input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer or company" /></label>
      <label><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" /></label>
      <label className="wide"><span>Billing address</span><textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, country" /></label>
    </div>
    <div className="invoice-line-head"><span>Description</span><span>Quantity</span><span>Unit price ({ccy})</span><span>Amount</span><span aria-hidden="true" /></div>
    <div className="invoice-lines">{lines.map((line, index) => <div className="invoice-line" key={line.lineId}>
      <label><span className="sr-only">Estimate line {index + 1} description</span><input value={line.description} onChange={(e) => updateLine(line.lineId, { description: e.target.value })} placeholder="Product or service" /></label>
      <label><span className="sr-only">Estimate line {index + 1} quantity</span><input value={line.qty} onChange={(e) => updateLine(line.lineId, { qty: e.target.value })} inputMode="decimal" /></label>
      <label><span className="sr-only">Estimate line {index + 1} unit price</span><input value={line.unitPrice} onChange={(e) => updateLine(line.lineId, { unitPrice: e.target.value })} inputMode="decimal" placeholder="0.00" /></label>
      <strong>{formatMoney((parseFloat(line.qty) || 0) * (parseFloat(line.unitPrice) || 0))}</strong>
      <button type="button" className="btn subtle mini" aria-label={`Remove estimate line ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines((before) => before.filter((item) => item.lineId !== line.lineId))}>Remove</button>
    </div>)}</div>
    <button type="button" className="btn ghost mini" onClick={() => setLines((before) => [...before, freshLine()])}>Add line</button>
    <div className="invoice-bottom-grid">
      <label><span>Customer-facing note</span><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Scope, delivery expectations, exclusions…" /></label>
      <div className="invoice-calculation">
        <label><span>Discount ({ccy})</span><input value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" /></label>
        <label><span>Tax rate (%)</span><input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} inputMode="decimal" /></label>
        <label><span>Valid for days</span><input value={validDays} onChange={(e) => setValidDays(e.target.value)} inputMode="numeric" /></label>
        <div className="invoice-live-total"><span>Estimated total</span><strong>{formatMoney(totals.total)}</strong></div>
      </div>
    </div>
    <div className="invoice-composer-actions"><button className="btn" type="submit" disabled={totals.total <= 0}>Save draft estimate · {formatMoney(totals.total)}</button><span>Drafts do not affect cash, revenue, inventory, or invoice aging.</span></div>
  </form>;
}

export function QuotesPanel({ quotes, branding, memory, editable }: { quotes: Quote[]; branding: DocumentBranding; memory: MemoryStore; editable: boolean }) {
  const [creating, setCreating] = useState(false);
  const transition = (quote: Quote, status: "sent" | "accepted" | "declined") => {
    memory.append("fact", "quote_status_changed", { quoteId: quote.quoteId, status, at: Date.now() });
    toast(`Estimate marked ${status}`);
  };
  const convert = async (quote: Quote) => {
    const ok = await appConfirm({ title: "Create an invoice from this estimate?", body: "ZYVORA will copy the accepted lines, customer details, discount, tax and notes into a new open invoice. The estimate stays in history as converted.", confirmLabel: "Create invoice" });
    if (!ok) return;
    const now = Date.now();
    memory.append("fact", "invoice_issued", { ...invoiceFromAcceptedQuote(quote, crypto.randomUUID(), now) });
    memory.append("fact", "quote_status_changed", { quoteId: quote.quoteId, status: "converted", at: now });
    toast("Accepted estimate converted to an open invoice");
  };

  return <section className="card quotes-panel" aria-labelledby="quotes-title">
    <div className="section-head"><div><h2 id="quotes-title">Quotes & estimates</h2><p className="muted">Negotiate first, then convert accepted work without retyping it.</p></div>{editable && <button className="btn" onClick={() => setCreating((value) => !value)}>{creating ? "Close" : "Create estimate"}</button>}</div>
    {creating && <QuoteComposer memory={memory} onClose={() => setCreating(false)} />}
    {quotes.length === 0 ? <div className="quiet">No estimates yet. Create one when a customer asks for a price before committing.</div> : <div className="table-scroll"><table className="records"><thead><tr><th>Reference</th><th>Customer</th><th>Created</th><th>Valid until</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {quotes.map((quote) => {
        const expired = Date.now() > quote.validUntil;
        return <tr key={quote.quoteId}><td>{quote.quoteId.slice(0, 8)}</td><td>{quote.customer}</td><td className="muted">{dateLabel(quote.createdAt)}</td><td className="muted">{dateLabel(quote.validUntil)}</td><td>{formatMoney(quote.amount)}</td><td><span className={`tone ${toneFor(quote.status, expired)}`}>{labelFor(quote.status, expired)}</span></td><td><div className="row-actions">
          <button className="btn subtle mini" onClick={() => preview(quoteDocumentHtml(quote, branding, formatMoney))}>Preview / PDF</button>
          {editable && quote.status === "draft" && <button className="btn subtle mini" onClick={() => transition(quote, "sent")}>Mark sent</button>}
          {editable && (quote.status === "draft" || quote.status === "sent") && !expired && <button className="btn mini" onClick={() => transition(quote, "accepted")}>Accept</button>}
          {editable && (quote.status === "draft" || quote.status === "sent") && <button className="btn subtle mini" onClick={() => transition(quote, "declined")}>Decline</button>}
          {editable && quote.status === "accepted" && <button className="btn mini" onClick={() => void convert(quote)}>Create invoice</button>}
        </div></td></tr>;
      })}
    </tbody></table></div>}
  </section>;
}
