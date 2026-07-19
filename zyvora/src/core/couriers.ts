/**
 * Courier Control Tower — one calculation owner for delivery intervention.
 * Decision served: which shipment or COD remittance needs attention first?
 * Facts remain on Order projections; this file only ranks rebuildable views.
 */
import { DAY, orderCashDue } from "./projections";
import type { Order, WorkspaceState } from "./types";

export type CourierAction =
  | "handoff"
  | "add-tracking"
  | "contact-customer"
  | "check-courier"
  | "chase-remittance"
  | "none";

export interface CourierControlRow {
  order: Order;
  score: number;
  action: CourierAction;
  claim: string;
  reason: string;
  cashAtRisk: number;
  daysSinceUpdate: number;
}

export interface CourierControl {
  rows: CourierControlRow[];
  needsAction: number;
  inMotion: number;
  failed: number;
  cashPending: number;
}

export function courierControl(state: WorkspaceState, now: number = Date.now()): CourierControl {
  const rows: CourierControlRow[] = [];
  const age = (at?: number) => at ? Math.max(0, Math.floor((now - at) / DAY)) : 0;

  for (const order of state.orders) {
    if (["cancelled", "refused", "returned"].includes(order.status)) continue;
    const sinceUpdate = age(order.shipmentUpdatedAt ?? order.createdAt);
    const value = orderCashDue(order);
    let row: CourierControlRow | null = null;

    if (order.status === "confirmed" && !order.shipmentStatus) {
      row = {
        order, score: 70, action: "handoff", cashAtRisk: value, daysSinceUpdate: sinceUpdate,
        claim: `${order.customer}'s confirmed order is ready for courier handoff.`,
        reason: "It is confirmed but no shipment or tracking record exists yet.",
      };
    } else if (order.status === "shipped" && !order.shipmentStatus) {
      row = {
        order, score: 80, action: "add-tracking", cashAtRisk: value, daysSinceUpdate: sinceUpdate,
        claim: `${order.customer}'s shipped order has no tracking record.`,
        reason: "Without a tracking number or courier event, delivery progress cannot be verified.",
      };
    } else if (order.shipmentStatus === "delivery_failed") {
      row = {
        order, score: 100, action: "contact-customer", cashAtRisk: value, daysSinceUpdate: sinceUpdate,
        claim: `${order.customer}'s delivery failed.`,
        reason: order.lastDeliveryFailure || "The failure reason was not recorded; contact the customer before another attempt.",
      };
    } else if (
      order.expectedDeliveryAt && order.expectedDeliveryAt < now &&
      order.shipmentStatus !== "delivered" && order.status !== "delivered"
    ) {
      row = {
        order, score: 90, action: "check-courier", cashAtRisk: value, daysSinceUpdate: sinceUpdate,
        claim: `${order.customer}'s delivery is past its expected date.`,
        reason: `The expected delivery date passed ${age(order.expectedDeliveryAt)} day(s) ago without a delivered event.`,
      };
    } else if (order.status === "delivered" && !order.cashReceivedAt) {
      const remitAge = age(order.deliveredAt);
      const overdue = order.expectedRemittanceAt ? order.expectedRemittanceAt < now : remitAge >= 3;
      row = {
        order, score: overdue ? 95 : 55, action: overdue ? "chase-remittance" : "none",
        cashAtRisk: value, daysSinceUpdate: remitAge,
        claim: `${order.customer}'s COD cash is still with the courier.`,
        reason: overdue
          ? `Cash has been pending for ${remitAge} day(s), beyond the collection window.`
          : `Delivered ${remitAge} day(s) ago; the cash is pending but not overdue yet.`,
      };
    } else if (
      order.shipmentStatus &&
      ["handed_to_courier", "in_transit", "out_for_delivery", "returning"].includes(order.shipmentStatus)
    ) {
      const stale = sinceUpdate >= 3;
      row = {
        order, score: stale ? 75 : 30, action: stale ? "check-courier" : "none",
        cashAtRisk: value, daysSinceUpdate: sinceUpdate,
        claim: stale
          ? `${order.customer}'s shipment has not changed for ${sinceUpdate} day(s).`
          : `${order.customer}'s shipment is moving normally.`,
        reason: stale
          ? "A stale courier status can hide a failed attempt or return."
          : "The latest courier update is recent; no intervention is needed.",
      };
    }

    if (row) rows.push(row);
  }

  rows.sort((a, b) => b.score - a.score || b.cashAtRisk - a.cashAtRisk);
  return {
    rows,
    needsAction: rows.filter((r) => r.action !== "none").length,
    inMotion: rows.filter((r) => r.order.shipmentStatus && !["delivered", "returned"].includes(r.order.shipmentStatus)).length,
    failed: rows.filter((r) => r.order.shipmentStatus === "delivery_failed").length,
    cashPending: rows.filter((r) => r.order.status === "delivered" && !r.order.cashReceivedAt)
      .reduce((sum, r) => sum + r.cashAtRisk, 0),
  };
}
