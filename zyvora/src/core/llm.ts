/**
 * Model Gateway (CAP-000003 AI Engine — FEAT-000017 model gateway, FEAT-000019
 * retrieval). The model is a swappable dependency (CODEX 00 F.8): it is given
 * ONLY a factual business-context brief built from real projections and
 * instructed to answer from it, never invent figures, and admit ignorance — so
 * the constitutional bar (grounded, honest, explainable) holds even with a
 * generative model.
 *
 * SECURITY MODEL (production): the API key lives ONLY in the `ask-ai` Supabase
 * Edge Function (secret `GROQ_API_KEY`); the browser calls the function with the
 * user's auth token and never sees the key. The direct-key path below exists
 * solely for local development without an account (VITE_GROQ_API_KEY) and is
 * embedded in the bundle — never ship a production build that relies on it.
 */
import { cloudConfigured, supabase } from "./cloud";

const DEV_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const DEV_MODEL = (import.meta.env.VITE_GROQ_MODEL as string | undefined) || "llama-3.3-70b-versatile";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/** AI is available via the server proxy (account mode) or a local dev key. */
export const llmConfigured = cloudConfigured || Boolean(DEV_KEY);

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PREAMBLE =
  "You are ZYVORA, a calm, honest business advisor for a small Cash-on-Delivery e-commerce store. " +
  "Answer ONLY from the BUSINESS CONTEXT provided below. If the answer isn't in the context, say plainly " +
  "that you don't have that data yet — never invent numbers, customers, or products. Be concise (2-4 sentences), " +
  "practical, and decision-focused. Money is already formatted; quote figures exactly as given. Do not perform " +
  "your own arithmetic on figures unless the context asks you to; prefer the numbers as stated.";

/**
 * Answer a question with the LLM, grounded on a business-context brief.
 * Prefers the secure `ask-ai` Edge Function (key stays server-side); falls back
 * to the local dev key only when no Supabase session exists.
 * Returns the assistant's text, or throws on network/API error.
 */
export async function askLlm(
  question: string,
  businessContext: string,
  history: ChatMessage[] = []
): Promise<string> {
  // Server route: signed-in cloud mode → secure Edge Function.
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase.functions.invoke("ask-ai", {
        body: {
          question,
          businessContext,
          history: history.slice(-6).filter((m) => m.role !== "system"),
        },
      });
      if (error) {
        // If the function isn't deployed yet, fall through to the dev key (if any).
        if (!DEV_KEY) throw new Error(`AI service error: ${error.message}`);
      } else if (data && (data as { ok?: boolean }).ok) {
        return String((data as { answer?: string }).answer ?? "").trim();
      } else if (!DEV_KEY) {
        throw new Error((data as { error?: string })?.error ?? "AI service failed.");
      }
    }
  }

  // Dev-only direct route (key embedded in bundle — local use only).
  if (!DEV_KEY) throw new Error("AI needs account mode (sign in) or a local dev key.");
  const messages: ChatMessage[] = [
    { role: "system", content: `${SYSTEM_PREAMBLE}\n\n=== BUSINESS CONTEXT ===\n${businessContext}` },
    ...history.slice(-6),
    { role: "user", content: question },
  ];
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEV_KEY}` },
    body: JSON.stringify({ model: DEV_MODEL, messages, temperature: 0.2, max_tokens: 500 }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned an empty response.");
  return String(content).trim();
}

export const llmModel = DEV_MODEL;
