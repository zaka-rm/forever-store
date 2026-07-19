import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  canGenerateFulfillmentDocuments,
  creditNoteDocumentHtml,
  deliveryNoteDocumentHtml,
  invoiceDocumentHtml,
  packingSlipDocumentHtml,
  projectDocumentBranding,
  receiptDocumentHtml,
  type DocumentBranding,
} from "../core/documents";
import { formatMoney } from "../core/engine";
import type { MemoryStore } from "../core/memory";
import type { WorkspaceState } from "../core/types";
import { PageHeader } from "./PageHeader";
import { toast } from "./toast";
import { QuotesPanel } from "./Quotes";

const shortDate = (timestamp: number) => new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const safeName = (value: string) => value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

function preview(html: string) {
  const win = window.open("", "_blank", "width=900,height=780");
  if (!win) { toast("Allow pop-ups to preview this document."); return; }
  win.document.write(html);
  win.document.close();
}

function download(html: string, name: string) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = `${safeName(name)}.html`; link.click();
  URL.revokeObjectURL(url);
  toast("Document downloaded — open it to print or save as PDF");
}

const readDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error("The logo file could not be read."));
  reader.readAsDataURL(file);
});

const inspectRaster = (url: string) => new Promise<{ width: number; height: number; transparent: boolean }>((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const width = Math.min(96, image.naturalWidth);
    const height = Math.max(1, Math.round(width * image.naturalHeight / image.naturalWidth));
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) { reject(new Error("The logo could not be inspected.")); return; }
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    let transparent = false;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 250) { transparent = true; break; }
    }
    resolve({ width: image.naturalWidth, height: image.naturalHeight, transparent });
  };
  image.onerror = () => reject(new Error("Use a valid PNG, WebP, or SVG logo."));
  image.src = url;
});

async function validatedLogo(file: File) {
  const accepted = ["image/png", "image/webp", "image/svg+xml"];
  if (!accepted.includes(file.type)) throw new Error("Use a transparent PNG, WebP, or SVG file.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Keep the logo under 2 MB.");
  const dataUrl = await readDataUrl(file);
  if (file.type === "image/svg+xml") {
    const source = await file.text();
    if (!/<svg[\s>]/i.test(source)) throw new Error("This SVG file is not valid.");
    return { dataUrl, width: 512, height: 512 };
  }
  const image = await inspectRaster(dataUrl);
  if (image.width < 512) throw new Error(`Logo is ${image.width}px wide. Upload one at least 512px wide.`);
  if (!image.transparent) throw new Error("This logo has an opaque background. Upload a transparent PNG/WebP or an SVG.");
  return { dataUrl, width: image.width, height: image.height };
}

function BrandingEditor({ current, memory, onClose }: { current: DocumentBranding; memory: MemoryStore; onClose: () => void }) {
  const [draft, setDraft] = useState(current);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(current), [current]);
  const field = (key: keyof DocumentBranding, value: string) => setDraft((before) => ({ ...before, [key]: value }));

  const chooseLogo = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const logo = await validatedLogo(file);
      setDraft((before) => ({ ...before, logoDataUrl: logo.dataUrl, logoFileName: file.name, logoWidth: logo.width, logoHeight: logo.height }));
      toast("Transparent high-resolution logo is ready");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Logo could not be added.");
      if (fileRef.current) fileRef.current.value = "";
    } finally { setBusy(false); }
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.businessName.trim()) { toast("Business display name is required."); return; }
    memory.append("fact", "document_branding_updated", {
      ...draft,
      businessName: draft.businessName.trim(),
      updatedAt: Date.now(),
    });
    toast("Document branding saved");
    onClose();
  };

  return <form className="card document-branding-editor" onSubmit={save} aria-labelledby="document-branding-title">
    <div className="section-head"><div><h2 id="document-branding-title">Document branding</h2><p className="muted">Shown on every invoice and receipt. Changes are recorded in Business Memory.</p></div><button type="button" className="btn subtle mini" onClick={onClose}>Close</button></div>
    <div className="branding-layout">
      <section className="logo-uploader" aria-label="Business logo">
        <div className="logo-stage">{draft.logoDataUrl ? <img src={draft.logoDataUrl} alt="Current business logo" /> : <div><strong>{draft.businessName.slice(0, 1).toUpperCase() || "B"}</strong><span>Your transparent logo</span></div>}</div>
        <input ref={fileRef} className="sr-only" id="document-logo" type="file" accept=".png,.webp,.svg,image/png,image/webp,image/svg+xml" onChange={(event) => void chooseLogo(event.target.files?.[0])} />
        <div className="logo-actions"><label className="btn subtle mini" htmlFor="document-logo">{busy ? "Checking…" : draft.logoDataUrl ? "Replace logo" : "Upload logo"}</label>{draft.logoDataUrl && <button type="button" className="link-btn" onClick={() => { setDraft((before) => ({ ...before, logoDataUrl: "", logoFileName: "", logoWidth: 0, logoHeight: 0 })); if (fileRef.current) fileRef.current.value = ""; }}>Remove</button>}</div>
        <p>Transparent PNG/WebP, 512px+ wide, or SVG. Maximum 2 MB. The invoice keeps the original aspect ratio and never adds a background.</p>
        {draft.logoDataUrl && <span className="logo-quality">High-resolution · {draft.logoFileName}{draft.logoWidth ? ` · ${draft.logoWidth}×${draft.logoHeight}` : ""}</span>}
      </section>
      <section className="branding-fields">
        <div className="document-form-grid">
          <label><span>Business display name *</span><input value={draft.businessName} onChange={(e) => field("businessName", e.target.value)} required /></label>
          <label><span>Legal business name</span><input value={draft.legalName} onChange={(e) => field("legalName", e.target.value)} /></label>
          <label><span>Business email</span><input type="email" value={draft.email} onChange={(e) => field("email", e.target.value)} /></label>
          <label><span>Business phone</span><input value={draft.phone} onChange={(e) => field("phone", e.target.value)} /></label>
          <label className="wide"><span>Street address</span><input value={draft.address} onChange={(e) => field("address", e.target.value)} /></label>
          <label><span>City</span><input value={draft.city} onChange={(e) => field("city", e.target.value)} /></label>
          <label><span>Country</span><input value={draft.country} onChange={(e) => field("country", e.target.value)} /></label>
          <label><span>Tax ID / ICE</span><input value={draft.taxId} onChange={(e) => field("taxId", e.target.value)} /></label>
          <label><span>Registration number</span><input value={draft.registrationNumber} onChange={(e) => field("registrationNumber", e.target.value)} /></label>
          <label className="wide"><span>Payment details</span><textarea rows={3} value={draft.paymentDetails} onChange={(e) => field("paymentDetails", e.target.value)} placeholder="Bank, account, payment instructions…" /></label>
          <label className="wide"><span>Footer message</span><input value={draft.footerNote} onChange={(e) => field("footerNote", e.target.value)} /></label>
          <label><span>Document accent</span><input className="color-field" type="color" value={draft.accentColor} onChange={(e) => field("accentColor", e.target.value)} /></label>
        </div>
        <div className="branding-save"><button className="btn" type="submit" disabled={busy}>Save document branding</button><span>Owner and manager access only</span></div>
      </section>
    </div>
  </form>;
}

export function DocumentsView({ state, workspaceName, memory, editable }: { state: WorkspaceState; workspaceName: string; memory: MemoryStore; editable: boolean }) {
  const receipts = state.orders.filter((order) => order.status === "delivered");
  const fulfillmentOrders = state.orders.filter(canGenerateFulfillmentDocuments);
  const creditNotes = state.orders.flatMap((order) => (order.returnRecords ?? []).map((record) => ({ order, record })));
  const branding = useMemo(() => projectDocumentBranding(memory.all(), workspaceName), [memory, workspaceName, memory.all().length]);
  const [editing, setEditing] = useState(false);
  const exampleInvoice = {
    invoiceId: "INV-PREVIEW", customer: "Example customer", customerEmail: "billing@example.com",
    customerAddress: "12 Commerce Street\nCasablanca, Morocco",
    lines: [
      { lineId: "example-1", description: "Premium Aloe Care Set", qty: 2, unitPrice: 500 },
      { lineId: "example-2", description: "Delivery and handling", qty: 1, unitPrice: 200 },
    ],
    subtotal: 1200, discount: 50, taxRate: 20, taxAmount: 230, amount: 1380,
    notes: "Example only — your real invoice uses the details saved in Finance.",
    issuedAt: Date.now(), dueDays: 7,
  };
  return (
    <div>
      <PageHeader title="Documents" description="Branded estimates, invoices, packing slips, delivery notes, and receipts generated directly from Business Memory." />
      <section className="document-brand-summary" aria-label="Current document brand">
        <div className="document-brand-mark">{branding.logoDataUrl ? <img src={branding.logoDataUrl} alt={`${branding.businessName} logo`} /> : <strong>{branding.businessName.slice(0, 1).toUpperCase()}</strong>}</div>
        <div><span>Document identity</span><h2>{branding.businessName}</h2><p>{[branding.email, branding.phone, branding.city, branding.country].filter(Boolean).join(" · ") || "Add business contact and legal information to complete your documents."}</p></div>
        <div className="document-brand-actions">
          <button className="btn subtle" onClick={() => preview(invoiceDocumentHtml(exampleInvoice, branding, formatMoney))}>Preview example</button>
          {editable ? <button className="btn" onClick={() => setEditing((value) => !value)}>{editing ? "Close branding" : "Manage branding"}</button> : <span className="tone info">Manager controlled</span>}
        </div>
      </section>
      {editing && <BrandingEditor current={branding} memory={memory} onClose={() => setEditing(false)} />}

      <QuotesPanel quotes={state.quotes} branding={branding} memory={memory} editable={editable} />

      <div className="metric-strip compact" style={{ marginBottom: 18 }}>
        <div><span>Invoices</span><strong>{state.invoices.length}</strong></div>
        <div><span>Receipts available</span><strong>{receipts.length}</strong></div>
        <div><span>Fulfillment sets</span><strong>{fulfillmentOrders.length}</strong></div>
        <div><span>Credit notes</span><strong>{creditNotes.length}</strong></div>
      </div>
      <p className="confidence-note">Each preview uses the latest approved brand profile while the underlying financial facts stay immutable.</p>

      <section className="card" aria-labelledby="invoice-documents-title">
        <div className="section-head"><div><h2 id="invoice-documents-title">Invoices</h2><p className="muted">Professional A4 layout with payment status and business identity.</p></div></div>
        {state.invoices.length === 0 ? <div className="quiet">Create an invoice in Finance and it will appear here.</div> : (
          <div className="table-scroll"><table className="records"><thead><tr><th>Reference</th><th>Customer</th><th>Issued</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {state.invoices.map((invoice) => {
              const html = invoiceDocumentHtml(invoice, branding, formatMoney);
              return <tr key={invoice.invoiceId}><td>{invoice.invoiceId.slice(0, 8)}</td><td>{invoice.customer}</td><td className="muted">{shortDate(invoice.issuedAt)}</td><td>{formatMoney(invoice.amount)}</td><td><span className={`tone ${invoice.paidAt ? "success" : "attention"}`}>{invoice.paidAt ? "Paid" : "Open"}</span></td><td><div className="row-actions"><button className="btn mini" onClick={() => preview(html)}>Preview / PDF</button><button className="btn subtle mini" onClick={() => download(html, `invoice-${invoice.invoiceId}`)}>Download</button></div></td></tr>;
            })}
          </tbody></table></div>
        )}
      </section>

      <section className="card" style={{ marginTop: 18 }} aria-labelledby="fulfillment-documents-title">
        <div className="section-head"><div><h2 id="fulfillment-documents-title">Fulfillment documents</h2><p className="muted">Price-free packing slips for the packing team and COD delivery notes for customer handover.</p></div></div>
        {fulfillmentOrders.length === 0 ? <div className="quiet">Confirm an order and its packing slip and delivery note will appear here.</div> : (
          <div className="table-scroll"><table className="records"><thead><tr><th>Reference</th><th>Customer</th><th>Stage</th><th>Courier / tracking</th><th>Actions</th></tr></thead><tbody>
            {fulfillmentOrders.map((order) => {
              const packingHtml = packingSlipDocumentHtml(order, branding);
              const deliveryHtml = deliveryNoteDocumentHtml(order, branding, formatMoney);
              return <tr key={order.orderId}><td>{order.orderId.slice(0, 8)}</td><td><strong>{order.customer}</strong>{order.shippingAddress && <div className="muted">{order.shippingAddress}</div>}</td><td><span className={`tone ${order.status === "delivered" ? "success" : order.status === "shipped" ? "info" : "attention"}`}>{order.status === "confirmed" ? "Ready to pack" : order.status === "shipped" ? "In delivery" : "Delivered"}</span></td><td>{order.courier || "—"}{order.trackingNumber && <div className="muted">{order.trackingNumber}</div>}</td><td><div className="row-actions"><button className="btn mini" onClick={() => preview(packingHtml)}>Packing slip</button><button className="btn subtle mini" onClick={() => preview(deliveryHtml)}>Delivery note</button><button className="link-btn" onClick={() => download(packingHtml, `packing-slip-${order.orderId}`)}>Download</button></div></td></tr>;
            })}
          </tbody></table></div>
        )}
      </section>

      <section className="card" style={{ marginTop: 18 }} aria-labelledby="credit-notes-title">
        <div className="section-head"><div><h2 id="credit-notes-title">Returns & credit notes</h2><p className="muted">Every partial or full refund creates its own immutable customer document.</p></div></div>
        {creditNotes.length === 0 ? <div className="quiet">Recorded order returns and refunds will produce credit notes here.</div> : (
          <div className="table-scroll"><table className="records"><thead><tr><th>Credit note</th><th>Order / customer</th><th>Date</th><th>Refund</th><th>Method</th><th>Actions</th></tr></thead><tbody>
            {creditNotes.map(({ order, record }) => {
              const html = creditNoteDocumentHtml(order, record, branding, formatMoney);
              return <tr key={record.returnId}><td>{record.returnId.slice(0, 8)}</td><td><strong>{order.orderId.slice(0, 8)}</strong><div className="muted">{order.customer}</div></td><td>{shortDate(record.at)}</td><td>{formatMoney(record.refundAmount)}</td><td>{record.refundMethod.replace(/_/g, " ")}</td><td><div className="row-actions"><button className="btn mini" onClick={() => preview(html)}>Preview / PDF</button><button className="btn subtle mini" onClick={() => download(html, `credit-note-${record.returnId}`)}>Download</button></div></td></tr>;
            })}
          </tbody></table></div>
        )}
      </section>

      <section className="card" style={{ marginTop: 18 }} aria-labelledby="receipt-documents-title">
        <div className="section-head"><div><h2 id="receipt-documents-title">Receipts</h2><p className="muted">Available only after delivery—the revenue-recognition boundary.</p></div></div>
        {receipts.length === 0 ? <div className="quiet">Delivered orders will produce receipts here.</div> : (
          <div className="table-scroll"><table className="records"><thead><tr><th>Reference</th><th>Customer</th><th>Order date</th><th>Total</th><th>Payment</th><th>Actions</th></tr></thead><tbody>
            {receipts.map((order) => {
              const html = receiptDocumentHtml(order, branding, formatMoney);
              return <tr key={order.orderId}><td>{order.orderId.slice(0, 8)}</td><td>{order.customer}</td><td className="muted">{shortDate(order.createdAt)}</td><td>{formatMoney(order.lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0) - order.discount + order.shippingCharged)}</td><td><span className={`tone ${order.cashReceivedAt ? "success" : "info"}`}>{order.cashReceivedAt ? "Received" : "Delivered"}</span></td><td><div className="row-actions"><button className="btn mini" onClick={() => preview(html)}>Preview / PDF</button><button className="btn subtle mini" onClick={() => download(html, `receipt-${order.orderId}`)}>Download</button></div></td></tr>;
            })}
          </tbody></table></div>
        )}
      </section>
    </div>
  );
}
