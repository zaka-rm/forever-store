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

const TEMPLATE_SECRETS = {
  cod_confirmation: "TWILIO_CONTENT_SID_COD_CONFIRMATION",
  shipping_update: "TWILIO_CONTENT_SID_SHIPPING_UPDATE",
  abandoned_cart: "TWILIO_CONTENT_SID_ABANDONED_CART",
  payment_reminder: "TWILIO_CONTENT_SID_PAYMENT_REMINDER",
} as const;
type TemplateKey = keyof typeof TEMPLATE_SECRETS;
const TEMPLATE_VARIABLE_COUNTS: Record<TemplateKey, number> = {
  cod_confirmation: 4,
  shipping_update: 4,
  abandoned_cart: 4,
  payment_reminder: 5,
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

  // 2. Validate input. The workspace is mandatory: authentication alone does
  // not prove the user belongs to the business whose Twilio account is used.
  let payload: {
    to?: string; body?: string; channel?: "whatsapp" | "sms"; workspaceId?: string; customer?: string;
    templateKey?: string; variables?: Record<string, unknown>;
  };
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const to = (payload.to ?? "").trim();
  const body = (payload.body ?? "").trim();
  const workspaceId = (payload.workspaceId ?? "").trim();
  const customer = (payload.customer ?? "").trim();
  const channel = payload.channel === "sms" ? "sms" : "whatsapp";
  const templateKey = payload.templateKey?.trim() as TemplateKey | undefined;
  const isTemplate = Boolean(templateKey);
  if (!to || !workspaceId || (!body && !isTemplate)) return json({ error: "Missing 'to', message content, or 'workspaceId'" }, 400);
  if (isTemplate && channel !== "whatsapp") return json({ error: "Approved templates are WhatsApp-only" }, 400);
  if (isTemplate && !(templateKey! in TEMPLATE_SECRETS)) return json({ error: "Unknown approved template" }, 400);
  if (!/^[0-9a-f-]{36}$/i.test(workspaceId)) return json({ error: "Invalid workspace" }, 400);
  if (body.length > 4096) return json({ error: "Message is too long" }, 400);
  const normalizedTo = normalize(to.replace(/^whatsapp:/i, ""));
  if (!/^\+[1-9]\d{7,14}$/.test(normalizedTo)) return json({ error: "Use a valid international phone number" }, 400);

  // 3. Require an operational role in this exact workspace. Viewers can read,
  // but cannot trigger a paid external action.
  const { data: role, error: roleError } = await supabase.rpc("zyvora_role", { ws: workspaceId });
  if (roleError || !["owner", "manager", "staff"].includes(role ?? "")) {
    return json({ error: "You do not have permission to send from this workspace" }, 403);
  }

  // 4. Respect the latest consent event for either the customer or this phone.
  // STOP is effective even when an inbound number has not yet been matched to a
  // customer record. START can later reverse it because the newest event wins.
  const { data: consentRows, error: consentError } = await supabase
    .from("zyvora_events")
    .select("type,ts,payload")
    .eq("workspace_id", workspaceId)
    .in("type", ["customer_opted_out", "customer_opted_in"])
    .order("ts", { ascending: false })
    .limit(1000);
  if (consentError) return json({ error: "Could not verify messaging consent" }, 503);
  const consent = (consentRows ?? []).find((row: { payload?: { customer?: string; phone?: string } }) => {
    const p = row.payload ?? {};
    const sameCustomer = customer && p.customer === customer;
    let samePhone = false;
    try { samePhone = Boolean(p.phone) && normalize(String(p.phone).replace(/^whatsapp:/i, "")) === normalizedTo; } catch { samePhone = false; }
    return sameCustomer || samePhone;
  });
  if (consent?.type === "customer_opted_out") {
    return json({ error: "This customer opted out of messages" }, 409);
  }

  // 5. Resolve Twilio config.
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = channel === "whatsapp"
    ? Deno.env.get("TWILIO_WHATSAPP_FROM")
    : Deno.env.get("TWILIO_SMS_FROM");
  if (!sid || !token || !from) return json({ error: "Twilio not configured (set the function secrets)" }, 500);

  const toAddr = channel === "whatsapp"
    ? `whatsapp:${normalizedTo}`
    : normalizedTo;

  // 6. Send via Twilio.
  const form = new URLSearchParams({ To: toAddr, From: from });
  if (isTemplate) {
    const variables = validateTemplateVariables(payload.variables, TEMPLATE_VARIABLE_COUNTS[templateKey!]);
    if (!variables) return json({ error: "Template variables must be numbered, complete, and non-empty" }, 400);
    const contentSid = Deno.env.get(TEMPLATE_SECRETS[templateKey!]);
    if (!contentSid || !/^HX[a-f0-9]{32}$/i.test(contentSid)) {
      return json({ error: `Approved template is not configured (${TEMPLATE_SECRETS[templateKey!]})` }, 500);
    }
    form.set("ContentSid", contentSid);
    form.set("ContentVariables", JSON.stringify(variables));
  } else {
    form.set("Body", body);
  }
  const statusCallbackBase = Deno.env.get("TWILIO_STATUS_CALLBACK_URL");
  if (statusCallbackBase) {
    const callback = new URL(statusCallbackBase);
    callback.searchParams.set("workspaceId", workspaceId);
    form.set("StatusCallback", callback.toString());
  }
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
  return json({ ok: true, sid: data.sid, status: data.status, templateKey });
});

function validateTemplateVariables(input: Record<string, unknown> | undefined, expectedCount: number): Record<string, string> | null {
  if (!input || Array.isArray(input)) return null;
  const keys = Object.keys(input).sort((a, b) => Number(a) - Number(b));
  if (keys.length !== expectedCount || keys.some((key, index) => key !== String(index + 1))) return null;
  const values: Record<string, string> = {};
  let total = 0;
  for (const key of keys) {
    if (typeof input[key] !== "string") return null;
    const value = String(input[key]).trim();
    total += value.length;
    if (!value || value.length > 1024 || total > 4096) return null;
    values[key] = value;
  }
  return values;
}

function normalize(phone: string): string {
  const p = phone.replace(/[^\d+]/g, "");
  return p.startsWith("+") ? p : `+${p}`;
}
function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
