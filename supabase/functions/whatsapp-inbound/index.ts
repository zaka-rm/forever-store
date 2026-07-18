// ZYVORA — signed, idempotent inbound WhatsApp/SMS webhook.
// Canonical: CAP-000010 inbound channel; CODEX 00 F.3 integrity/isolation.
//
// Twilio signs every request. The destination number is resolved through
// `zyvora_channel_bindings`; messages are never guessed into a Workspace.
// Twilio MessageSid produces a stable event UUID, so webhook retries are safe.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STOP = /^\s*(stop|unsubscribe|arret|arrêt|توقف|قف)\s*$/i;
const START = /^\s*(start|subscribe|commencer|ابدأ|بداية)\s*$/i;
const MAX_BODY = 4096;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  const form = await req.formData().catch(() => null);
  if (!form) return twiml();

  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const signedUrl = Deno.env.get("TWILIO_WEBHOOK_URL") || req.url;
  if (!authToken || !(await validTwilioSignature(signature, signedUrl, form, authToken))) {
    console.error("Rejected inbound message: invalid Twilio signature");
    return new Response("Forbidden", { status: 403 });
  }

  const fromRaw = String(form.get("From") ?? "");
  const toRaw = String(form.get("To") ?? "");
  const body = String(form.get("Body") ?? "").trim().slice(0, MAX_BODY);
  const twilioSid = String(form.get("MessageSid") ?? form.get("SmsMessageSid") ?? "").trim();
  const from = normalize(fromRaw.replace(/^whatsapp:/i, ""));
  const to = normalize(toRaw.replace(/^whatsapp:/i, ""));
  const channel = /^whatsapp:/i.test(fromRaw) ? "whatsapp" : "sms";
  if (!from || !to || !body || !twilioSid) return twiml();

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Destination ownership is explicit. Never fall back to a random/newest Workspace.
  const { data: binding, error: bindingError } = await admin
    .from("zyvora_channel_bindings")
    .select("workspace_id")
    .eq("channel", channel)
    .eq("address", to)
    .maybeSingle();
  if (bindingError || !binding?.workspace_id) {
    console.error(`No unique ${channel} binding for destination ${to}`);
    return twiml();
  }
  const workspaceId = String(binding.workspace_id);

  // Resolve the latest contact within this Workspace only.
  let customer: string | undefined;
  const { data: contacts } = await admin
    .from("zyvora_events")
    .select("payload")
    .eq("workspace_id", workspaceId)
    .eq("type", "customer_contact_updated")
    .order("ts", { ascending: false })
    .limit(5000);
  for (const row of contacts ?? []) {
    const p = (row as { payload: { phone?: string; customer?: string } }).payload;
    if (p?.phone && normalize(p.phone) === from) {
      customer = p.customer;
      break;
    }
  }

  const at = Date.now();
  const messageEventId = await stableUuid(`twilio:${twilioSid}`);
  const { error: messageError } = await admin.from("zyvora_events").insert({
    id: messageEventId,
    workspace_id: workspaceId,
    ts: at,
    stream: "fact",
    type: "message_received",
    payload: {
      messageId: twilioSid,
      twilioSid,
      customer,
      phone: from,
      body,
      channel,
      at,
    },
  });
  // 23505 means Twilio retried a MessageSid already recorded: acknowledge safely.
  if (messageError && messageError.code !== "23505") {
    console.error("Could not append inbound message", messageError);
    return new Response("Temporary failure", { status: 500 });
  }

  const consentType = STOP.test(body)
    ? "customer_opted_out"
    : START.test(body)
      ? "customer_opted_in"
      : null;
  if (consentType) {
    const consentId = await stableUuid(`twilio:${twilioSid}:${consentType}`);
    const { error } = await admin.from("zyvora_events").insert({
      id: consentId,
      workspace_id: workspaceId,
      ts: at,
      stream: "fact",
      type: consentType,
      payload: { customer, phone: from, channel, at, source: "customer-message" },
    });
    if (error && error.code !== "23505") console.error("Could not append consent event", error);
  }

  return twiml();
});

function normalize(phone: string): string {
  const p = phone.replace(/[^\d+]/g, "");
  if (p.replace(/\D/g, "").length < 8) return "";
  return p.startsWith("+") ? p : `+${p}`;
}

async function validTwilioSignature(
  provided: string,
  url: string,
  form: FormData,
  token: string,
): Promise<boolean> {
  if (!provided) return false;
  const keys = [...new Set([...form.keys()])].sort();
  let data = url;
  for (const key of keys) {
    const values = form.getAll(key).map(String).sort();
    for (const value of values) data += key + value;
  }
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(token), { name: "HMAC", hash: "SHA-1" }, false, ["sign"],
  );
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  const expected = btoa(String.fromCharCode(...signed));
  return constantTimeEqual(expected, provided);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function stableUuid(seed: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)));
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function twiml(): Response {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { "Content-Type": "text/xml" },
  });
}
