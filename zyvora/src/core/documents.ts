import { orderCashDue, orderGrossRevenue, orderRevenue } from "./projections";
import type { Invoice, InvoiceIssued, InvoiceLine, MemoryEvent, Order, OrderReturnRecorded, PurchaseOrder, Quote, WorkspaceState } from "./types";

export function calculateInvoiceTotals(lines: Pick<InvoiceLine, "qty" | "unitPrice">[], discount: number, taxRate: number) {
  const subtotal = lines.reduce((sum, line) => sum + Math.max(0, line.qty) * Math.max(0, line.unitPrice), 0);
  const appliedDiscount = Math.min(subtotal, Math.max(0, discount || 0));
  const appliedTaxRate = Math.min(100, Math.max(0, taxRate || 0));
  const taxable = subtotal - appliedDiscount;
  const taxAmount = taxable * appliedTaxRate / 100;
  return { subtotal, discount: appliedDiscount, taxRate: appliedTaxRate, taxAmount, total: taxable + taxAmount };
}

export function invoiceFromAcceptedQuote(quote: Quote, invoiceId: string, issuedAt: number): InvoiceIssued {
  return {
    invoiceId, customer: quote.customer, customerEmail: quote.customerEmail, customerAddress: quote.customerAddress,
    lines: quote.lines.map((line) => ({ ...line })), subtotal: quote.subtotal, discount: quote.discount,
    taxRate: quote.taxRate, taxAmount: quote.taxAmount, amount: quote.amount, notes: quote.notes,
    issuedAt, dueDays: 14, sourceQuoteId: quote.quoteId,
  };
}

export interface DocumentBranding {
  businessName: string;
  legalName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxId: string;
  registrationNumber: string;
  paymentDetails: string;
  footerNote: string;
  accentColor: string;
  logoDataUrl: string;
  logoFileName: string;
  logoWidth: number;
  logoHeight: number;
}

export const defaultDocumentBranding = (workspaceName: string): DocumentBranding => ({
  businessName: workspaceName,
  legalName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  taxId: "",
  registrationNumber: "",
  paymentDetails: "",
  footerNote: "Thank you for your business.",
  accentColor: "#13795b",
  logoDataUrl: "",
  logoFileName: "",
  logoWidth: 0,
  logoHeight: 0,
});

/** Latest append-only correction wins; previous branding remains auditable in Business Memory. */
export function projectDocumentBranding(events: readonly MemoryEvent[], workspaceName: string): DocumentBranding {
  let branding = defaultDocumentBranding(workspaceName);
  for (const event of events) {
    if (event.type !== "document_branding_updated") continue;
    const patch = event.payload as Partial<DocumentBranding>;
    branding = { ...branding, ...patch };
  }
  return branding;
}

const esc = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const nl = (value: string) => esc(value).replace(/\n/g, "<br>");

const date = (timestamp: number) => new Date(timestamp).toLocaleDateString(undefined, {
  day: "numeric", month: "long", year: "numeric",
});

const normalizeBranding = (input: string | Partial<DocumentBranding>): DocumentBranding => {
  const base = defaultDocumentBranding(typeof input === "string" ? input : input.businessName || "Business");
  return typeof input === "string" ? base : { ...base, ...input };
};

const safeAccent = (value: string) => /^#[0-9a-f]{6}$/i.test(value) ? value : "#13795b";
const safeLogo = (value: string) => /^data:image\/(?:png|webp|svg\+xml);base64,[a-z0-9+/=]+$/i.test(value) ? value : "";

const contactLine = (brand: DocumentBranding) => [brand.email, brand.phone].filter(Boolean).join(" · ");
const addressLine = (brand: DocumentBranding) => [brand.address, brand.city, brand.country].filter(Boolean).join(", ");

function shell(
  title: string,
  brandInput: string | Partial<DocumentBranding>,
  kind: string,
  reference: string,
  status: string,
  body: string,
): string {
  const brand = normalizeBranding(brandInput);
  const accent = safeAccent(brand.accentColor);
  const logo = safeLogo(brand.logoDataUrl);
  const legal = brand.legalName && brand.legalName !== brand.businessName ? brand.legalName : "";
  const registration = [
    brand.taxId && `Tax ID: ${brand.taxId}`,
    brand.registrationNumber && `Registration: ${brand.registrationNumber}`,
  ].filter(Boolean).join(" · ");
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>
@page{size:A4;margin:0}*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#e9eeeb;color:#17211e;font:14px/1.5 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.sheet{position:relative;width:min(820px,calc(100% - 32px));min-height:1080px;margin:32px auto;background:#fff;padding:58px 62px 46px;box-shadow:0 22px 60px rgba(17,34,27,.13);overflow:hidden}
.sheet:before{content:"";position:absolute;inset:0 0 auto;height:9px;background:${accent}}
.head{display:flex;justify-content:space-between;gap:38px;align-items:flex-start}.identity{min-width:0;max-width:54%}
.logo{display:block;max-width:190px;max-height:76px;width:auto;height:auto;object-fit:contain;object-position:left center;margin-bottom:17px}
.brand{font-size:24px;font-weight:800;letter-spacing:-.025em;color:#11221c}.legal{margin-top:3px;color:#66736e;font-size:12px}
.brand-lines{margin-top:13px;color:#53615c;font-size:12.5px}.brand-lines div+div{margin-top:2px}
.doc{text-align:right}.kind{font-size:34px;line-height:1;font-weight:780;letter-spacing:-.04em;text-transform:uppercase;color:#17211e}
.ref{margin-top:13px;color:#66736e;font-size:12px}.ref strong{display:block;color:#17211e;font-size:14px;letter-spacing:.02em}.status{display:inline-flex;margin-top:14px;padding:6px 11px;border-radius:999px;background:${accent}16;color:${accent};border:1px solid ${accent}35;font-size:11px;font-weight:750;letter-spacing:.055em;text-transform:uppercase}
.rule{height:1px;background:#dfe6e2;margin:34px 0}.parties{display:grid;grid-template-columns:1fr 1fr;gap:44px;margin-bottom:34px}.label{color:#78847f;font-size:10.5px;font-weight:760;text-transform:uppercase;letter-spacing:.1em;margin-bottom:7px}.party strong{display:block;font-size:15px}.party p{margin:4px 0 0;color:#5f6d68}
table{width:100%;border-collapse:collapse;margin:0}th{padding:10px 12px;background:#f3f6f4;color:#66736e;font-size:10.5px;text-transform:uppercase;letter-spacing:.075em;text-align:left;border-top:1px solid #dfe6e2;border-bottom:1px solid #dfe6e2}td{padding:16px 12px;border-bottom:1px solid #e6ebe8;color:#27342f}.num{text-align:right;font-variant-numeric:tabular-nums}.description{font-weight:650}.summary{width:min(330px,100%);margin:22px 0 0 auto}.summary-row{display:flex;justify-content:space-between;gap:24px;padding:7px 12px;color:#66736e}.summary-row.total{margin-top:6px;padding:15px 12px;border-top:2px solid #17211e;color:#17211e;font-size:18px;font-weight:800}
.notes{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:44px}.note{padding-top:14px;border-top:1px solid #dfe6e2;color:#53615c;font-size:12.5px}.note strong{display:block;color:#27342f;margin-bottom:5px;font-size:11px;text-transform:uppercase;letter-spacing:.07em}
.statement-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:0 0 30px}.statement-metric{padding:16px;border:1px solid #dfe6e2;border-radius:10px;background:#f8faf9}.statement-metric span{display:block;color:#78847f;font-size:10px;font-weight:760;text-transform:uppercase;letter-spacing:.08em}.statement-metric strong{display:block;margin-top:5px;font-size:19px;color:#17211e}
.check{display:inline-block;width:17px;height:17px;border:1.5px solid #87928e;border-radius:3px;vertical-align:middle}.signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:42px;margin-top:58px}.signature{min-height:70px;border-bottom:1px solid #7f8b86;color:#66736e;font-size:11px;display:flex;align-items:flex-end;padding-bottom:7px}
.footer{position:absolute;left:62px;right:62px;bottom:38px;padding-top:14px;border-top:1px solid #dfe6e2;display:flex;justify-content:space-between;gap:24px;color:#77837e;font-size:10.5px}.footer strong{color:#3f4c47}.audit{text-align:right}
.actions{display:flex;justify-content:center;margin:0 auto 30px}.actions button{border:0;border-radius:9px;background:${accent};color:#fff;padding:11px 18px;font-weight:750;cursor:pointer;box-shadow:0 5px 16px ${accent}35}
@media(max-width:600px){.sheet{margin:0;width:100%;min-height:100vh;padding:38px 22px 100px;box-shadow:none}.head{display:block}.identity{max-width:100%}.doc{text-align:left;margin-top:34px}.kind{font-size:29px}.parties,.notes,.signature-grid,.statement-grid{grid-template-columns:1fr;gap:24px}.footer{left:22px;right:22px;bottom:24px;display:block}.audit{text-align:left;margin-top:5px}.table-wrap{overflow-x:auto}.logo{max-width:170px}}
@media print{body{background:#fff}.sheet{box-shadow:none;margin:0;width:100%;min-height:297mm;padding:18mm 17mm 16mm}.sheet:before{height:3mm}.footer{left:17mm;right:17mm;bottom:12mm}.actions{display:none}}
</style></head><body><main class="sheet"><header class="head"><section class="identity">
${logo ? `<img class="logo" src="${esc(logo)}" alt="${esc(brand.businessName)} logo">` : `<div class="brand">${esc(brand.businessName)}</div>`}
${logo ? `<div class="brand">${esc(brand.businessName)}</div>` : ""}${legal ? `<div class="legal">${esc(legal)}</div>` : ""}
<div class="brand-lines">${addressLine(brand) ? `<div>${esc(addressLine(brand))}</div>` : ""}${contactLine(brand) ? `<div>${esc(contactLine(brand))}</div>` : ""}${registration ? `<div>${esc(registration)}</div>` : ""}</div>
</section><section class="doc"><div class="kind">${esc(kind)}</div><div class="ref">Document reference<strong>${esc(reference)}</strong></div><span class="status">${esc(status)}</span></section></header><div class="rule"></div>${body}
<footer class="footer"><div><strong>${esc(brand.businessName)}</strong>${contactLine(brand) ? ` · ${esc(contactLine(brand))}` : ""}</div><div class="audit">Generated from ZYVORA Business Memory</div></footer></main><div class="actions"><button onclick="window.print()">Print / Save PDF</button></div></body></html>`;
}

export function invoiceDocumentHtml(invoice: Invoice, branding: string | Partial<DocumentBranding>, money: (amount: number) => string): string {
  const brand = normalizeBranding(branding);
  const dueAt = invoice.issuedAt + invoice.dueDays * 86_400_000;
  const status = invoice.paidAt ? "Paid" : "Payment due";
  const lines = invoice.lines?.length ? invoice.lines : [{ lineId: "legacy", description: "Goods or services supplied", qty: 1, unitPrice: invoice.amount }];
  const rows = lines.map((line) => `<tr><td class="description">${esc(line.description)}</td><td class="num">${esc(line.qty)}</td><td class="num">${esc(money(line.unitPrice))}</td><td class="num">${esc(money(line.qty * line.unitPrice))}</td></tr>`).join("");
  const subtotal = invoice.subtotal ?? lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
  const discount = invoice.discount ?? 0;
  const taxAmount = invoice.taxAmount ?? 0;
  return shell(`Invoice ${invoice.invoiceId}`, brand, "Invoice", invoice.invoiceId, status, `
    <section class="parties"><div class="party"><div class="label">Bill to</div><strong>${esc(invoice.customer)}</strong>${invoice.customerEmail ? `<p>${esc(invoice.customerEmail)}</p>` : ""}${invoice.customerAddress ? `<p>${nl(invoice.customerAddress)}</p>` : ""}</div><div class="party"><div class="label">Invoice details</div><p>Issued <strong>${esc(date(invoice.issuedAt))}</strong></p><p>${invoice.paidAt ? `Paid <strong>${esc(date(invoice.paidAt))}</strong>` : `Due <strong>${esc(date(dueAt))}</strong>`}</p></div></section>
    <div class="table-wrap"><table><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table></div>
    <section class="summary"><div class="summary-row"><span>Subtotal</span><span>${esc(money(subtotal))}</span></div>${discount ? `<div class="summary-row"><span>Discount</span><span>−${esc(money(discount))}</span></div>` : ""}${taxAmount ? `<div class="summary-row"><span>Tax${invoice.taxRate ? ` (${esc(invoice.taxRate)}%)` : ""}</span><span>${esc(money(taxAmount))}</span></div>` : ""}<div class="summary-row total"><span>Total</span><span>${esc(money(invoice.amount))}</span></div></section>
    <section class="notes">${brand.paymentDetails ? `<div class="note"><strong>Payment details</strong>${nl(brand.paymentDetails)}</div>` : `<div class="note"><strong>Payment</strong>${invoice.paidAt ? "Payment received in full." : `Please pay by ${esc(date(dueAt))}.`}</div>`}<div class="note"><strong>Note</strong>${nl(invoice.notes || brand.footerNote || "Thank you for your business.")}</div></section>`);
}

export function quoteDocumentHtml(quote: Quote, branding: string | Partial<DocumentBranding>, money: (amount: number) => string): string {
  const brand = normalizeBranding(branding);
  const rows = quote.lines.map((line) => `<tr><td class="description">${esc(line.description)}</td><td class="num">${esc(line.qty)}</td><td class="num">${esc(money(line.unitPrice))}</td><td class="num">${esc(money(line.qty * line.unitPrice))}</td></tr>`).join("");
  const status = quote.status === "accepted" ? "Accepted" : quote.status === "declined" ? "Declined" : quote.status === "converted" ? "Converted" : `Valid until ${date(quote.validUntil)}`;
  return shell(`Estimate ${quote.quoteId}`, brand, "Estimate", quote.quoteId, status, `
    <section class="parties"><div class="party"><div class="label">Prepared for</div><strong>${esc(quote.customer)}</strong>${quote.customerEmail ? `<p>${esc(quote.customerEmail)}</p>` : ""}${quote.customerAddress ? `<p>${nl(quote.customerAddress)}</p>` : ""}</div><div class="party"><div class="label">Estimate details</div><p>Prepared <strong>${esc(date(quote.createdAt))}</strong></p><p>Valid until <strong>${esc(date(quote.validUntil))}</strong></p></div></section>
    <div class="table-wrap"><table><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table></div>
    <section class="summary"><div class="summary-row"><span>Subtotal</span><span>${esc(money(quote.subtotal))}</span></div>${quote.discount ? `<div class="summary-row"><span>Discount</span><span>−${esc(money(quote.discount))}</span></div>` : ""}${quote.taxAmount ? `<div class="summary-row"><span>Tax${quote.taxRate ? ` (${esc(quote.taxRate)}%)` : ""}</span><span>${esc(money(quote.taxAmount))}</span></div>` : ""}<div class="summary-row total"><span>Estimated total</span><span>${esc(money(quote.amount))}</span></div></section>
    <section class="notes"><div class="note"><strong>Terms</strong>This estimate is valid until ${esc(date(quote.validUntil))}. Acceptance does not record revenue; an invoice is created separately.</div><div class="note"><strong>Note</strong>${nl(quote.notes || brand.footerNote || "Thank you for considering our offer.")}</div></section>`);
}

export function receiptDocumentHtml(order: Order, branding: string | Partial<DocumentBranding>, money: (amount: number) => string): string {
  const brand = normalizeBranding(branding);
  const rows = order.lines.map((line) => `<tr><td class="description">${esc(line.productName)}<div style="font-weight:400;color:#78847f;font-size:12px">${esc(line.qty)} × ${esc(money(line.unitPrice))}</div></td><td class="num">${esc(money(line.qty * line.unitPrice))}</td></tr>`).join("");
  const total = orderRevenue(order);
  const gross = orderGrossRevenue(order);
  return shell(`Receipt ${order.orderId}`, brand, "Receipt", order.orderId, "Delivered", `
    <section class="parties"><div class="party"><div class="label">Received from</div><strong>${esc(order.customer)}</strong></div><div class="party"><div class="label">Order details</div><p>Order date <strong>${esc(date(order.createdAt))}</strong></p><p>${order.cashReceivedAt ? `Payment received <strong>${esc(date(order.cashReceivedAt))}</strong>` : "Delivery completed"}</p></div></section>
    <div class="table-wrap"><table><thead><tr><th>Item</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table></div>
    <section class="summary">${order.discount ? `<div class="summary-row"><span>Discount</span><span>−${esc(money(order.discount))}</span></div>` : ""}${order.shippingCharged ? `<div class="summary-row"><span>Shipping</span><span>${esc(money(order.shippingCharged))}</span></div>` : ""}${order.storeCreditApplied ? `<div class="summary-row"><span>Store credit used</span><span>${esc(money(order.storeCreditApplied))}</span></div><div class="summary-row"><span>Cash payment</span><span>${esc(money(orderCashDue(order)))}</span></div>` : ""}${order.refundAmount ? `<div class="summary-row"><span>Original total</span><span>${esc(money(gross))}</span></div><div class="summary-row"><span>Refunded</span><span>−${esc(money(order.refundAmount))}</span></div>` : ""}<div class="summary-row total"><span>${order.refundAmount ? "Net purchase value" : "Total paid"}</span><span>${esc(money(total))}</span></div></section>
    <section class="notes"><div class="note"><strong>Payment status</strong>${order.cashReceivedAt ? "Payment received in full." : "Delivered — collection pending."}</div><div class="note"><strong>Note</strong>${nl(brand.footerNote || "Thank you for your business.")}</div></section>`);
}

/** A customer-facing activity statement. It keeps amount due and store credit separate. */
export function customerStatementDocumentHtml(
  state: Pick<WorkspaceState, "invoices" | "orders" | "storeCreditBalances" | "storeCreditTransactions">,
  customer: string,
  branding: string | Partial<DocumentBranding>,
  money: (amount: number) => string,
  contact?: { phone?: string; city?: string },
  generatedAt = Date.now(),
): string {
  const brand = normalizeBranding(branding);
  const invoices = state.invoices.filter((invoice) => invoice.customer === customer);
  const orders = state.orders.filter((order) => order.customer === customer && order.status === "delivered");
  const transactions = state.storeCreditTransactions.filter((transaction) => transaction.customer === customer);
  const openInvoices = invoices.filter((invoice) => !invoice.paidAt).reduce((sum, invoice) => sum + invoice.amount, 0);
  const netPurchases = orders.reduce((sum, order) => sum + orderRevenue(order), 0);
  const storeCredit = state.storeCreditBalances[customer] ?? 0;
  const rows: { at: number; activity: string; reference: string; amount: string; status: string }[] = [];
  for (const invoice of invoices) rows.push({ at: invoice.issuedAt, activity: "Invoice", reference: invoice.invoiceId, amount: money(invoice.amount), status: invoice.paidAt ? "Paid" : "Open" });
  for (const order of orders) {
    rows.push({ at: order.deliveredAt ?? order.createdAt, activity: "Delivered order", reference: order.orderId, amount: money(orderGrossRevenue(order)), status: order.cashReceivedAt ? "Paid" : orderCashDue(order) === 0 ? "Store credit" : "COD pending" });
    for (const record of order.returnRecords ?? []) if (record.refundAmount > 0) rows.push({ at: record.at, activity: "Refund", reference: record.returnId, amount: `−${money(record.refundAmount)}`, status: record.refundMethod.replace(/_/g, " ") });
  }
  for (const transaction of transactions) {
    const signed = transaction.kind === "redeemed" ? -transaction.amount : transaction.amount;
    rows.push({ at: transaction.at, activity: transaction.kind === "issued" ? "Store credit issued" : transaction.kind === "redeemed" ? "Store credit used" : transaction.kind === "released" ? "Store credit restored" : transaction.reason || "Store credit adjustment", reference: transaction.orderId ?? transaction.transactionId, amount: `${signed < 0 ? "−" : "+"}${money(Math.abs(signed))}`, status: "Credit ledger" });
  }
  rows.sort((a, b) => b.at - a.at);
  const activityRows = rows.length ? rows.map((row) => `<tr><td>${esc(date(row.at))}</td><td class="description">${esc(row.activity)}</td><td>${esc(row.reference.slice(0, 12))}</td><td class="num">${esc(row.amount)}</td><td>${esc(row.status)}</td></tr>`).join("") : `<tr><td colspan="5">No financial activity recorded.</td></tr>`;
  const reference = `STMT-${new Date(generatedAt).toISOString().slice(0, 10)}-${customer.replace(/[^a-z0-9]/gi, "").slice(0, 10).toUpperCase() || "CUSTOMER"}`;
  return shell(`Account statement ${customer}`, brand, "Account statement", reference, "Current", `
    <section class="parties"><div class="party"><div class="label">Statement for</div><strong>${esc(customer)}</strong>${contact?.phone ? `<p>${esc(contact.phone)}</p>` : ""}${contact?.city ? `<p>${esc(contact.city)}</p>` : ""}</div><div class="party"><div class="label">Statement details</div><p>Generated <strong>${esc(date(generatedAt))}</strong></p><p>${rows.length} recorded activit${rows.length === 1 ? "y" : "ies"}</p></div></section>
    <section class="statement-grid"><div class="statement-metric"><span>Open invoices due</span><strong>${esc(money(openInvoices))}</strong></div><div class="statement-metric"><span>Net delivered purchases</span><strong>${esc(money(netPurchases))}</strong></div><div class="statement-metric"><span>Store credit available</span><strong>${esc(money(storeCredit))}</strong></div></section>
    <div class="table-wrap"><table><thead><tr><th>Date</th><th>Activity</th><th>Reference</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>${activityRows}</tbody></table></div>
    <section class="notes"><div class="note"><strong>Amount currently due</strong>${esc(money(openInvoices))} from open invoices. Delivered COD orders are shown separately and are not added twice.</div><div class="note"><strong>Store credit</strong>${esc(money(storeCredit))} is available for future orders and is not cash owed to the business.</div></section>`);
}

export function purchaseOrderDocumentHtml(
  purchaseOrder: PurchaseOrder,
  branding: string | Partial<DocumentBranding>,
  money: (amount: number) => string,
): string {
  const brand = normalizeBranding(branding);
  const total = purchaseOrder.lines.reduce((sum, line) => sum + line.qty * line.unitCost, 0);
  const receivedUnits = purchaseOrder.lines.reduce((sum, line, index) => sum + Math.min(line.qty, purchaseOrder.receivedQtyByLine?.[String(index)] ?? 0), 0);
  const orderedUnits = purchaseOrder.lines.reduce((sum, line) => sum + line.qty, 0);
  const rows = purchaseOrder.lines.map((line, index) => { const received = Math.min(line.qty, purchaseOrder.receivedQtyByLine?.[String(index)] ?? 0); return `<tr><td class="description">${esc(line.productName)}</td><td class="num">${esc(line.qty)}</td><td class="num">${esc(received)}</td><td class="num">${esc(line.qty - received)}</td><td class="num">${esc(money(line.unitCost))}</td><td class="num">${esc(money(line.qty * line.unitCost))}</td></tr>`; }).join("");
  const status = purchaseOrder.receivedAt ? "Received" : receivedUnits > 0 ? "Partially received" : purchaseOrder.expectedAt && purchaseOrder.expectedAt < Date.now() ? "Arrival overdue" : "Open";
  return shell(`Purchase order ${purchaseOrder.poId}`, brand, "Purchase order", purchaseOrder.poId, status, `
    <section class="parties"><div class="party"><div class="label">Supplier</div><strong>${esc(purchaseOrder.supplier)}</strong>${purchaseOrder.supplierEmail ? `<p>${esc(purchaseOrder.supplierEmail)}</p>` : ""}${purchaseOrder.supplierAddress ? `<p>${nl(purchaseOrder.supplierAddress)}</p>` : ""}</div><div class="party"><div class="label">Purchase order details</div><p>Created <strong>${esc(date(purchaseOrder.createdAt))}</strong></p>${purchaseOrder.expectedAt ? `<p>Expected arrival <strong>${esc(date(purchaseOrder.expectedAt))}</strong></p>` : ""}${purchaseOrder.receivedAt ? `<p>Received <strong>${esc(date(purchaseOrder.receivedAt))}</strong></p>` : ""}</div></section>
    <div class="table-wrap"><table><thead><tr><th>Item ordered</th><th class="num">Ordered</th><th class="num">Received</th><th class="num">Remaining</th><th class="num">Unit cost</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table></div>
    <section class="summary"><div class="summary-row total"><span>Purchase order total</span><span>${esc(money(total))}</span></div></section>
    <section class="notes"><div class="note"><strong>Receiving progress</strong>${esc(receivedUnits)} of ${esc(orderedUnits)} units received${purchaseOrder.lastReceivedAt ? ` · last receipt ${esc(date(purchaseOrder.lastReceivedAt))}` : ""}.</div><div class="note"><strong>Payment terms</strong>${nl(purchaseOrder.paymentTerms || "Not specified")}</div><div class="note"><strong>Instructions</strong>${nl(purchaseOrder.notes || "Please confirm availability and expected arrival.")}</div></section>`);
}

/** Pending orders are not operationally ready to pack or hand to a courier. */
export function canGenerateFulfillmentDocuments(order: Pick<Order, "status" | "returnStatus">): boolean {
  return order.returnStatus !== "returned" && (order.status === "confirmed" || order.status === "shipped" || order.status === "delivered");
}

const fulfillmentStatus = (order: Order) => order.status === "delivered" ? "Delivered" : order.status === "shipped" ? "In delivery" : "Ready to pack";
const deliveryRecipient = (order: Order) => `<div class="party"><div class="label">Deliver to</div><strong>${esc(order.customer)}</strong>${order.customerPhone ? `<p>${esc(order.customerPhone)}</p>` : ""}${order.shippingAddress ? `<p>${nl(order.shippingAddress)}</p>` : ""}</div>`;
const fulfillmentDetails = (order: Order) => `<div class="party"><div class="label">Fulfillment details</div><p>Order date <strong>${esc(date(order.createdAt))}</strong></p>${order.courier ? `<p>Courier <strong>${esc(order.courier)}</strong></p>` : ""}${order.trackingNumber ? `<p>Tracking <strong>${esc(order.trackingNumber)}</strong></p>` : ""}</div>`;

export function packingSlipDocumentHtml(order: Order, branding: string | Partial<DocumentBranding>): string {
  const brand = normalizeBranding(branding);
  const rows = order.lines.map((line) => `<tr><td style="width:38px"><span class="check" aria-hidden="true"></span></td><td class="description">${esc(line.productName)}</td><td class="num"><strong>${esc(line.qty)}</strong></td></tr>`).join("");
  return shell(`Packing slip ${order.orderId}`, brand, "Packing slip", order.orderId, fulfillmentStatus(order), `
    <section class="parties">${deliveryRecipient(order)}${fulfillmentDetails(order)}</section>
    <div class="table-wrap"><table><thead><tr><th aria-label="Packed"></th><th>Item to pack</th><th class="num">Quantity</th></tr></thead><tbody>${rows}</tbody></table></div>
    <section class="notes"><div class="note"><strong>Packing check</strong>Check every item and quantity before sealing the package.</div><div class="note"><strong>Delivery instructions</strong>${order.deliveryInstructions ? nl(order.deliveryInstructions) : "No special instructions."}</div></section>`);
}

export function deliveryNoteDocumentHtml(order: Order, branding: string | Partial<DocumentBranding>, money: (amount: number) => string): string {
  const brand = normalizeBranding(branding);
  const rows = order.lines.map((line) => `<tr><td class="description">${esc(line.productName)}</td><td class="num"><strong>${esc(line.qty)}</strong></td></tr>`).join("");
  const total = orderCashDue(order);
  return shell(`Delivery note ${order.orderId}`, brand, "Delivery note", order.orderId, fulfillmentStatus(order), `
    <section class="parties">${deliveryRecipient(order)}${fulfillmentDetails(order)}</section>
    <div class="table-wrap"><table><thead><tr><th>Delivered item</th><th class="num">Quantity</th></tr></thead><tbody>${rows}</tbody></table></div>
    <section class="summary"><div class="summary-row total"><span>${order.cashReceivedAt ? "Payment" : "COD amount due"}</span><span>${order.cashReceivedAt ? "Received" : esc(money(total))}</span></div></section>
    <section class="notes"><div class="note"><strong>Delivery instructions</strong>${order.deliveryInstructions ? nl(order.deliveryInstructions) : "No special instructions."}</div><div class="note"><strong>Handover</strong>Please verify the parcel before acknowledgment.</div></section>
    <section class="signature-grid"><div class="signature">Customer name and signature</div><div class="signature">Delivered at (date and time)</div></section>`);
}

export function creditNoteDocumentHtml(order: Order, record: OrderReturnRecorded, branding: string | Partial<DocumentBranding>, money: (amount: number) => string): string {
  const brand = normalizeBranding(branding);
  const humanize = (value: string) => value.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
  const rows = record.lines.length
    ? record.lines.map((line) => `<tr><td class="description">${esc(line.productName)}</td><td class="num">${esc(line.qty)}</td><td class="num">${esc(money(line.unitPrice))}</td><td class="num">${esc(money(line.qty * line.unitPrice))}</td></tr>`).join("")
    : `<tr><td class="description">Refund adjustment</td><td class="num">—</td><td class="num">—</td><td class="num">${esc(money(record.refundAmount))}</td></tr>`;
  return shell(`Credit note ${record.returnId}`, brand, "Credit note", record.returnId, record.refundAmount > 0 ? "Refund recorded" : "Items returned", `
    <section class="parties"><div class="party"><div class="label">Credit issued to</div><strong>${esc(order.customer)}</strong>${order.customerPhone ? `<p>${esc(order.customerPhone)}</p>` : ""}${order.shippingAddress ? `<p>${nl(order.shippingAddress)}</p>` : ""}</div><div class="party"><div class="label">Related order</div><p>Order <strong>${esc(order.orderId)}</strong></p><p>Return date <strong>${esc(date(record.at))}</strong></p><p>Reason <strong>${esc(humanize(record.reason))}</strong></p></div></section>
    <div class="table-wrap"><table><thead><tr><th>Returned item / adjustment</th><th class="num">Qty</th><th class="num">Unit value</th><th class="num">Value</th></tr></thead><tbody>${rows}</tbody></table></div>
    <section class="summary"><div class="summary-row"><span>Original order</span><span>${esc(money(orderGrossRevenue(order)))}</span></div><div class="summary-row total"><span>Refund</span><span>${esc(money(record.refundAmount))}</span></div></section>
    <section class="notes"><div class="note"><strong>Refund method</strong>${esc(humanize(record.refundMethod))}</div><div class="note"><strong>Note</strong>${nl(record.note || `Credit recorded for ${humanize(record.reason).toLowerCase()}.`)}</div></section>`);
}
