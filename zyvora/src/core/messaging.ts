/**
 * Messaging client (CAP-000010 FEAT-000077 channel routing) — calls the
 * `send-message` Supabase Edge Function, which holds the Twilio secrets and
 * relays to WhatsApp/SMS. The browser never sees the Twilio credentials.
 */
import { cloudConfigured, supabase } from "./cloud";

export type Channel = "whatsapp" | "sms";

/** Available only in account mode (the Edge Function needs Supabase auth). */
export const messagingConfigured = cloudConfigured;

export interface SendResult {
  ok: boolean;
  error?: string;
}

export async function sendMessage(to: string, body: string, channel: Channel = "whatsapp"): Promise<SendResult> {
  if (!supabase) return { ok: false, error: "Messaging needs account mode (sign in)." };
  try {
    const { data, error } = await supabase.functions.invoke("send-message", {
      body: { to, body, channel },
    });
    if (error) return { ok: false, error: error.message };
    if (data && (data as { ok?: boolean }).ok) return { ok: true };
    return { ok: false, error: (data as { error?: string })?.error ?? "Send failed." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed." };
  }
}

/** A ready-to-send COD confirmation message for an order. */
export function codConfirmationText(business: string, customer: string, itemsSummary: string, total: string): string {
  return (
    `Hello ${customer}, this is ${business}. We're confirming your order: ${itemsSummary}. ` +
    `Total to pay on delivery: ${total}. Reply YES to confirm so we can ship it. Thank you!`
  );
}
