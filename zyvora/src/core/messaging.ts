/**
 * Messaging client (CAP-000010 FEAT-000077 channel routing) — calls the
 * `send-message` Supabase Edge Function, which holds the Twilio secrets and
 * relays to WhatsApp/SMS. The browser never sees the Twilio credentials.
 */
import { cloudConfigured, supabase } from "./cloud";
import type { MemoryStore } from "./memory";

export type Channel = "whatsapp" | "sms";

/** Available only in account mode (the Edge Function needs Supabase auth). */
export const messagingConfigured = cloudConfigured;

export interface SendResult {
  ok: boolean;
  error?: string;
  sid?: string;
  status?: string;
}

export interface SendContext {
  /** Workspace boundary checked again by the server before any paid send. */
  workspaceId: string;
  /** Optional customer key used to enforce the latest recorded consent. */
  customer?: string;
}

export async function sendMessage(
  to: string,
  body: string,
  channel: Channel = "whatsapp",
  context: SendContext,
): Promise<SendResult> {
  if (!supabase) return { ok: false, error: "Messaging needs account mode (sign in)." };
  if (!context.workspaceId) return { ok: false, error: "Choose a workspace before sending." };
  try {
    const { data, error } = await supabase.functions.invoke("send-message", {
      body: { to, body, channel, workspaceId: context.workspaceId, customer: context.customer },
    });
    if (error) return { ok: false, error: error.message };
    if (data && (data as { ok?: boolean }).ok) {
      const sent = data as { sid?: string; status?: string };
      return { ok: true, sid: sent.sid, status: sent.status };
    }
    return { ok: false, error: (data as { error?: string })?.error ?? "Send failed." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed." };
  }
}

/** Record a Twilio-accepted send once, with its SID for later delivery callbacks. */
export function recordSentMessage(
  memory: MemoryStore,
  result: SendResult,
  message: { customer?: string; phone: string; body: string; channel: Channel },
): void {
  if (!result.ok) return;
  memory.append("fact", "message_sent", {
    messageId: result.sid || crypto.randomUUID(), twilioSid: result.sid,
    customer: message.customer, phone: message.phone, body: message.body,
    channel: message.channel, status: result.status || "accepted", at: Date.now(),
  });
}

/** A ready-to-send COD confirmation message for an order. */
export function codConfirmationText(business: string, customer: string, itemsSummary: string, total: string): string {
  return (
    `Hello ${customer}, this is ${business}. We're confirming your order: ${itemsSummary}. ` +
    `Total to pay on delivery: ${total}. Reply YES to confirm so we can ship it. Thank you!`
  );
}
