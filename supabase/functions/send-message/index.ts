// ZYVORA — WhatsApp/SMS sender (Supabase Edge Function).
// Canonical (governance/): CAP-000010 Notifications — FEAT-000077 channel routing.
//
// WHY A SERVER FUNCTION: Twilio's Account SID + Auth Token are powerful secrets and
// Twilio rejects browser calls (CORS). This function holds the secrets server-side,
// requires a signed-in ZYVORA user, and relays the send to Twilio.
//
// Deploy:  supabase functions deploy send-message
// Secrets: supabase secrets set TWILIO_ACCOUNT_SID=ACxxx TWILIO_AUTH_TOKEN=xxx \
//                               TWILIO_WHATSAPP_FROM=whatsapp:+14155238886 TWILIO_SMS_FROM=+1xxx
//
// Sandbox note: for the WhatsApp sandbox, the recipient must first join by sending
// the "join <code>" message to the sandbox number from their WhatsApp.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // 1. Require an authenticated ZYVORA user (so only your team can send).
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Not authenticated" }, 401);

  // 2. Validate input.
  let payload: { to?: string; body?: string; channel?: "whatsapp" | "sms" };
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const to = (payload.to ?? "").trim();
  const body = (payload.body ?? "").trim();
  const channel = payload.channel === "sms" ? "sms" : "whatsapp";
  if (!to || !body) return json({ error: "Missing 'to' or 'body'" }, 400);

  // 3. Resolve Twilio config.
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = channel === "whatsapp"
    ? Deno.env.get("TWILIO_WHATSAPP_FROM")
    : Deno.env.get("TWILIO_SMS_FROM");
  if (!sid || !token || !from) return json({ error: "Twilio not configured (set the function secrets)" }, 500);

  const toAddr = channel === "whatsapp"
    ? (to.startsWith("whatsapp:") ? to : `whatsapp:${normalize(to)}`)
    : normalize(to);

  // 4. Send via Twilio.
  const form = new URLSearchParams({ To: toAddr, From: from, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${sid}:${token}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) return json({ error: data?.message ?? "Twilio error", code: data?.code }, 502);
  return json({ ok: true, sid: data.sid, status: data.status });
});

function normalize(phone: string): string {
  const p = phone.replace(/[^\d+]/g, "");
  return p.startsWith("+") ? p : `+${p}`;
}
function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
