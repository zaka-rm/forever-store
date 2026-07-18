/**
 * WhatsApp Operations Inbox — the two-way conversation layer.
 * Threads are projected from Business Memory: inbound `message_received` events
 * (appended by the whatsapp-inbound webhook) plus outbound message activities
 * (logged when ZYVORA sends). One source of truth — no separate chat store.
 *
 * "Waiting" = last message is from the customer (needs a human). Unread is
 * tracked per device (localStorage), like notifications. Consent is respected:
 * a customer who texted STOP is flagged opted-out and must not be broadcast to.
 */
import type { MemoryEvent, MessageReceived } from "./types";

export interface InboxMessage {
  id?: string;
  at: number;
  direction: "in" | "out";
  body: string;
  phone?: string;
  status?: string;
  errorCode?: string;
}

export interface Conversation {
  /** Stable key: the customer name when known, else the phone number. */
  key: string;
  customer?: string;
  phone?: string;
  messages: InboxMessage[];
  lastAt: number;
  waiting: boolean;   // last message is inbound → needs a reply
  optedOut: boolean;
  /** A human explicitly cleared an inbound message that needed no reply. */
  resolvedAt?: number;
  assignedTo?: string;
  assignedLabel?: string;
}

export type InboundIntent = "confirm" | "cancel" | "opt-out" | "opt-in" | "unknown";

const OUT_PREFIX = /^(WhatsApp|SMS)(\s*\([^)]*\))?:\s*/i; // strip the log prefix for display
const STOP_WORDS = /^\s*(stop|unsubscribe|arret|arrêt|توقف|قف)\s*$/i;
const START_WORDS = /^\s*(start|subscribe|commencer|ابدأ|بداية)\s*$/i;
const CONFIRM_WORDS = /^\s*(yes|y|oui|confirm(?:ed)?|تأكيد|نعم|اه|ah|wakha)\s*[.!✅👍]*\s*$/i;
const CANCEL_WORDS = /^\s*(no|n|non|cancel|annuler|إلغاء|لا|la)\s*[.!❌]*\s*$/i;

/** Is this inbound body a consent opt-out (STOP)? */
export function isOptOut(body: string): boolean {
  return STOP_WORDS.test(body);
}

/** Conservative intent recognition: only explicit one-purpose replies match. */
export function classifyInbound(body: string): InboundIntent {
  if (STOP_WORDS.test(body)) return "opt-out";
  if (START_WORDS.test(body)) return "opt-in";
  if (CONFIRM_WORDS.test(body)) return "confirm";
  if (CANCEL_WORDS.test(body)) return "cancel";
  return "unknown";
}

export function projectConversations(events: readonly MemoryEvent[]): Conversation[] {
  const threads = new Map<string, Conversation>();
  const optedOut = new Set<string>();
  const resolvedAt = new Map<string, number>();
  const assignments = new Map<string, { assignedTo?: string; assignedLabel?: string }>();
  const statuses = new Map<string, { status: string; errorCode?: string; at: number }>();

  for (const e of events) {
    if (e.stream !== "fact" || e.type !== "message_status_changed") continue;
    const p = e.payload as { messageId?: string; status?: string; errorCode?: string; at?: number };
    if (!p.messageId || !p.status) continue;
    const at = p.at ?? e.ts;
    const current = statuses.get(p.messageId);
    if (!current || at >= current.at) statuses.set(p.messageId, { status: p.status, errorCode: p.errorCode, at });
  }

  const ensure = (key: string): Conversation => {
    let t = threads.get(key);
    if (!t) {
      t = { key, messages: [], lastAt: 0, waiting: false, optedOut: false };
      threads.set(key, t);
    }
    return t;
  };

  for (const e of events) {
    if (e.stream === "fact" && e.type === "message_received") {
      const p = e.payload as unknown as MessageReceived;
      const key = p.customer || p.phone;
      const t = ensure(key);
      if (p.customer) t.customer = p.customer;
      if (p.phone) t.phone = p.phone;
      t.messages.push({ id: p.messageId, at: p.at ?? e.ts, direction: "in", body: p.body, phone: p.phone });
      if (isOptOut(p.body) && p.customer) optedOut.add(p.customer);
    } else if (e.stream === "fact" && e.type === "message_sent") {
      const p = e.payload as { messageId?: string; customer?: string; phone?: string; body?: string; status?: string; at?: number };
      const key = p.customer || p.phone;
      if (!key || !p.body) continue;
      const t = ensure(key);
      if (p.customer) t.customer = p.customer;
      if (p.phone) t.phone = p.phone;
      const delivery = p.messageId ? statuses.get(p.messageId) : undefined;
      t.messages.push({
        id: p.messageId, at: p.at ?? e.ts, direction: "out", body: p.body, phone: p.phone,
        status: delivery?.status ?? p.status, errorCode: delivery?.errorCode,
      });
    } else if (e.stream === "fact" && e.type === "customer_activity_logged") {
      const p = e.payload as { customer?: string; kind?: string; note?: string; at?: number };
      if (p.kind !== "message" || !p.customer) continue;
      const t = ensure(p.customer);
      t.customer = p.customer;
      t.messages.push({ at: p.at ?? e.ts, direction: "out", body: (p.note ?? "").replace(OUT_PREFIX, "") });
    } else if (e.stream === "fact" && e.type === "customer_opted_out") {
      const p = e.payload as { customer?: string; phone?: string };
      if (p.customer) optedOut.add(p.customer);
      if (p.phone) optedOut.add(p.phone);
    } else if (e.stream === "fact" && e.type === "customer_opted_in") {
      const p = e.payload as { customer?: string; phone?: string };
      if (p.customer) optedOut.delete(p.customer);
      if (p.phone) optedOut.delete(p.phone);
    } else if (e.stream === "fact" && e.type === "conversation_resolved") {
      const p = e.payload as { customer?: string; phone?: string; at?: number };
      const key = p.customer || p.phone;
      if (key) resolvedAt.set(key, p.at ?? e.ts);
    } else if (e.stream === "fact" && e.type === "conversation_assigned") {
      const p = e.payload as { customer?: string; phone?: string; assignedTo?: string; assignedLabel?: string };
      const key = p.customer || p.phone;
      if (key) assignments.set(key, { assignedTo: p.assignedTo || undefined, assignedLabel: p.assignedLabel || undefined });
    }
  }

  const out: Conversation[] = [];
  for (const t of threads.values()) {
    t.messages.sort((a, b) => a.at - b.at);
    const last = t.messages[t.messages.length - 1];
    t.lastAt = last?.at ?? 0;
    t.resolvedAt = resolvedAt.get(t.key);
    const assignment = assignments.get(t.key);
    t.assignedTo = assignment?.assignedTo;
    t.assignedLabel = assignment?.assignedLabel;
    t.waiting = Boolean(last && last.direction === "in" && (t.resolvedAt ?? 0) < last.at);
    t.optedOut = Boolean(
      (t.customer && optedOut.has(t.customer)) || (t.phone && optedOut.has(t.phone))
    );
    out.push(t);
  }
  return out.sort((a, b) => b.lastAt - a.lastAt);
}

// ------------------------------------------------------------- Read state ---

const readKey = (wsId: string) => `zyvora.inbox.read.${wsId}`;

function loadRead(wsId: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(readKey(wsId)) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

/** Unread = inbound messages newer than the last time this thread was opened. */
export function unreadCount(conv: Conversation, wsId: string): number {
  const readAt = loadRead(wsId)[conv.key] ?? 0;
  return conv.messages.filter((m) => m.direction === "in" && m.at > readAt).length;
}

export function markRead(conv: Conversation, wsId: string): void {
  const map = loadRead(wsId);
  map[conv.key] = Date.now();
  localStorage.setItem(readKey(wsId), JSON.stringify(map));
}

/** Total conversations needing a reply — for the nav badge. */
export function waitingCount(convs: Conversation[]): number {
  return convs.filter((c) => c.waiting && !c.optedOut).length;
}
