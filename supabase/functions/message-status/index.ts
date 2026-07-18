// ZYVORA — signed, idempotent Twilio delivery-status webhook.
// The workspace query parameter is added only by send-message and is covered by
// Twilio's request signature. The sender binding is checked again before append.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED = new Set(["accepted", "queued", "sending", "sent", "delivered", "read", "undelivered", "failed", "canceled"]);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const form = await req.formData().catch(() => null);
  if (!form) return new Response("Bad request", { status: 400 });

  const token = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const signature = req.headers.get("x-twilio-signature") ?? "";
  if (!token || !(await validTwilioSignature(signature, req.url, form, token))) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId") ?? "";
  const messageId = String(form.get("MessageSid") ?? form.get("SmsSid") ?? "").trim();
  const status = String(form.get("MessageStatus") ?? form.get("SmsStatus") ?? "").trim().toLowerCase();
  const fromRaw = String(form.get("From") ?? "");
  const from = normalize(fromRaw.replace(/^whatsapp:/i, ""));
  const channel = /^whatsapp:/i.test(fromRaw) ? "whatsapp" : "sms";
  if (!/^[0-9a-f-]{36}$/i.test(workspaceId) || !messageId || !ALLOWED.has(status) || !from) {
    return new Response("Bad request", { status: 400 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: binding } = await admin
    .from("zyvora_channel_bindings")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("channel", channel)
    .eq("address", from)
    .maybeSingle();
  if (!binding) return new Response("Unknown sender", { status: 403 });

  const at = Date.now();
  const id = await stableUuid(`twilio-status:${messageId}:${status}`);
  const { error } = await admin.from("zyvora_events").insert({
    id, workspace_id: workspaceId, ts: at, stream: "fact", type: "message_status_changed",
    payload: {
      messageId, twilioSid: messageId, status,
      errorCode: String(form.get("ErrorCode") ?? "") || undefined,
      errorMessage: String(form.get("ErrorMessage") ?? "") || undefined,
      at,
    },
  });
  if (error && error.code !== "23505") {
    console.error("Could not append message status", error);
    return new Response("Temporary failure", { status: 500 });
  }
  return new Response("ok");
});

function normalize(phone: string): string {
  const p = phone.replace(/[^\d+]/g, "");
  if (p.replace(/\D/g, "").length < 8) return "";
  return p.startsWith("+") ? p : `+${p}`;
}

async function validTwilioSignature(provided: string, url: string, form: FormData, token: string): Promise<boolean> {
  if (!provided) return false;
  const keys = [...new Set([...form.keys()])].sort();
  let data = url;
  for (const key of keys) for (const value of form.getAll(key).map(String).sort()) data += key + value;
  const hmacKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(token), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(data)));
  const expected = btoa(String.fromCharCode(...signed));
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
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
