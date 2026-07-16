// ZYVORA — AI proxy (Supabase Edge Function).
// Canonical (governance/): CAP-000003 AI Engine — FEAT-000017 model gateway.
//
// WHY A SERVER FUNCTION: the Groq API key must never ship in the browser bundle
// (anyone could extract it and spend on your account). This function holds the
// key server-side, requires a signed-in ZYVORA user, and relays the chat call.
//
// Deploy:  supabase functions deploy ask-ai
// Secrets: supabase secrets set GROQ_API_KEY=gsk_xxx
//          (optional) supabase secrets set GROQ_MODEL=llama-3.3-70b-versatile

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MAX_CONTEXT = 20_000; // chars — the business brief is small; cap abuse
const MAX_QUESTION = 2_000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // 1. Require an authenticated ZYVORA user.
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Not authenticated" }, 401);

  // 2. Validate input.
  let payload: {
    question?: string;
    businessContext?: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const question = (payload.question ?? "").trim().slice(0, MAX_QUESTION);
  const businessContext = (payload.businessContext ?? "").slice(0, MAX_CONTEXT);
  if (!question) return json({ error: "Missing 'question'" }, 400);
  const history = Array.isArray(payload.history)
    ? payload.history
        .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_QUESTION) }))
    : [];

  // 3. Resolve config.
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) return json({ error: "AI not configured (set the GROQ_API_KEY secret)" }, 500);
  const model = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";

  // 4. Grounded system prompt — same constitutional bar as the client had.
  const system =
    "You are ZYVORA, a calm, honest business advisor for a small Cash-on-Delivery e-commerce store. " +
    "Answer ONLY from the BUSINESS CONTEXT provided below. If the answer isn't in the context, say plainly " +
    "that you don't have that data yet — never invent numbers, customers, or products. Be concise (2-4 sentences), " +
    "practical, and decision-focused. Money is already formatted; quote figures exactly as given. Do not perform " +
    "your own arithmetic on figures unless the context asks you to; prefer the numbers as stated." +
    `\n\n=== BUSINESS CONTEXT ===\n${businessContext}`;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...history, { role: "user", content: question }],
      temperature: 0.2,
      max_tokens: 500,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return json({ error: `LLM error ${res.status}: ${text.slice(0, 200)}` }, 502);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return json({ error: "LLM returned an empty response." }, 502);
  return json({ ok: true, answer: String(content).trim(), model });
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
