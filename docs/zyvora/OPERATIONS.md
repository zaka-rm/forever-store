# ZYVORA — Operations Runbook

Stone 7 of productization. How to keep ZYVORA healthy once real customers depend on it.
Companion to `DEPLOYMENT.md` (how to ship) — this is how to run.

## Backups & disaster recovery

- **Postgres backups**: Supabase takes daily automatic backups on paid plans; the free plan keeps
  none you can restore on demand. **Before onboarding the first paying customer, move the Supabase
  project to the Pro plan and enable Point-in-Time Recovery (PITR)** — Dashboard → Database → Backups.
- **The architecture is your second safety net**: Business Memory is append-only — there is no code
  path that updates or deletes events, so corruption by bug is structurally limited, and any
  customer can hold their own full export.
- **Quarterly restore drill**: restore a backup into a scratch project and open the app against it
  once. A backup you've never restored is a hope, not a backup.

## Monitoring — the weekly 10 minutes

| Check | Where | Healthy looks like |
|---|---|---|
| Client errors | Table Editor → `zyvora_client_errors` | Empty, or known issues already fixed |
| Edge Function failures | Dashboard → Edge Functions → Logs (ask-ai, send-message, zyvora-billing, zyvora-stripe-webhook) | No 5xx entries |
| Webhook delivery | Stripe Dashboard → Webhooks → endpoint | 100% delivered; retry any failed |
| Payment health | Stripe Dashboard → Subscriptions | No unexpected `past_due` pile-up |
| Database size / limits | Supabase Dashboard → Reports | Comfortably under plan limits |
| App up | Open the production URL | Landing + sign-in load |

Optional free uptime alarm: point UptimeRobot (or similar) at the production URL and the
`/welcome` page; it emails you if the site goes down.

## Incident response

1. **App down / blank page** — check Vercel status + latest deploy; roll back to the previous
   deployment in one click (Vercel → Deployments → ⋯ → Promote to Production).
2. **Sign-in or data failures** — check Supabase status page and project health; RLS mistakes show
   up as "permission denied" in the browser console and `zyvora_client_errors`.
3. **AI answers failing** — Edge Function logs for `ask-ai`; most common causes: GROQ_API_KEY
   secret missing/rotated, provider outage. The app degrades honestly to the deterministic
   assistant — this is by design, not an emergency.
4. **Messages not sending** — `send-message` logs + Twilio Console → Monitor → Logs. Sandbox
   recipients must have joined; production senders must be approved.
5. **Subscriptions out of sync** — Stripe webhook logs first (delivery failures), then
   `zyvora_subscriptions` rows. Stripe is the truth; the table is a mirror — replaying the webhook
   from Stripe Dashboard repairs the mirror.

## Secrets hygiene

- Secrets live in exactly two places: Supabase Edge Function secrets (server) and `zyvora/.env`
  (your machine, gitignored). Nowhere else — never in git, chat logs, or client code.
- Rotate immediately if a key ever leaks: Groq console, Twilio console, Stripe dashboard all
  support rotation; update the Supabase secret and redeploy nothing (functions read secrets live).
- `.env.production` guarantees production bundles carry no AI key; the release step includes a
  `gsk_` scan of `dist/`.

## Release discipline

Every release: `npm run build` clean → verify suite `ALL CHECKS PASSED` → deploy → open the
production URL once. SQL changes: additive files only (`44_...`, `45_...`), regenerate
`APPLY_ALL.sql`, apply in the SQL editor. Never edit an applied migration file.

## Support

- Every customer can self-export their Business Memory — no support ticket can hold data hostage.
- Keep a simple support address (currently lngwoow28@gmail.com; move to a product domain later).
- When a customer reports a bug, check `zyvora_client_errors` first — the stack trace is usually
  already there.
