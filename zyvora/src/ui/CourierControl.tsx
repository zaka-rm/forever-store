/**
 * Courier Control Tower — decision surface for delivery intervention and COD cash.
 * Every action appends a fact; Order state remains a rebuildable projection.
 */
import { courierControl } from "../core/couriers";
import { formatMoney } from "../core/engine";
import type { MemoryStore } from "../core/memory";
import { orderCashDue, orderRevenue } from "../core/projections";
import type { Order, ShipmentStatus, WorkspaceState } from "../core/types";
import { appConfirm, appPrompt } from "./dialog";
import { toast } from "./toast";

export function CourierControlPanel({ state, memory }: { state: WorkspaceState; memory: MemoryStore }) {
  const control = courierControl(state);
  if (control.rows.length === 0) return null;

  const appendShipmentStatus = (order: Order, status: ShipmentStatus, reason?: string) => {
    memory.append("fact", "shipment_status_changed", {
      orderId: order.orderId, status, at: Date.now(), reason,
    });
  };

  const handoff = async (order: Order) => {
    const courier = await appPrompt({
      title: "Hand off to courier",
      body: `Which courier is taking ${order.customer}'s order?`,
      label: "Courier",
      initial: order.courier ?? "",
      placeholder: "Courier name",
      confirmLabel: "Continue",
    });
    if (!courier?.trim()) return;
    const tracking = await appPrompt({
      title: "Add tracking",
      body: "Enter the tracking number if you have it. You can leave it empty and add it later.",
      label: "Tracking number",
      placeholder: "Optional",
      confirmLabel: "Record handoff",
    });
    if (tracking === null) return;
    const at = Date.now();
    memory.append("fact", "shipment_created", {
      orderId: order.orderId,
      courier: courier.trim(),
      trackingNumber: tracking.trim() || undefined,
      at,
    });
    if (order.status === "confirmed") {
      memory.append("fact", "order_status_changed", { orderId: order.orderId, status: "shipped", at });
    }
    toast(`${order.customer}'s courier handoff recorded`);
  };

  const failDelivery = async (order: Order) => {
    const reason = await appPrompt({
      title: "Record failed delivery",
      body: "Why did this attempt fail? The reason determines the next action.",
      label: "Failure reason",
      placeholder: "No answer, wrong address, customer unavailable…",
      confirmLabel: "Record failure",
    });
    if (!reason?.trim()) return;
    appendShipmentStatus(order, "delivery_failed", reason.trim());
    toast("Failed attempt recorded — contact the customer before retrying");
  };

  const delivered = async (order: Order) => {
    const ok = await appConfirm({
      title: "Mark delivered?",
      body: `This recognizes ${formatMoney(orderRevenue(order))} as revenue. Confirm only from courier evidence.`,
      confirmLabel: "Mark delivered",
    });
    if (!ok) return;
    const at = Date.now();
    appendShipmentStatus(order, "delivered");
    if (order.status !== "delivered") memory.append("fact", "order_status_changed", { orderId: order.orderId, status: "delivered", at });
    toast(`${order.customer}'s order marked delivered`);
  };

  const receiveCash = async (order: Order) => {
    const ok = await appConfirm({
      title: "Record courier cash?",
      body: `Confirm that ${formatMoney(orderCashDue(order))} was actually remitted for ${order.customer}.`,
      confirmLabel: "Cash received",
    });
    if (!ok) return;
    memory.append("fact", "order_cash_received", { orderId: order.orderId, at: Date.now() });
    toast("Courier cash recorded");
  };

  const primaryAction = (order: Order) => {
    if (order.status === "delivered" && !order.cashReceivedAt) {
      return <button className="btn mini" onClick={() => void receiveCash(order)}>Cash received</button>;
    }
    if (!order.shipmentStatus) {
      return <button className="btn mini" onClick={() => void handoff(order)}>Add handoff</button>;
    }
    if (order.shipmentStatus === "handed_to_courier") {
      return <button className="btn mini" onClick={() => appendShipmentStatus(order, "in_transit")}>In transit</button>;
    }
    if (order.shipmentStatus === "in_transit") {
      return <button className="btn mini" onClick={() => appendShipmentStatus(order, "out_for_delivery")}>Out for delivery</button>;
    }
    if (order.shipmentStatus === "out_for_delivery") {
      return <button className="btn mini" onClick={() => void delivered(order)}>Delivered</button>;
    }
    if (order.shipmentStatus === "delivery_failed") {
      return <button className="btn mini" onClick={() => appendShipmentStatus(order, "out_for_delivery")}>Retry delivery</button>;
    }
    return null;
  };

  return (
    <section className="card courier-control" aria-labelledby="courier-control-title">
      <div className="section-head">
        <div>
          <h2 id="courier-control-title">Courier control</h2>
          <p className="muted">Which delivery or COD remittance needs intervention first?</p>
        </div>
        {control.needsAction > 0 && <span className="tone attention">{control.needsAction} need action</span>}
      </div>
      <div className="metric-strip compact">
        <div><span>In motion</span><strong>{control.inMotion}</strong></div>
        <div><span>Failed</span><strong>{control.failed}</strong></div>
        <div><span>Cash with couriers</span><strong>{formatMoney(control.cashPending)}</strong></div>
      </div>
      <div className="courier-queue">
        {control.rows.slice(0, 8).map((row) => (
          <article className={`courier-row${row.action !== "none" ? " needs-action" : ""}`} key={row.order.orderId}>
            <div className="courier-row-main">
              <strong>{row.claim}</strong>
              <span>{row.reason}</span>
              <small>
                {row.order.courier || "Courier not set"}
                {row.order.trackingNumber ? ` · Tracking ${row.order.trackingNumber}` : ""}
                {` · ${formatMoney(row.cashAtRisk)}`}
              </small>
            </div>
            <div className="row-actions">
              {row.order.trackingUrl && <a className="btn subtle mini" href={row.order.trackingUrl} target="_blank" rel="noreferrer">Track</a>}
              {row.order.shipmentStatus && !["delivered", "returned", "delivery_failed"].includes(row.order.shipmentStatus) && (
                <button className="btn subtle mini" onClick={() => void failDelivery(row.order)}>Failed</button>
              )}
              {primaryAction(row.order)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
