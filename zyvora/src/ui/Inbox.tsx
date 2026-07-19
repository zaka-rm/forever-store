/**
 * WhatsApp Operations Inbox — two-way customer conversations, linked to orders.
 * Threads are projected from Business Memory (inbound webhook events + outbound
 * message activities). The merchant sees who is waiting, replies (with saved
 * templates or an AI draft grounded on the customer's real orders), and can
 * confirm the customer's pending COD order without leaving the conversation.
 * Consent is respected: opted-out customers cannot be messaged.
 */
import { useEffect, useMemo, useState } from "react";
import type { MemoryStore } from "../core/memory";
import type { WorkspaceState } from "../core/types";
import {
  markRead,
  projectConversations,
  classifyInbound,
  unreadCount,
  type Conversation,
} from "../core/inbox";
import { projectContacts } from "../core/projections";
import { businessContext } from "../core/assistant";
import { askLlm, llmConfigured } from "../core/llm";
import { messagingConfigured, recordSentMessage, sendMessage } from "../core/messaging";
import { PageHeader } from "./PageHeader";
import { toast } from "./toast";
import { fetchMembers, supabase, type Member } from "../core/cloud";
import { WhatsAppTemplateComposer } from "./WhatsAppTemplates";

const timeLabel = (ts: number) =>
  new Date(ts).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const deliveryLabel = (status?: string) => {
  if (!status) return "";
  if (status === "read") return "✓✓ Read";
  if (status === "delivered") return "✓✓ Delivered";
  if (["failed", "undelivered", "canceled"].includes(status)) return "Delivery failed";
  if (["sent", "sending"].includes(status)) return "✓ Sent";
  return "Queued";
};

const SAVED_REPLIES: { label: string; text: (name: string) => string }[] = [
  { label: "Confirm request", text: (n) => `Hello ${n}, we're preparing your order. Reply YES to confirm delivery. Thank you! 🌿` },
  { label: "Out for delivery", text: (n) => `Hi ${n}, good news — your order is out for delivery today. Please keep your phone nearby.` },
  { label: "Payment on delivery", text: (n) => `Hi ${n}, payment is cash on delivery. Please have the amount ready when the courier arrives. Thank you!` },
  { label: "Thanks", text: (n) => `Thank you ${n}! It's a pleasure serving you. 🌿` },
];

export function InboxView({
  state, memory, workspaceId, workspaceName, userId = "", editable = true,
}: { state: WorkspaceState; memory: MemoryStore; workspaceId: string; workspaceName: string; userId?: string; editable?: boolean }) {
  const events = memory.all();
  const conversations = useMemo(() => projectConversations(events), [events, events.length]);
  const [selectedKey, setSelectedKey] = useState<string | null>(conversations[0]?.key ?? null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignmentFilter, setAssignmentFilter] = useState<"mine" | "unassigned" | "all">("all");
  const contacts = projectContacts(events);
  const effectiveUserId = userId || "local-owner";

  useEffect(() => {
    if (!supabase || !userId) return;
    fetchMembers(supabase, workspaceId).then(setMembers).catch(() => setMembers([]));
  }, [workspaceId, userId]);

  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    map.set(effectiveUserId, "Me");
    for (const member of members) {
      if (!map.has(member.userId)) map.set(member.userId, member.userId === userId ? "Me" : `Team member ${member.userId.slice(0, 8)}`);
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [members, effectiveUserId, userId]);

  const selected = conversations.find((c) => c.key === selectedKey) ?? null;
  const phone = selected?.phone || (selected?.customer ? contacts.get(selected.customer)?.phone?.trim() : undefined);
  const pendingOrder = selected?.customer
    ? state.orders.find((o) => o.customer === selected.customer && o.status === "pending")
    : undefined;
  const lastInbound = selected ? [...selected.messages].reverse().find((m) => m.direction === "in") : undefined;
  const inboundIntent = lastInbound ? classifyInbound(lastInbound.body) : "unknown";

  useEffect(() => {
    if (selected) markRead(selected, workspaceId);
  }, [selected?.key, selected?.lastAt, workspaceId]);

  const open = (c: Conversation) => {
    setSelectedKey(c.key);
    markRead(c, workspaceId);
    setReply("");
  };

  const send = async () => {
    const body = reply.trim();
    if (!body || !selected || !editable) return;
    if (selected.optedOut) { toast("This customer opted out — can't message them."); return; }
    setBusy(true);
    if (phone && messagingConfigured) {
      const r = await sendMessage(phone, body, "whatsapp", { workspaceId, customer: selected.customer });
      if (r.ok) {
        recordSentMessage(memory, r, { customer: selected.customer, phone, body, channel: "whatsapp" });
        toast(`Sent to ${selected.customer ?? phone}`); setReply("");
      }
      else toast(`Couldn't send: ${r.error}`);
    } else toast(phone ? "Messaging isn't deployed yet — nothing was recorded as sent." : "Add a phone before sending.");
    setBusy(false);
  };

  const aiDraft = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const lastFew = selected.messages.slice(-5).map((m) => `${m.direction === "in" ? "Customer" : "Us"}: ${m.body}`).join("\n");
      const orders = state.orders
        .filter((o) => o.customer === selected.customer)
        .slice(0, 4)
        .map((o) => `${o.status}: ${o.lines.map((l) => `${l.qty}× ${l.productName}`).join(", ")}`)
        .join("; ");
      const q =
        `Draft a short, warm WhatsApp reply to this customer, in the SAME language they used ` +
        `(Darija/Arabic, French, or English). Use their real order info; never invent facts.\n\n` +
        `Customer: ${selected.customer ?? "unknown"}\nTheir orders: ${orders || "none on record"}\n\nConversation:\n${lastFew}\n\nReply:`;
      const draft = await askLlm(q, businessContext(state));
      if (draft) setReply(draft.trim());
    } catch {
      toast("AI draft unavailable — write your reply, or use a saved reply.");
    } finally {
      setBusy(false);
    }
  };

  const confirmPending = () => {
    if (!pendingOrder || !editable) return;
    memory.append("fact", "order_status_changed", { orderId: pendingOrder.orderId, status: "confirmed", at: Date.now() });
    resolveSelected("Customer explicitly confirmed the pending order");
    toast(`${pendingOrder.customer}'s order confirmed`);
  };

  const cancelPending = () => {
    if (!pendingOrder || !editable) return;
    memory.append("fact", "order_status_changed", { orderId: pendingOrder.orderId, status: "cancelled", at: Date.now() });
    resolveSelected("Customer explicitly declined the pending order");
    toast(`${pendingOrder.customer}'s order cancelled`);
  };

  const resolveSelected = (reason = "No outbound reply required") => {
    if (!selected || !editable) return;
    memory.append("fact", "conversation_resolved", {
      customer: selected.customer, phone: selected.phone, at: Date.now(), reason,
    });
  };

  const assignSelected = (assignedTo: string) => {
    if (!selected || !editable) return;
    const assignedLabel = assignees.find((a) => a.id === assignedTo)?.label;
    memory.append("fact", "conversation_assigned", {
      customer: selected.customer, phone: selected.phone,
      assignedTo, assignedLabel, assignedBy: effectiveUserId, at: Date.now(),
    });
  };

  const totalWaiting = conversations.filter((c) => c.waiting && !c.optedOut).length;
  const displayedConversations = conversations.filter((c) =>
    assignmentFilter === "all" ||
    (assignmentFilter === "mine" ? c.assignedTo === effectiveUserId : !c.assignedTo)
  );

  return (
    <div>
      <PageHeader
        title="Inbox"
        description={<>Two-way WhatsApp with your customers, linked to their orders.{totalWaiting > 0 && ` ${totalWaiting} waiting for a reply.`}</>}
      />

      {conversations.length === 0 ? (
        <div className="quiet">
          No conversations yet. When customers reply to your WhatsApp messages, their threads appear here.
          {" "}Deploy the <code>whatsapp-inbound</code> function and point your Twilio number's incoming-message webhook at it.
        </div>
      ) : (
        <div className={`inbox${selected ? " has-selection" : ""}`}>
          <aside className="inbox-list" aria-label="Conversations">
            <div className="inbox-assignment-filter" role="group" aria-label="Conversation ownership">
              <button className={assignmentFilter === "mine" ? "active" : ""} onClick={() => setAssignmentFilter("mine")}>Mine</button>
              <button className={assignmentFilter === "unassigned" ? "active" : ""} onClick={() => setAssignmentFilter("unassigned")}>Unassigned</button>
              <button className={assignmentFilter === "all" ? "active" : ""} onClick={() => setAssignmentFilter("all")}>All</button>
            </div>
            {displayedConversations.length === 0 && <div className="quiet" style={{ margin: 12 }}>No conversations in this queue.</div>}
            {displayedConversations.map((c) => {
              const unread = unreadCount(c, workspaceId);
              const last = c.messages[c.messages.length - 1];
              return (
                <button
                  key={c.key}
                  className={`conv-item${selectedKey === c.key ? " active" : ""}`}
                  onClick={() => open(c)}
                >
                  <div className="conv-top">
                    <span className="conv-name">{c.customer ?? c.phone}</span>
                    <span className="conv-time">{last ? timeLabel(last.at).split(",")[0] : ""}</span>
                  </div>
                  <div className="conv-snippet">
                    {last?.direction === "in" ? "" : "You: "}{last?.body.slice(0, 48)}
                  </div>
                  <div className="conv-tags">
                    {unread > 0 && <span className="conv-unread">{unread}</span>}
                    {c.waiting && !c.optedOut && <span className="tone attention" style={{ fontSize: 11 }}>Waiting</span>}
                    {c.optedOut && <span className="tone critical" style={{ fontSize: 11 }}>Opted out</span>}
                    {c.assignedLabel && <span className="tone info" style={{ fontSize: 11 }}>{c.assignedLabel}</span>}
                  </div>
                </button>
              );
            })}
          </aside>

          <section className="inbox-thread" aria-label="Conversation">
            {!selected ? (
              <div className="quiet" style={{ margin: "auto" }}>Select a conversation.</div>
            ) : (
              <>
                <div className="thread-head">
                  <button className="btn subtle mini thread-back" onClick={() => setSelectedKey(null)} aria-label="Back to conversations">←</button>
                  <div>
                    <strong>{selected.customer ?? selected.phone}</strong>
                    {selected.phone && selected.customer && <span className="muted"> · {selected.phone}</span>}
                  </div>
                  <div className="row-actions" style={{ marginLeft: "auto" }}>
                    {editable && (
                      <select aria-label="Assign conversation" value={selected.assignedTo ?? ""} onChange={(e) => assignSelected(e.target.value)}>
                        <option value="">Unassigned</option>
                        {assignees.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                      </select>
                    )}
                    {editable && selected.waiting && (
                      <button className="btn subtle mini" onClick={() => resolveSelected()}>Resolve</button>
                    )}
                    {editable && pendingOrder && inboundIntent === "confirm" && (
                      <button className="btn mini" onClick={confirmPending}>Confirm order ✓</button>
                    )}
                    {editable && pendingOrder && inboundIntent === "cancel" && (
                      <button className="btn danger mini" onClick={cancelPending}>Cancel order</button>
                    )}
                  </div>
                </div>

                <div className="thread-body">
                  {selected.messages.map((m, i) => (
                    <div key={i} className={`bubble ${m.direction}`}>
                      <div>{m.body}</div>
                      <div className={`bubble-time${["failed", "undelivered", "canceled"].includes(m.status ?? "") ? " failed" : ""}`}>
                        {timeLabel(m.at)}{m.direction === "out" && deliveryLabel(m.status) ? ` · ${deliveryLabel(m.status)}` : ""}
                      </div>
                    </div>
                  ))}
                </div>

                {!editable ? (
                  <div className="quiet" style={{ margin: 12 }}>View-only access — replies and order changes are disabled.</div>
                ) : selected.optedOut ? (
                  <div className="quiet" style={{ margin: 12 }}>This customer texted STOP and is opted out. You can't send business messages to them.</div>
                ) : (
                  <div className="thread-reply">
                    <div className="saved-replies">
                      {SAVED_REPLIES.map((s) => (
                        <button key={s.label} className="btn subtle mini" onClick={() => setReply(s.text(selected.customer ?? "there"))}>
                          {s.label}
                        </button>
                      ))}
                      {llmConfigured && (
                        <button className="btn ghost mini" disabled={busy} onClick={() => void aiDraft()}>
                          {busy ? "…" : "Reply with AI"}
                        </button>
                      )}
                    </div>
                    {phone && (
                      <WhatsAppTemplateComposer
                        customer={selected.customer ?? phone}
                        phone={phone}
                        state={state}
                        memory={memory}
                        workspaceId={workspaceId}
                        business={workspaceName}
                      />
                    )}
                    <div className="reply-row">
                      <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder={phone ? "Type a reply…" : "Add a phone on their profile to send…"}
                        aria-label="Reply"
                      />
                      <button className="btn" disabled={busy || !reply.trim()} onClick={() => void send()}>
                        {busy ? "…" : "Send"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
