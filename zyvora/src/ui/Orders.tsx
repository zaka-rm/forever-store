/**
 * Orders — the Commerce Domain surface (Wave 1; ZPL-040 §4, ZPL-041 §3).
 * COD lifecycle: pending → confirmed → shipped → delivered → (cash received | returned),
 * with refusal and cancellation paths. Revenue is recognized on delivery only.
 * Margin guard: an order projected to lose money warns before creation (ZPL-041 §17).
 * Canonical (governance/): CAP-000006 Inventory FEAT-000044 reservations;
 * CAP-000005 Finance FEAT-000035 invoicing; CAP-000009 Documents FEAT-000067 generation.
 */
import { Fragment, useEffect, useState } from "react";
import { consumeDeepLink } from "../core/deepLink";
import { formatMoney } from "../core/engine";
import { getActiveCurrency } from "../core/format";
import type { MemoryStore } from "../core/memory";
import {
  checkPromo,
  orderCogs,
  orderCashDue,
  orderGrossRevenue,
  orderLinesTotal,
  orderNetProfit,
  orderRevenue,
  projectContacts,
} from "../core/projections";
import { upsellSuggestion } from "../core/retention";
import { RISK_TONE, refusalRisk } from "../core/risk";
import { storyForOrder } from "../core/story";
import { extractOrderFromImage, visionConfigured } from "../core/llm";
import { codConfirmationText, messagingConfigured, recordSentMessage, sendMessage } from "../core/messaging";
import type { Order, OrderLine, OrderReturnRecorded, OrderStatus, RefundMethod, WorkspaceState } from "../core/types";
import { toast } from "./toast";
import { appAlert, appConfirm } from "./dialog";
import { PageHeader } from "./PageHeader";
import { CourierControlPanel } from "./CourierControl";

/** Open a clean, printable receipt for an order in a new window (ZPL-041 §21). */
function printReceipt(o: Order, business: string) {
  const money = (n: number) => formatMoney(n);
  const lines = o.lines
    .map(
      (l) =>
        `<tr><td>${l.qty}× ${l.productName}</td><td style="text-align:right">${money(l.qty * l.unitPrice)}</td></tr>`
    )
    .join("");
  const linesTotal = o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const when = new Date(o.createdAt).toLocaleDateString();
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt — ${o.customer}</title>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#23302c;max-width:420px;margin:32px auto;padding:0 20px}
    h1{font-size:20px;letter-spacing:.12em;margin:0 0 2px}
    .muted{color:#5c6b66;font-size:13px}
    table{width:100%;border-collapse:collapse;margin:18px 0;font-size:14px}
    td{padding:6px 0;border-bottom:1px solid #e4e2da}
    .tot td{border:none;padding-top:4px}
    .grand td{font-weight:700;font-size:16px;border-top:2px solid #23302c;padding-top:10px}
    .foot{margin-top:24px;text-align:center;color:#5c6b66;font-size:12px}
    @media print{button{display:none}}
  </style></head><body>
  <h1>${business.toUpperCase()}</h1>
  <div class="muted">Receipt · ${when}</div>
  <div class="muted">Customer: ${o.customer}</div>
  <table><tbody>${lines}</tbody></table>
  <table class="tot"><tbody>
    <tr><td>Subtotal</td><td style="text-align:right">${money(linesTotal)}</td></tr>
    ${o.discount ? `<tr><td>Discount${o.promoCode ? ` (${o.promoCode})` : ""}</td><td style="text-align:right">−${money(o.discount)}</td></tr>` : ""}
    ${o.shippingCharged ? `<tr><td>Shipping</td><td style="text-align:right">${money(o.shippingCharged)}</td></tr>` : ""}
    <tr class="grand"><td>Total</td><td style="text-align:right">${money(orderRevenue(o))}</td></tr>
  </tbody></table>
  <div class="foot">Thank you — ${business}</div>
  <div style="text-align:center;margin-top:20px"><button onclick="window.print()">Print</button></div>
  </body></html>`;
  const w = window.open("", "_blank", "width=480,height=640");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

const dateLabel = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending confirmation",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  refused: "Refused (COD)",
  cancelled: "Cancelled",
  returned: "Returned",
};

/* Status tone chips (commerce-admin pattern): success = money landed,
   attention = needs a human, info = in motion, critical = value lost. */
const STATUS_TONE: Record<OrderStatus, "success" | "attention" | "info" | "critical"> = {
  pending: "attention",
  confirmed: "info",
  shipped: "info",
  delivered: "success",
  refused: "critical",
  cancelled: "critical",
  returned: "critical",
};

/* Index filter tabs (resource-index pattern). "Needs action" is the ZYVORA twist:
   everything waiting on a human — unconfirmed orders and uncollected courier cash. */
type OrderTab = "all" | "action" | "transit" | "delivered" | "closed";
const ORDER_TABS: { id: OrderTab; label: string; match: (o: Order) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  {
    id: "action",
    label: "Needs action",
    match: (o) => o.status === "pending" || (o.status === "delivered" && !o.cashReceivedAt),
  },
  { id: "transit", label: "In progress", match: (o) => o.status === "confirmed" || o.status === "shipped" },
  { id: "delivered", label: "Delivered", match: (o) => o.status === "delivered" },
  {
    id: "closed",
    label: "Refused/Closed",
    match: (o) => o.status === "refused" || o.status === "cancelled" || o.status === "returned",
  },
];

/** Allowed transitions (ZPL-041 §3). */
const NEXT: Record<OrderStatus, { to: OrderStatus; label: string }[]> = {
  pending: [
    { to: "confirmed", label: "Confirm" },
    { to: "cancelled", label: "Cancel" },
  ],
  confirmed: [
    { to: "shipped", label: "Ship" },
    { to: "cancelled", label: "Cancel" },
  ],
  shipped: [
    { to: "delivered", label: "Delivered" },
    { to: "refused", label: "Refused at door" },
  ],
  delivered: [],
  refused: [],
  cancelled: [],
  returned: [],
};

function ReturnRefundPanel({ order, memory, onClose }: { order: Order; memory: MemoryStore; onClose: () => void }) {
  const remainingByLine = order.lines.map((line, index) => Math.max(0, line.qty - (order.returnedQtyByLine?.[String(index)] ?? 0)));
  const [quantities, setQuantities] = useState(() => remainingByLine.map(() => "0"));
  const [restock, setRestock] = useState(() => remainingByLine.map(() => true));
  const [refundAmount, setRefundAmount] = useState("0");
  const [refundEdited, setRefundEdited] = useState(false);
  const [returnShippingCost, setReturnShippingCost] = useState("0");
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("cash");
  const [reason, setReason] = useState("changed_mind");
  const [note, setNote] = useState("");
  const selectedValue = quantities.reduce((sum, raw, index) => sum + Math.min(remainingByLine[index], Math.max(0, parseInt(raw, 10) || 0)) * order.lines[index].unitPrice, 0);
  const refundable = Math.max(0, orderGrossRevenue(order) - (order.refundAmount ?? 0));
  const refund = Math.min(refundable, Math.max(0, Number(refundAmount) || 0));
  const selectedUnits = quantities.reduce((sum, raw, index) => sum + Math.min(remainingByLine[index], Math.max(0, parseInt(raw, 10) || 0)), 0);

  const changeQty = (index: number, value: string) => {
    const next = [...quantities];
    next[index] = value;
    setQuantities(next);
    if (!refundEdited) {
      const valueTotal = next.reduce((sum, raw, lineIndex) => sum + Math.min(remainingByLine[lineIndex], Math.max(0, parseInt(raw, 10) || 0)) * order.lines[lineIndex].unitPrice, 0);
      setRefundAmount(String(Math.min(refundable, valueTotal)));
    }
  };

  const submit = async () => {
    const lines: OrderReturnRecorded["lines"] = order.lines.flatMap((line, index) => {
      const qty = Math.min(remainingByLine[index], Math.max(0, parseInt(quantities[index], 10) || 0));
      return qty > 0 ? [{ orderLineIndex: index, productId: line.productId, productName: line.productName, qty, unitPrice: line.unitPrice, unitCost: line.unitCost, restock: restock[index] }] : [];
    });
    if (lines.length === 0 && refund === 0) { toast("Select returned items or enter a refund amount."); return; }
    const ok = await appConfirm({
      title: "Record this return and refund?",
      body: `${selectedUnits} unit(s) returned · ${formatMoney(refund)} refunded · ${formatMoney(Number(returnShippingCost) || 0)} return cost. This creates an auditable credit note and cannot be silently edited.`,
      confirmLabel: "Record return",
      danger: true,
    });
    if (!ok) return;
    memory.append("fact", "order_return_recorded", {
      returnId: crypto.randomUUID(), orderId: order.orderId, lines, refundAmount: refund, refundMethod,
      returnShippingCost: Math.max(0, Number(returnShippingCost) || 0), reason, ...(note.trim() ? { note: note.trim() } : {}), at: Date.now(),
    });
    toast(`Return recorded — ${formatMoney(refund)} refunded`);
    onClose();
  };

  return <section className="card return-refund-panel" aria-labelledby="return-refund-title">
    <div className="section-head"><div><h2 id="return-refund-title">Return or refund · {order.customer}</h2><p className="muted">Choose only the units received back. Restock sellable items; keep damaged items out of inventory.</p></div><button className="btn subtle mini" onClick={onClose}>Close</button></div>
    <div className="table-scroll"><table className="records"><thead><tr><th>Item</th><th>Remaining</th><th>Return qty</th><th>Inventory</th></tr></thead><tbody>{order.lines.map((line, index) => <tr key={`${line.productId}-${index}`}><td><strong>{line.productName}</strong><div className="muted">{formatMoney(line.unitPrice)} each</div></td><td>{remainingByLine[index]}</td><td><input aria-label={`Return quantity for ${line.productName}`} type="number" min="0" max={remainingByLine[index]} value={quantities[index]} onChange={(event) => changeQty(index, event.target.value)} style={{ width: 78 }} /></td><td><label className="return-restock"><input type="checkbox" checked={restock[index]} onChange={(event) => setRestock((current) => current.map((value, i) => i === index ? event.target.checked : value))} /> Restock as sellable</label></td></tr>)}</tbody></table></div>
    <div className="return-form-grid">
      <label><span>Refund amount</span><input type="number" min="0" max={refundable} step="0.01" value={refundAmount} onChange={(event) => { setRefundEdited(true); setRefundAmount(event.target.value); }} /><small>Maximum remaining: {formatMoney(refundable)} · selected item value: {formatMoney(selectedValue)}</small></label>
      <label><span>Refund method</span><select value={refundMethod} onChange={(event) => setRefundMethod(event.target.value as RefundMethod)}><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="store_credit">Store credit</option><option value="other">Other</option></select></label>
      <label><span>Return shipping cost</span><input type="number" min="0" step="0.01" value={returnShippingCost} onChange={(event) => setReturnShippingCost(event.target.value)} /></label>
      <label><span>Reason</span><select value={reason} onChange={(event) => setReason(event.target.value)}><option value="changed_mind">Customer changed mind</option><option value="damaged">Damaged product</option><option value="wrong_item">Wrong item</option><option value="delivery_issue">Delivery issue</option><option value="other">Other</option></select></label>
      <label className="wide"><span>Internal note</span><textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Inspection result or customer agreement…" /></label>
    </div>
    <div className="return-summary"><div><span>Refund</span><strong>{formatMoney(refund)}</strong></div><div><span>Return cost</span><strong>{formatMoney(Number(returnShippingCost) || 0)}</strong></div><button className="btn danger" onClick={() => void submit()} disabled={selectedUnits === 0 && refund === 0}>Record return / refund</button></div>
  </section>;
}

export function OrdersView({ state, memory, workspaceName, workspaceId }: { state: WorkspaceState; memory: MemoryStore; workspaceName: string; workspaceId: string }) {
  const ccy = getActiveCurrency();
  const [customer, setCustomer] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [storeCredit, setStoreCredit] = useState("0");
  const [shippingAddress, setShippingAddress] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [discount, setDiscount] = useState("0");
  const [shipCharged, setShipCharged] = useState("0");
  const [shipCost, setShipCost] = useState("0");
  const [codFee, setCodFee] = useState("0");
  const [packaging, setPackaging] = useState("0");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [courier, setCourier] = useState("");
  const [reading, setReading] = useState(false);
  const [tab, setTab] = useState<OrderTab>("all");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [returningId, setReturningId] = useState<string | null>(null);

  // Command-palette deep link: expand the exact order that was searched for.
  useEffect(() => {
    const k = consumeDeepLink("order");
    if (k) { setExpanded(k); setTab("all"); }
  }, []);

  const needle = q.trim().toLowerCase();
  const activeTab = ORDER_TABS.find((t) => t.id === tab)!;
  const visibleOrders = state.orders.filter(
    (o) =>
      activeTab.match(o) &&
      (!needle ||
        o.customer.toLowerCase().includes(needle) ||
        o.lines.some((l) => l.productName.toLowerCase().includes(needle)))
  );

  const toggleSelected = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allVisibleSelected = visibleOrders.length > 0 && visibleOrders.every((o) => selected.has(o.orderId));
  const toggleAllVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleOrders.forEach((o) => next.delete(o.orderId));
      else visibleOrders.forEach((o) => next.add(o.orderId));
      return next;
    });
  };
  const exportSelected = () => {
    const chosen = state.orders.filter((o) => selected.has(o.orderId));
    const esc = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [
      ["Customer", "Items", "Value", "Status", "Created"],
      ...chosen.map((o) => [
        o.customer,
        o.lines.map((l) => `${l.qty}× ${l.productName}`).join(", "),
        orderRevenue(o),
        STATUS_LABEL[o.status],
        new Date(o.createdAt).toISOString(),
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "zyvora-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const available = (pid: string) => {
    const p = state.products.find((x) => x.productId === pid);
    if (!p) return 0;
    const inLines = lines.filter((l) => l.productId === pid).reduce((s, l) => s + l.qty, 0);
    return p.stock - (state.reserved[pid] ?? 0) - inLines;
  };

  const addLine = () => {
    const p = state.products.find((x) => x.productId === productId);
    const q = parseInt(qty, 10);
    if (!p || !isFinite(q) || q <= 0) return;
    if (q > available(p.productId)) {
      void appAlert({
        title: "Not enough stock",
        body:
          `Only ${available(p.productId)} unit(s) of "${p.name}" are available (stock minus reservations). ` +
          `ZYVORA never allows selling more than is available.`,
      });
      return;
    }
    setLines([
      ...lines,
      { productId: p.productId, productName: p.name, qty: q, unitPrice: p.price, unitCost: p.unitCost },
    ]);
    setQty("1");
  };

  const num = (s: string) => {
    const v = parseFloat(s);
    return isFinite(v) && v >= 0 ? v : 0;
  };

  const subtotal = orderLinesTotal({ lines } as Order);

  const applyPromo = () => {
    const result = checkPromo(state, promoInput, subtotal);
    if (!result.ok) {
      setPromoMsg(result.reason);
      setAppliedPromo(null);
      return;
    }
    setDiscount(String(result.discount));
    setAppliedPromo(result.promo.code);
    setPromoMsg(`Applied "${result.promo.code}" — ${formatMoney(result.discount)} off.`);
  };

  const clearPromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoMsg(null);
    setDiscount("0");
  };

  const availableStoreCredit = state.storeCreditBalances[customer.trim()] ?? 0;
  const orderCharge = Math.max(0, subtotal - num(discount) + num(shipCharged));
  const appliedStoreCredit = Math.min(availableStoreCredit, orderCharge, num(storeCredit));

  const draft: Order = {
    orderId: "draft",
    customer: customer.trim(),
    customerPhone: customerPhone.trim(),
    shippingAddress: shippingAddress.trim(),
    deliveryInstructions: deliveryInstructions.trim(),
    lines,
    discount: num(discount),
    shippingCharged: num(shipCharged),
    shippingCost: num(shipCost),
    codFee: num(codFee),
    packagingCost: num(packaging),
    createdAt: Date.now(),
    status: "pending",
    ...(appliedStoreCredit ? { storeCreditApplied: appliedStoreCredit } : {}),
  };
  const draftProfit = lines.length ? orderNetProfit(draft) : 0;

  const createOrder = async () => {
    if (!customer.trim() || lines.length === 0) return;
    if (draftProfit < 0) {
      const ok = await appConfirm({
        title: "This order loses money as priced",
        body:
          `After all costs it nets ${formatMoney(draftProfit)}. ` +
          `Create it anyway? The override stays visible in the order's record.`,
        confirmLabel: "Create anyway",
        danger: true,
      });
      if (!ok) return;
    }
    memory.append("fact", "order_created", {
      orderId: crypto.randomUUID(),
      customer: customer.trim(),
      ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
      ...(shippingAddress.trim() ? { shippingAddress: shippingAddress.trim() } : {}),
      ...(deliveryInstructions.trim() ? { deliveryInstructions: deliveryInstructions.trim() } : {}),
      lines,
      discount: num(discount),
      shippingCharged: num(shipCharged),
      shippingCost: num(shipCost),
      codFee: num(codFee),
      packagingCost: num(packaging),
      createdAt: Date.now(),
      ...(appliedPromo ? { promoCode: appliedPromo } : {}),
      ...(source ? { source } : {}),
      ...(courier.trim() ? { courier: courier.trim() } : {}),
      ...(appliedStoreCredit ? { storeCreditApplied: appliedStoreCredit } : {}),
    });
    setCustomer("");
    setCustomerPhone("");
    setStoreCredit("0");
    setShippingAddress("");
    setDeliveryInstructions("");
    setSource("");
    setCourier("");
    setLines([]);
    setDiscount("0"); setShipCharged("0"); setShipCost("0"); setCodFee("0"); setPackaging("0");
    clearPromo();
    setCreating(false);
  };

  const transition = (o: Order, to: OrderStatus) => {
    memory.append("fact", "order_status_changed", { orderId: o.orderId, status: to, at: Date.now() });
    toast(`${o.customer}'s order → ${STATUS_LABEL[to]}`);
  };

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Accept, confirm, and follow every order while keeping its real profit visible. Revenue counts only after delivery."
        actions={<button className="btn" onClick={() => setCreating((v) => !v)}>{creating ? "Close" : "Create order"}</button>}
      />

      <CourierControlPanel state={state} memory={memory} />
      <ConfirmationQueue state={state} memory={memory} workspaceName={workspaceName} workspaceId={workspaceId} />

      {creating && (
      <section className="card form-card" aria-labelledby="new-order-title">
      <div className="section-heading">
        <div><h2 id="new-order-title">Create order</h2><p>Stock is reserved as soon as the order is created.</p></div>
        {visionConfigured && (
          <label className="btn subtle mini" style={{ cursor: "pointer" }}>
            {reading ? "Reading photo…" : "From photo 📷"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              disabled={reading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const reader = new FileReader();
                reader.onload = async () => {
                  setReading(true);
                  try {
                    const names = state.products.filter((p) => !p.discontinued).map((p) => p.name);
                    const ex = await extractOrderFromImage(String(reader.result), names);
                    if (ex.customer && !customer.trim()) setCustomer(ex.customer);
                    const newLines: OrderLine[] = [];
                    for (const item of ex.items) {
                      const p = state.products.find((x) => x.name === item.product && !x.discontinued);
                      if (p) newLines.push({ productId: p.productId, productName: p.name, qty: item.qty, unitPrice: p.price, unitCost: p.unitCost });
                    }
                    if (newLines.length > 0) {
                      setLines((prev) => [...prev, ...newLines]);
                      toast(`Draft read from photo: ${newLines.map((l) => `${l.qty}× ${l.productName}`).join(", ")} — review before creating`);
                    } else {
                      toast("Couldn't match any products in the photo — add lines manually");
                    }
                  } catch (err) {
                    toast(`Photo reading failed: ${err instanceof Error ? err.message : "error"}`);
                  } finally {
                    setReading(false);
                  }
                };
                reader.readAsDataURL(f);
              }}
            />
          </label>
        )}
      </div>
      <div className="form-row">
        <div>
          <label htmlFor="order-customer">Customer</label>
          <input id="order-customer" value={customer} onChange={(e) => { setCustomer(e.target.value); setStoreCredit("0"); }} placeholder="Customer name" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="order-source">Source</label>
          <select id="order-source" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">—</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="website">Website</option>
            <option value="referral">Referral</option>
            <option value="repeat">Repeat customer</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="order-courier">Courier</label>
          <input id="order-courier" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. Sendit" list="courier-list" style={{ width: 130 }} />
          <datalist id="courier-list">
            {[...new Set(state.orders.map((o) => o.courier).filter(Boolean))].map((c) => <option key={c} value={c as string} />)}
          </datalist>
        </div>
        <div>
          <label htmlFor="order-product">Product</label>
          <select id="order-product" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select…</option>
            {state.products.filter((p) => !p.discontinued).map((p) => (
              <option key={p.productId} value={p.productId}>
                {p.name} ({available(p.productId)} available)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="order-qty">Quantity</label>
          <input id="order-qty" value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" style={{ width: 72 }} />
        </div>
        <button className="btn ghost" onClick={addLine}>Add line</button>
      </div>
      <div className="order-delivery-grid">
        <div>
          <label htmlFor="order-customer-phone">Customer phone</label>
          <input id="order-customer-phone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+212 6…" autoComplete="tel" />
        </div>
        <div>
          <label htmlFor="order-shipping-address">Shipping address</label>
          <textarea id="order-shipping-address" rows={2} value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Street, area, city" autoComplete="shipping street-address" />
        </div>
        <div>
          <label htmlFor="order-delivery-instructions">Delivery instructions</label>
          <textarea id="order-delivery-instructions" rows={2} value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)} placeholder="Landmark, preferred time, call before delivery…" />
        </div>
      </div>

      {lines.length > 0 && (
        <>
          <table className="records" style={{ marginBottom: 12 }}>
            <thead><tr><th>Line</th><th>Qty</th><th>Price</th><th></th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>{l.productName}</td>
                  <td>{l.qty}</td>
                  <td>{formatMoney(l.qty * l.unitPrice)}</td>
                  <td>
                    <button className="link-btn" onClick={() => setLines(lines.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {state.promos.some((p) => p.active) && (
            <div className="form-row">
              <div>
                <label htmlFor="order-promo">Promo code</label>
                <input
                  id="order-promo"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Code"
                  disabled={!!appliedPromo}
                  style={{ width: 130 }}
                />
              </div>
              {appliedPromo ? (
                <button className="btn subtle" onClick={clearPromo}>Remove promo</button>
              ) : (
                <button className="btn ghost" onClick={applyPromo} disabled={!promoInput.trim() || lines.length === 0}>
                  Apply
                </button>
              )}
              {promoMsg && <span className="confidence-note" style={{ alignSelf: "center" }}>{promoMsg}</span>}
            </div>
          )}
          <div className="form-row">
            <div><label htmlFor="order-discount">Discount ({ccy})</label><input id="order-discount" value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" disabled={!!appliedPromo} style={{ width: 100 }} /></div>
            <div><label htmlFor="order-shipping-charged">Shipping charged</label><input id="order-shipping-charged" value={shipCharged} onChange={(e) => setShipCharged(e.target.value)} inputMode="decimal" style={{ width: 110 }} /></div>
            <div><label htmlFor="order-shipping-cost">Shipping cost</label><input id="order-shipping-cost" value={shipCost} onChange={(e) => setShipCost(e.target.value)} inputMode="decimal" style={{ width: 100 }} /></div>
            <div><label htmlFor="order-cod-fee">COD fee</label><input id="order-cod-fee" value={codFee} onChange={(e) => setCodFee(e.target.value)} inputMode="decimal" style={{ width: 90 }} /></div>
            <div><label htmlFor="order-packaging">Packaging</label><input id="order-packaging" value={packaging} onChange={(e) => setPackaging(e.target.value)} inputMode="decimal" style={{ width: 90 }} /></div>
          </div>
          {availableStoreCredit > 0 && <div className="store-credit-apply"><div><strong>{formatMoney(availableStoreCredit)} store credit available</strong><span>Payment tender only—this does not reduce revenue or product value.</span></div><label htmlFor="order-store-credit">Apply to this order<input id="order-store-credit" type="number" min="0" max={Math.min(availableStoreCredit, orderCharge)} step="0.01" value={storeCredit} onChange={(event) => setStoreCredit(event.target.value)} /></label><button className="btn subtle mini" onClick={() => setStoreCredit(String(Math.min(availableStoreCredit, orderCharge)))}>Apply maximum</button></div>}
          <p className="confidence-note" style={{ marginBottom: 10 }}>
            Projected: revenue {formatMoney(orderRevenue(draft))} · cost {formatMoney(orderCogs(draft) + draft.shippingCost + draft.codFee + draft.packagingCost)} ·{" "}
            <strong>net {formatMoney(draftProfit)}</strong> · COD cash due {formatMoney(orderCashDue(draft))}
            {draftProfit < 0 && " — this order loses money as priced"}
          </p>
          <button className="btn" onClick={createOrder} disabled={!customer.trim()}>
            Create order (reserves stock)
          </button>
        </>
      )}
      </section>
      )}

      {returningId && state.orders.find((order) => order.orderId === returningId) && (
        <ReturnRefundPanel order={state.orders.find((order) => order.orderId === returningId)!} memory={memory} onClose={() => setReturningId(null)} />
      )}

      <h2>Order book</h2>
      {state.orders.length === 0 ? (
        <div className="quiet">No orders yet. Orders reserve stock when created and count as revenue only when delivered.</div>
      ) : (
        <>
          <div className="index-toolbar">
            <div className="segmented" role="group" aria-label="Filter orders">
              {ORDER_TABS.map((t) => {
                const n = state.orders.filter((o) => t.match(o)).length;
                return (
                  <button
                    key={t.id}
                    aria-pressed={tab === t.id}
                    className={tab === t.id ? "active" : ""}
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}{n > 0 && ` ${n}`}
                  </button>
                );
              })}
            </div>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search customer or product…"
              aria-label="Search orders"
            />
          </div>
          {visibleOrders.length === 0 ? (
            <div className="quiet">No orders match{q.trim() ? ` “${q.trim()}”` : ""} in this view.</div>
          ) : (
        <>
        <div className="record-cards" aria-label="Orders">
          {visibleOrders.map((o) => (
            <article className="record-card" key={`mobile-${o.orderId}`}>
              <div className="rc-head">
                <span className="rc-title rc-select-title">
                  <input type="checkbox" checked={selected.has(o.orderId)} onChange={() => toggleSelected(o.orderId)} aria-label={`Select ${o.customer}'s order`} />
                  {o.customer}
                </span>
                <span className="rc-value">{formatMoney(orderRevenue(o))}</span>
              </div>
              <p className="rc-sub">
                {o.lines.map((l) => `${l.qty}× ${l.productName}`).join(", ")} · {dateLabel(o.createdAt)}
              </p>
              <div className="rc-status"><span className={`tone ${STATUS_TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span>{o.returnStatus && <span className={`tone ${o.returnStatus === "returned" ? "critical" : "attention"}`}>{o.returnStatus === "returned" ? "Returned" : "Partially refunded"}</span>}</div>
              <div className="row-actions">
                {NEXT[o.status].map((n) => (
                  <button
                    key={n.to}
                    className={`btn mini ${n.to === "refused" || n.to === "cancelled" || n.to === "returned" ? "danger" : n.to === "delivered" || n.to === "confirmed" ? "" : "subtle"}`}
                    onClick={() => transition(o, n.to)}
                  >
                    {n.label}
                  </button>
                ))}
                {o.status === "delivered" && !o.cashReceivedAt && orderCashDue(o) > 0 && (
                  <button
                    className="btn mini"
                    onClick={() => {
                      memory.append("fact", "order_cash_received", { orderId: o.orderId, at: Date.now() });
                      toast(`Cash from ${o.customer} recorded — ${formatMoney(orderCashDue(o))}`);
                    }}
                  >
                    Cash received
                  </button>
                )}
                {o.status === "delivered" && o.returnStatus !== "returned" && <button className="btn danger mini" onClick={() => { setReturningId(o.orderId); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Return / refund</button>}
                <button
                  className="btn subtle mini"
                  aria-expanded={expanded === o.orderId}
                  aria-controls={`order-profit-mobile-${o.orderId}`}
                  onClick={() => setExpanded(expanded === o.orderId ? null : o.orderId)}
                >
                  {expanded === o.orderId ? "Hide profit" : "View profit"}
                </button>
                <button className="btn subtle mini" onClick={() => printReceipt(o, workspaceName)}>Receipt</button>
              </div>
              {expanded === o.orderId && (
                <dl className="record-breakdown" id={`order-profit-mobile-${o.orderId}`}>
                  <div><dt>Revenue</dt><dd>{formatMoney(orderRevenue(o))}</dd></div>
                  <div><dt>Product cost</dt><dd>−{formatMoney(orderCogs(o))}</dd></div>
                  <div><dt>Delivery and handling</dt><dd>−{formatMoney(o.shippingCost + o.codFee + o.packagingCost)}</dd></div>
                  <div><dt>Net profit</dt><dd><strong>{formatMoney(orderNetProfit(o))}</strong></dd></div>
                </dl>
              )}
            </article>
          ))}
        </div>
        <div className="table-scroll" role="region" aria-label="Orders table" tabIndex={0}>
        <table className="records desktop-table">
          <thead>
            <tr>
              <th className="checkcell"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Select all visible orders" /></th>
              <th>Customer</th><th>Items</th><th>Value</th><th>Status</th><th>Cash</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((o) => (
              <Fragment key={o.orderId}>
                <tr>
                  <td className="checkcell"><input type="checkbox" checked={selected.has(o.orderId)} onChange={() => toggleSelected(o.orderId)} aria-label={`Select ${o.customer}'s order`} /></td>
                  <td>{o.customer}</td>
                  <td className="muted">
                    {o.lines.map((l) => `${l.qty}× ${l.productName}`).join(", ")}
                    <span className="muted"> · {dateLabel(o.createdAt)}</span>
                  </td>
                  <td>{formatMoney(orderRevenue(o))}</td>
                  <td><span className={`tone ${STATUS_TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span>{o.returnStatus && <div style={{ marginTop: 5 }}><span className={`tone ${o.returnStatus === "returned" ? "critical" : "attention"}`}>{o.returnStatus === "returned" ? "Returned" : "Partially refunded"}</span></div>}</td>
                  <td className="muted">
                    {o.status === "delivered"
                      ? orderCashDue(o) === 0
                        ? "No COD · store credit"
                        : o.cashReceivedAt
                          ? `Collected ${formatMoney(orderCashDue(o))}`
                          : `Pending ${formatMoney(orderCashDue(o))}`
                      : "—"}
                  </td>
                  <td>
                    <div className="row-actions">
                      {NEXT[o.status].map((n) => (
                        <button
                          key={n.to}
                          className={`btn mini ${n.to === "refused" || n.to === "cancelled" || n.to === "returned" ? "danger" : n.to === "delivered" || n.to === "confirmed" ? "" : "subtle"}`}
                          onClick={() => transition(o, n.to)}
                        >
                          {n.label}
                        </button>
                      ))}
                      {o.status === "delivered" && !o.cashReceivedAt && orderCashDue(o) > 0 && (
                        <button
                          className="btn mini"
                          onClick={() => {
                            memory.append("fact", "order_cash_received", { orderId: o.orderId, at: Date.now() });
                            toast(`Cash from ${o.customer} recorded — ${formatMoney(orderCashDue(o))}`);
                          }}
                        >
                          Cash received
                        </button>
                      )}
                      {o.status === "delivered" && o.returnStatus !== "returned" && <button className="btn danger mini" onClick={() => { setReturningId(o.orderId); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Return / refund</button>}
                      <button
                        className="btn subtle mini"
                        aria-expanded={expanded === o.orderId}
                        aria-controls={`order-profit-${o.orderId}`}
                        onClick={() => setExpanded(expanded === o.orderId ? null : o.orderId)}
                      >
                        {expanded === o.orderId ? "Hide" : "Profit"}
                      </button>
                      <button className="btn subtle mini" onClick={() => printReceipt(o, workspaceName)}>
                        Receipt
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded === o.orderId && (
                  <tr id={`order-profit-${o.orderId}`}>
                    <td colSpan={7}>
                      <table className="evidence-table">
                        <tbody>
                          <tr><td>Lines total</td><td>{formatMoney(o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0))}</td></tr>
                          <tr><td>Discount</td><td>−{formatMoney(o.discount)}</td></tr>
                          <tr><td>Shipping charged to customer</td><td>+{formatMoney(o.shippingCharged)}</td></tr>
                          <tr><td>Revenue {o.status !== "delivered" && "(recognized only on delivery)"}</td><td>{formatMoney(orderRevenue(o))}</td></tr>
                          {(o.storeCreditApplied ?? 0) > 0 && <tr><td>Paid with store credit</td><td>{formatMoney(o.storeCreditApplied ?? 0)}</td></tr>}
                          {(o.storeCreditApplied ?? 0) > 0 && <tr><td>COD cash due</td><td>{formatMoney(orderCashDue(o))}</td></tr>}
                          {(o.refundAmount ?? 0) > 0 && <tr><td>Refunds issued</td><td>−{formatMoney(o.refundAmount ?? 0)}</td></tr>}
                          <tr><td>Product cost (COGS)</td><td>−{formatMoney(orderCogs(o))}</td></tr>
                          <tr><td>Shipping cost</td><td>−{formatMoney(o.shippingCost)}</td></tr>
                          <tr><td>COD fee</td><td>−{formatMoney(o.codFee)}</td></tr>
                          <tr><td>Packaging</td><td>−{formatMoney(o.packagingCost)}</td></tr>
                          {(o.returnShippingCost ?? 0) > 0 && <tr><td>Return shipping cost</td><td>−{formatMoney(o.returnShippingCost ?? 0)}</td></tr>}
                          <tr><td><strong>Net profit</strong></td><td><strong>{formatMoney(orderNetProfit(o))}</strong></td></tr>
                        </tbody>
                      </table>
                      <details className="layers" style={{ marginTop: 8 }}>
                        <summary>Story of this order — the full event trail</summary>
                        <ul className="timeline" style={{ marginTop: 10 }}>
                          {storyForOrder(memory.all(), o.orderId).map((s, i) => (
                            <li key={i}>
                              <div className="when">{new Date(s.ts).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                              <div className="what">{s.what}</div>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        </div>
        {selected.size > 0 && (
          <div className="bulk-bar" role="region" aria-label="Selected order actions">
            <span>{selected.size} selected</span>
            <button onClick={exportSelected}>Export CSV</button>
            <span className="spacer" />
            <button onClick={() => setSelected(new Set())}>Clear selection</button>
          </div>
        )}
        </>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Confirmation queue — the COD anti-refusal workflow. Confirmed-by-phone orders
 * refuse roughly half as often (Morocco market data), so this walks the oldest
 * unconfirmed order to a decision in one screen: WhatsApp/confirm/no-answer/cancel,
 * plus an upsell hint computed from your own co-purchase history.
 */
function ConfirmationQueue({
  state, memory, workspaceName, workspaceId,
}: { state: WorkspaceState; memory: MemoryStore; workspaceName: string; workspaceId: string }) {
  const [sending, setSending] = useState(false);
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());
  const allPending = state.orders
    .filter((o) => o.status === "pending")
    .sort((a, b) => a.createdAt - b.createdAt);
  const pending = allPending.filter((o) => !skipped.has(o.orderId));
  if (allPending.length === 0) return null;
  if (pending.length === 0) {
    return (
      <div className="quiet" style={{ marginBottom: 16 }}>
        Confirmation queue done for now — {allPending.length} order{allPending.length > 1 ? "s" : ""} awaiting a retry (follow-ups scheduled).
      </div>
    );
  }

  const o = pending[0];
  const contacts = projectContacts(memory.all());
  const phone = contacts.get(o.customer)?.phone?.trim();
  const itemsSummary = o.lines.map((l) => `${l.qty}× ${l.productName}`).join(", ");
  const message = codConfirmationText(workspaceName, o.customer, itemsSummary, formatMoney(orderCashDue(o)));
  const upsell = upsellSuggestion(state, o.lines.map((l) => l.productId));
  const waitedDays = Math.floor((Date.now() - o.createdAt) / 86_400_000);
  const risk = refusalRisk(state, o, contacts);

  const logAttempt = (note: string, dueDays?: number) =>
    memory.append("fact", "customer_activity_logged", {
      activityId: crypto.randomUUID(),
      customer: o.customer,
      kind: "call",
      note,
      ...(dueDays ? { dueAt: Date.now() + dueDays * 86_400_000 } : {}),
      at: Date.now(),
    });

  return (
    <section className="card" style={{ borderLeft: "3px solid var(--amber)" }} aria-labelledby="confirm-queue-title">
      <div className="badge-row">
        <span className="badge strategic">Confirmation queue</span>
        <span className="badge domain">{pending.length} waiting</span>
        <span className={`tone ${RISK_TONE[risk.level]}`} style={{ marginLeft: "auto" }}>
          Refusal risk: {risk.level} · {risk.score}
        </span>
      </div>
      <p className="claim" id="confirm-queue-title">
        {o.customer} — {itemsSummary} · COD {formatMoney(orderCashDue(o))}
        {waitedDays > 0 && <span className="muted"> · waiting {waitedDays} day{waitedDays > 1 ? "s" : ""}</span>}
      </p>
      <p className="reasoning">
        Confirmed orders refuse far less at the door. Reach {o.customer}
        {phone ? ` (${phone})` : " (no phone saved — add one on their profile for one-tap WhatsApp)"} and record the outcome.
        {upsell && (
          <> <strong>Worth offering:</strong> {upsell.productName} ({formatMoney(upsell.price)}) — bought together {upsell.timesTogether}× before.</>
        )}
      </p>
      {risk.factors.length > 0 && (
        <details className="layers" style={{ marginBottom: 10 }}>
          <summary>Why this risk score? — {risk.factors.length} factor{risk.factors.length > 1 ? "s" : ""}</summary>
          <table className="evidence-table">
            <tbody>
              {risk.factors.map((f, i) => (
                <tr key={i}>
                  <td>{f.label}</td>
                  <td>{f.points > 0 ? `+${f.points}` : f.points}</td>
                </tr>
              ))}
              <tr><td>Market base rate (Morocco COD)</td><td>+22</td></tr>
            </tbody>
          </table>
          {risk.level === "high" && (
            <p className="confidence-note">High risk: consider double-confirming, or offering a small prepayment discount before shipping.</p>
          )}
        </details>
      )}
      <div className="row-actions">
        {messagingConfigured && phone && (
          <button
            className="btn mini"
            disabled={sending}
            onClick={async () => {
              setSending(true);
              const r = await sendMessage(phone, message, "whatsapp", { workspaceId, customer: o.customer });
              setSending(false);
              if (r.ok) {
                recordSentMessage(memory, r, { customer: o.customer, phone, body: message, channel: "whatsapp" });
                toast(`WhatsApp sent to ${o.customer}`);
              } else {
                toast(`Couldn't send: ${r.error}`);
              }
            }}
          >
            {sending ? "Sending…" : "Send WhatsApp"}
          </button>
        )}
        <button
          className="btn subtle mini"
          onClick={async () => {
            await navigator.clipboard?.writeText(message).catch(() => undefined);
            toast("Confirmation message copied — paste it anywhere");
          }}
        >
          Copy message
        </button>
        <button
          className="btn mini"
          onClick={() => {
            memory.append("fact", "order_status_changed", { orderId: o.orderId, status: "confirmed", at: Date.now() });
            logAttempt("Order confirmed by customer");
            toast(`${o.customer}'s order confirmed`);
          }}
        >
          Confirmed ✓
        </button>
        <button
          className="btn subtle mini"
          onClick={() => {
            logAttempt("No answer on confirmation attempt — retry scheduled", 1);
            setSkipped((prev) => new Set(prev).add(o.orderId));
            toast(`No answer logged — follow-up tomorrow for ${o.customer}`);
          }}
        >
          No answer
        </button>
        <button
          className="btn mini danger"
          onClick={async () => {
            const ok = await appConfirm({
              title: `Cancel ${o.customer}'s order?`,
              body: "The reserved stock is released. The order stays in your history as cancelled.",
              confirmLabel: "Cancel order",
              danger: true,
            });
            if (ok) {
              memory.append("fact", "order_status_changed", { orderId: o.orderId, status: "cancelled", at: Date.now() });
              toast(`${o.customer}'s order cancelled`);
            }
          }}
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
