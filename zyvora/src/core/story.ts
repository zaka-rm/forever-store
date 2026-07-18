/**
 * Story of a record — the audit view only an event-sourced system can give:
 * every fact that ever touched an order or a customer, in the order it
 * happened, quoted from Business Memory (never reconstructed, never editable).
 */
import { money } from "./format";
import type { MemoryEvent } from "./types";

export interface StoryEntry {
  ts: number;
  stream: string;
  what: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function describe(e: MemoryEvent): string | null {
  const p = e.payload as Record<string, unknown>;
  switch (e.type) {
    case "order_created": {
      const lines = (p.lines as { qty: number; productName: string }[]) ?? [];
      return `Order created — ${lines.map((l) => `${l.qty}× ${l.productName}`).join(", ")}${p.source ? ` · via ${p.source}` : ""}`;
    }
    case "order_status_changed":
      return `Status → ${cap(String(p.status))}`;
    case "order_cash_received":
      return "Courier remitted the cash";
    case "shipment_created":
      return `Courier handoff — ${String(p.courier)}${p.trackingNumber ? ` · tracking ${p.trackingNumber}` : ""}`;
    case "shipment_status_changed":
      return `Shipment → ${cap(String(p.status).replace(/_/g, " "))}${p.reason ? ` · ${p.reason}` : ""}`;
    case "invoice_issued":
      return `Invoice issued — ${money(Number(p.amount))}, due in ${p.dueDays} days`;
    case "invoice_paid":
      return "Invoice paid";
    case "customer_contact_updated":
      return `Contact updated${p.phone ? ` — phone ${p.phone}` : ""}${p.city ? ` · ${p.city}` : ""}`;
    case "customer_activity_logged":
      return `${cap(String(p.kind))}: ${String(p.note).slice(0, 120)}`;
    case "customer_activity_completed":
      return "Follow-up marked done";
    case "message_received":
      return `Customer message: ${String(p.body).slice(0, 120)}`;
    case "message_sent":
      return `${String(p.channel) === "sms" ? "SMS" : "WhatsApp"} sent: ${String(p.body).slice(0, 120)}`;
    case "message_status_changed":
      return `Message delivery → ${cap(String(p.status))}${p.errorCode ? ` · error ${p.errorCode}` : ""}`;
    case "customer_opted_out":
      return "Customer opted out of business messages";
    case "customer_opted_in":
      return "Customer opted back into business messages";
    case "conversation_resolved":
      return `Conversation resolved${p.reason ? ` — ${p.reason}` : ""}`;
    case "conversation_assigned":
      return p.assignedTo ? `Conversation assigned to ${p.assignedLabel || p.assignedTo}` : "Conversation returned to the unassigned queue";
    case "customer_archived":
      return "Archived (hidden from lists; history kept)";
    case "customer_restored":
      return "Restored from archive";
    default:
      return null;
  }
}

/** Everything that ever happened to one order, oldest first. */
export function storyForOrder(events: readonly MemoryEvent[], orderId: string): StoryEntry[] {
  return events
    .filter((e) => e.stream === "fact" && (e.payload as { orderId?: string }).orderId === orderId)
    .map((e) => ({ ts: e.ts, stream: e.stream, what: describe(e) ?? e.type }))
    .sort((a, b) => a.ts - b.ts);
}

/** Everything that ever happened around one customer, newest first (capped). */
export function storyForCustomer(
  events: readonly MemoryEvent[],
  customer: string,
  max = 12
): StoryEntry[] {
  // Status/cash events carry only an orderId — resolve which orders are theirs.
  const theirOrders = new Set(
    events
      .filter((e) => e.type === "order_created" && (e.payload as { customer?: string }).customer === customer)
      .map((e) => String((e.payload as { orderId: string }).orderId))
  );
  return events
    .filter((e) => {
      if (e.stream !== "fact") return false;
      const p = e.payload as { customer?: string; orderId?: string };
      return p.customer === customer || (p.orderId !== undefined && theirOrders.has(p.orderId));
    })
    .map((e) => ({ ts: e.ts, stream: e.stream, what: describe(e) ?? e.type }))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, max);
}
