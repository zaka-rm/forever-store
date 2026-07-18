// ZYVORA — inbound WhatsApp/SMS webhook (Supabase Edge Function).
// Canonical (governance/): CAP-000010 Notifications — inbound channel.
//
// Twilio POSTs here whenever a customer replies. We resolve which workspace and
// customer the message belongs to (by the phone the customer used), append a
// `message_received` fact event to that workspace's Business Memory, and — if
// the body is STOP — also record a consent opt-out. Append-only; the webhook is
// the ONLY writer of inbound events (service role, bypasses RLS).
//
// Deploy:  supabase functions deploy whatsapp-inbound --no-verify-jwt
// Twilio:  set the WhatsApp/SMS number's "A MESSAGE COMES IN" webhook to
//          https://<project-ref>.supabase.co/functions/v1/whatsapp-inbound  (HTTP POST)
//
// NOTE: matching by phone requires a customer whose saved contact phone equals
// the sender. Unmatched senders still create a thread keyed by their number.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STOP = /^\s*(stop|unsubscribe|arret|arrêt|توقف|قف)\s*$/i;

function normalize(phone: string): string {
  const p = phone.replace(/[^\d+]/g, "");
  return p.startsWith("+") ? p : `+${p}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  // Twilio sends application/x-www-form-urlencoded.
  const form = await req.formData().catch(() => null);
  if (!form) return twiml(); // ack anyway so Twilio doesn't retry-storm
  const fromRaw = String(form.get("From") ?? "");
  const body = String(form.get("Body") ?? "").trim();
  const from = normalize(fromRaw.replace(/^whatsapp:/i, ""));
  const channel = /^whatsapp:/i.test(fromRaw) ? "whatsapp" : "sms";
  if (!from || !body) return twiml();

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Resolve customer + workspace by matching the sender phone to a saved contact.
  // Contact phones live inside customer_contact_updated fact payloads.
  let workspaceId: string | null = null;
  let customer: string | undefined;
  const { data: contacts } = await admin
    .from("zyvora_events")
    .select("workspace_id, payload")
    .eq("type", "customer_contact_updated")
    .order("ts", { ascending: false })
    .limit(2000);
  for (const row of contacts ?? []) {
    const p = (row as { payload: { phone?: string; customer?: string } }).payload;
    if (p?.phone && normalize(p.phone) === from) {
      workspaceId = (row as { workspace_id: string }).workspace_id;
      customer = p.customer;
      break;
    }
  }
  // Fall back to the most recent workspace that has messaged this number, else newest workspace.
  if (!workspaceId) {
    const { data: ws } = await admin
      .from("zyvora_workspaces").select("id").order("created_at", { ascending: false }).limit(1);
    workspaceId = (ws?.[0] as { id: string } | undefined)?.id ?? null;
  }
  if (!workspaceId) return twiml();

  const append = (type: string, payload: Record<string, unknown>) =>
    admin.from("zyvora_events").insert({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      ts: Date.now(),
      stream: "fact",
      type,
      payload,
    });

  await append("message_received", {
    messageId: crypto.randomUUID(),
    customer,
    phone: from,
    body,
    channel,
    at: Date.now(),
  });
  if (STOP.test(body) && customer) {
    await append("customer_opted_out", { customer, phone: from, at: Date.now() });
  }

  return twiml();
});

/** Empty TwiML — acknowledges receipt without auto-replying. */
function twiml(): Response {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { "Content-Type": "text/xml" },
  });
}
