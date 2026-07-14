/**
 * Orders — the Commerce Domain surface (Wave 1; ZPL-040 §4, ZPL-041 §3).
 * COD lifecycle: pending → confirmed → shipped → delivered → (cash received | returned),
 * with refusal and cancellation paths. Revenue is recognized on delivery only.
 * Margin guard: an order projected to lose money warns before creation (ZPL-041 §17).
 * Canonical (governance/): CAP-000006 Inventory FEAT-000044 reservations;
 * CAP-000005 Finance FEAT-000035 invoicing; CAP-000009 Documents FEAT-000067 generation.
 */
import { Fragment, useState } from "react";
import { formatMoney } from "../core/engine";
import { getActiveCurrency } from "../core/format";
import type { MemoryStore } from "../core/memory";
import {
  checkPromo,
  orderCogs,
  orderLinesTotal,
  orderNetProfit,
  orderRevenue,
} from "../core/projections";
import type { Order, OrderLine, OrderStatus, WorkspaceState } from "../core/types";

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
  delivered: [{ to: "returned", label: "Returned" }],
  refused: [],
  cancelled: [],
  returned: [],
};

export function OrdersView({ state, memory, workspaceName }: { state: WorkspaceState; memory: MemoryStore; workspaceName: string }) {
  const ccy = getActiveCurrency();
  const [customer, setCustomer] = useState("");
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
      alert(
        `Only ${available(p.productId)} unit(s) of "${p.name}" are available (stock minus reservations). ` +
          `ZYVORA never allows selling more than is available.`
      );
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

  const draft: Order = {
    orderId: "draft",
    customer: customer.trim(),
    lines,
    discount: num(discount),
    shippingCharged: num(shipCharged),
    shippingCost: num(shipCost),
    codFee: num(codFee),
    packagingCost: num(packaging),
    createdAt: Date.now(),
    status: "pending",
  };
  const draftProfit = lines.length ? orderNetProfit(draft) : 0;

  const createOrder = () => {
    if (!customer.trim() || lines.length === 0) return;
    if (draftProfit < 0) {
      const ok = confirm(
        `Warning: as priced, this order LOSES ${formatMoney(Math.abs(draftProfit))} after all costs. ` +
          `Create it anyway? (The override will be visible in the order's record.)`
      );
      if (!ok) return;
    }
    memory.append("fact", "order_created", {
      orderId: crypto.randomUUID(),
      customer: customer.trim(),
      lines,
      discount: num(discount),
      shippingCharged: num(shipCharged),
      shippingCost: num(shipCost),
      codFee: num(codFee),
      packagingCost: num(packaging),
      createdAt: Date.now(),
      ...(appliedPromo ? { promoCode: appliedPromo } : {}),
    });
    setCustomer("");
    setLines([]);
    setDiscount("0"); setShipCharged("0"); setShipCost("0"); setCodFee("0"); setPackaging("0");
    clearPromo();
  };

  const transition = (o: Order, to: OrderStatus) => {
    memory.append("fact", "order_status_changed", { orderId: o.orderId, status: to, at: Date.now() });
  };

  return (
    <div>
      <h1>Orders</h1>
      <p className="subtitle">
        The question this Domain answers: “Which orders should I accept, confirm, and chase —
        and is each one actually profitable?” Revenue counts only when an order is delivered.
      </p>

      <h2>New order</h2>
      <div className="form-row">
        <div>
          <label>Customer</label>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" />
        </div>
        <div>
          <label>Product</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select…</option>
            {state.products.map((p) => (
              <option key={p.productId} value={p.productId}>
                {p.name} ({available(p.productId)} available)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Qty</label>
          <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" style={{ width: 60 }} />
        </div>
        <button className="btn ghost" onClick={addLine}>Add line</button>
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
                <label>Promo code</label>
                <input
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
            <div><label>Discount ({ccy})</label><input value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" disabled={!!appliedPromo} style={{ width: 90 }} /></div>
            <div><label>Shipping charged</label><input value={shipCharged} onChange={(e) => setShipCharged(e.target.value)} inputMode="decimal" style={{ width: 90 }} /></div>
            <div><label>Shipping cost</label><input value={shipCost} onChange={(e) => setShipCost(e.target.value)} inputMode="decimal" style={{ width: 90 }} /></div>
            <div><label>COD fee</label><input value={codFee} onChange={(e) => setCodFee(e.target.value)} inputMode="decimal" style={{ width: 80 }} /></div>
            <div><label>Packaging</label><input value={packaging} onChange={(e) => setPackaging(e.target.value)} inputMode="decimal" style={{ width: 80 }} /></div>
          </div>
          <p className="confidence-note" style={{ marginBottom: 10 }}>
            Projected: revenue {formatMoney(orderRevenue(draft))} · cost {formatMoney(orderCogs(draft) + draft.shippingCost + draft.codFee + draft.packagingCost)} ·{" "}
            <strong>net {formatMoney(draftProfit)}</strong>
            {draftProfit < 0 && " — this order loses money as priced"}
          </p>
          <button className="btn" onClick={createOrder} disabled={!customer.trim()}>
            Create order (reserves stock)
          </button>
        </>
      )}

      <h2>Order book</h2>
      {state.orders.length === 0 ? (
        <div className="quiet">No orders yet. Orders reserve stock when created and count as revenue only when delivered.</div>
      ) : (
        <table className="records">
          <thead>
            <tr><th>Customer</th><th>Items</th><th>Value</th><th>Status</th><th>Cash</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {state.orders.map((o) => (
              <Fragment key={o.orderId}>
                <tr>
                  <td>{o.customer}</td>
                  <td className="muted">
                    {o.lines.map((l) => `${l.qty}× ${l.productName}`).join(", ")}
                    <span className="muted"> · {dateLabel(o.createdAt)}</span>
                  </td>
                  <td>{formatMoney(orderRevenue(o))}</td>
                  <td>{STATUS_LABEL[o.status]}</td>
                  <td className="muted">
                    {o.status === "delivered"
                      ? o.cashReceivedAt
                        ? "Collected"
                        : "Pending courier"
                      : "—"}
                  </td>
                  <td>
                    {NEXT[o.status].map((n) => (
                      <button key={n.to} className="link-btn" style={{ marginRight: 8 }} onClick={() => transition(o, n.to)}>
                        {n.label}
                      </button>
                    ))}
                    {o.status === "delivered" && !o.cashReceivedAt && (
                      <button
                        className="link-btn"
                        style={{ marginRight: 8 }}
                        onClick={() =>
                          memory.append("fact", "order_cash_received", { orderId: o.orderId, at: Date.now() })
                        }
                      >
                        Cash received
                      </button>
                    )}
                    <button className="link-btn" style={{ marginRight: 8 }} onClick={() => setExpanded(expanded === o.orderId ? null : o.orderId)}>
                      {expanded === o.orderId ? "Hide" : "Profit"}
                    </button>
                    <button className="link-btn" onClick={() => printReceipt(o, workspaceName)}>
                      Receipt
                    </button>
                  </td>
                </tr>
                {expanded === o.orderId && (
                  <tr>
                    <td colSpan={6}>
                      <table className="evidence-table">
                        <tbody>
                          <tr><td>Lines total</td><td>{formatMoney(o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0))}</td></tr>
                          <tr><td>Discount</td><td>−{formatMoney(o.discount)}</td></tr>
                          <tr><td>Shipping charged to customer</td><td>+{formatMoney(o.shippingCharged)}</td></tr>
                          <tr><td>Revenue {o.status !== "delivered" && "(recognized only on delivery)"}</td><td>{formatMoney(orderRevenue(o))}</td></tr>
                          <tr><td>Product cost (COGS)</td><td>−{formatMoney(orderCogs(o))}</td></tr>
                          <tr><td>Shipping cost</td><td>−{formatMoney(o.shippingCost)}</td></tr>
                          <tr><td>COD fee</td><td>−{formatMoney(o.codFee)}</td></tr>
                          <tr><td>Packaging</td><td>−{formatMoney(o.packagingCost)}</td></tr>
                          <tr><td><strong>Net profit</strong></td><td><strong>{formatMoney(orderNetProfit(o))}</strong></td></tr>
                        </tbody>
                      </table>
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

