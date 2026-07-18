/**
 * WhatsApp Operations Inbox — two-way customer conversations, linked to orders.
 * Threads are projected from Business Memory (inbound webhook events + outbound
 * message activities). The merchant sees who is waiting, replies (with saved
 * templates or an AI draft grounded on the customer's real orders), and can
 * confirm the customer's pending COD order without leaving the conversation.
 * Consent is respected: opted-out customers cannot be messaged.
 */
import { useMemo, useState } from "react";
import type { MemoryStore } from "../core/memory";
import type { WorkspaceState } from "../core/types";
import {
  markRead,
  projectConversations,
  unreadCount,
  type Conversation,
} from "../core/inbox";
import { projectContacts } from "../core/projections";
import { businessContext } from "../core/assistant";
import { askLlm, llmConfigured } from "../core/llm";
import { messagingConfigured, sendMessage } from "../core/messaging";
import { PageHeader } from "./PageHeader";
import { toast } from "./toast";

const timeLabel = (ts: number) =>
  new Date(ts).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const SAVED_REPLIES: { label: string; text: (name: string) => string }[] = [
  { label: "Confirm request", text: (n) => `Hello ${n}, we're preparing your order. Reply YES to confirm delivery. Thank you! 🌿` },
  { label: "Out for delivery", text: (n) => `Hi ${n}, good news — your order is out for delivery today. Please keep your phone nearby.` },
  { label: "Payment on delivery", text: (n) => `Hi ${n}, payment is cash on delivery. Please have the amount ready when the courier arrives. Thank you!` },
  { label: "Thanks", text: (n) => `Thank you ${n}! It's a pleasure serving you. 🌿` },
];

export function InboxView({
  state, memory, workspaceId, workspaceName,
}: { state: WorkspaceState; memory: MemoryStore; workspaceId: string; workspaceName: string }) {
  const events = memory.all();
  const conversations = useMemo(() => projectConversations(events), [events]);
  const [selectedKey, setSelectedKey] = useState<string | null>(conversations[0]?.key ?? null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const contacts = projectContacts(events);

  const selected = conversations.find((c) => c.key === selectedKey) ?? null;
  const phone = selected?.phone || (selected?.customer ? contacts.get(selected.customer)?.phone?.trim() : undefined);
  const pendingOrder = selected?.customer
    ? state.orders.find((o) => o.customer === selected.customer && o.status === "pending")
    : undefined;

  const open = (c: Conversation) => {
    setSelectedKey(c.key);
    markRead(c, workspaceId);
    setReply("");
  };

  const logOutbound = (body: string) => {
    if (!selected?.customer) return;
    memory.append("fact", "customer_activity_logged", {
      activityId: crypto.randomUUID(), customer: selected.customer, kind: "message",
      note: `WhatsApp: ${body}`, at: Date.now(),
    });
  };

  const send = async () => {
    const body = reply.trim();
    if (!body || !selected) return;
    if (selected.optedOut) { toast("This customer opted out — can't message them."); return; }
    setBusy(true);
    if (phone && messagingConfigured) {
      const r = await sendMessage(phone, body, "whatsapp");
      if (r.ok) { logOutbound(body); toast(`Sent to ${selected.customer ?? phone}`); setReply(""); }
      else toast(`Couldn't send: ${r.error}`);
    } else {
      // No phone / messaging not set up — still record the reply so the thread is complete.
      logOutbound(body);
      toast(phone ? "Recorded (messaging not deployed yet)" : "Recorded — add a phone to actually send");
      setReply("");
    }
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
    if (!pendingOrder) return;
    memory.append("fact", "order_status_changed", { orderId: pendingOrder.orderId, status: "confirmed", at: Date.now() });
    toast(`${pendingOrder.customer}'s order confirmed`);
  };

  const totalWaiting = conversations.filter((c) => c.waiting && !c.optedOut).length;

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
            {conversations.map((c) => {
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
                    {pendingOrder && <button className="btn mini" onClick={confirmPending}>Confirm order ✓</button>}
                  </div>
                </div>

                <div className="thread-body">
                  {selected.messages.map((m, i) => (
                    <div key={i} className={`bubble ${m.direction}`}>
                      <div>{m.body}</div>
                      <div className="bubble-time">{timeLabel(m.at)}</div>
                    </div>
                  ))}
                </div>

                {selected.optedOut ? (
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
