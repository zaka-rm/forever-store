/**
 * Error telemetry (CAP-000004 — FEAT-000032 audit & observability).
 * When the app breaks on a user's machine, the vendor can see it: reports go to
 * the append-only `zyvora_client_errors` table (insert-only RLS; clients can
 * never read, edit, or delete reports). Local mode logs to the console only —
 * no data leaves the machine without an account.
 *
 * Privacy: we send the error message/stack and coarse environment info, never
 * Business Memory contents.
 */
import { supabase } from "./cloud";

export const APP_VERSION = "0.1.0";

const seen = new Set<string>();
let sentThisSession = 0;
const MAX_PER_SESSION = 10; // a crash loop must not flood the table

export function reportError(err: unknown, place: string, workspaceId?: string): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack ?? null : null;
  // eslint-disable-next-line no-console
  console.error(`[zyvora:${place}]`, err);

  if (!supabase) return;
  const key = `${place}:${message}`;
  if (seen.has(key) || sentThisSession >= MAX_PER_SESSION) return;
  seen.add(key);
  sentThisSession++;

  void (async () => {
    try {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return; // insert policy requires auth; anonymous errors stay local
      await supabase!.from("zyvora_client_errors").insert({
        user_id: user.id,
        workspace_id: workspaceId ?? null,
        message: message.slice(0, 2000),
        stack: stack ? stack.slice(0, 8000) : null,
        place: place.slice(0, 200),
        app_version: APP_VERSION,
        user_agent: navigator.userAgent.slice(0, 300),
      });
    } catch {
      // Telemetry must never break the app or spam the console further.
    }
  })();
}

/** Install global handlers once (uncaught errors + unhandled promise rejections). */
export function installTelemetry(): void {
  window.addEventListener("error", (e) => reportError(e.error ?? e.message, "window.onerror"));
  window.addEventListener("unhandledrejection", (e) => reportError(e.reason, "unhandledrejection"));
}
