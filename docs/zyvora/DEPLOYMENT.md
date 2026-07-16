# ZYVORA — Production Deployment Runbook

Status: Stone 3 of productization. App is deploy-ready; hosting is Vercel (free tier is fine to start).

## Architecture in production

```
Browser (Vercel-hosted static app, NO secrets in bundle)
   │  Supabase auth token
   ▼
Supabase ── Postgres + RLS (business memory, teams, error telemetry)
         ── Edge Function ask-ai        (holds GROQ_API_KEY)
         ── Edge Function send-message  (holds TWILIO_* secrets)
```

- `zyvora/.env.production` blanks `VITE_GROQ_API_KEY` so no production build can ever embed the AI key. Verified by scanning `dist/` for `gsk_` after build.
- Supabase URL + publishable anon key are safe to embed (public by design; RLS protects data).
- `zyvora/vercel.json` carries SPA rewrites, immutable asset caching, and security headers.

## One-time setup (owner)

1. **Supabase schema** — paste `supabase/APPLY_ALL.sql` into the SQL editor of the project (idempotent; safe to re-run after updates).
2. **Edge Functions** (needs `supabase login` + `supabase link --project-ref muzweildgqhlchkxeshr`):
   ```powershell
   supabase functions deploy ask-ai
   supabase functions deploy send-message
   supabase functions deploy zyvora-billing
   supabase functions deploy zyvora-stripe-webhook --no-verify-jwt
   supabase secrets set GROQ_API_KEY=<gsk_...>
   supabase secrets set TWILIO_ACCOUNT_SID=<AC...> TWILIO_AUTH_TOKEN=<...> TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   supabase secrets set STRIPE_SECRET_KEY=<sk_...> STRIPE_PRICE_ID=<price_...> APP_URL=<https://your-app-url>
   supabase secrets set ZYVORA_STRIPE_WEBHOOK_SECRET=<whsec_...>
   ```
   NOTE: `stripe-webhook` (no prefix) belongs to the parent Naturaloe store — never redeploy it with ZYVORA code.

### Stripe setup (billing)

1. stripe.com → create the product **ZYVORA Pro** with one monthly recurring price → copy the `price_...` id into `STRIPE_PRICE_ID`.
2. Developers → API keys → copy the secret key into `STRIPE_SECRET_KEY` (test keys first; swap to live when ready).
3. Developers → Webhooks → Add endpoint `https://<project-ref>.supabase.co/functions/v1/zyvora-stripe-webhook`
   with events `checkout.session.completed`, `customer.subscription.created/updated/deleted`;
   copy the signing secret into `ZYVORA_STRIPE_WEBHOOK_SECRET`.
4. Model: 14-day free trial (in-app from workspace creation; Stripe adds its own 14-day trial at checkout),
   one plan, cancel via the Stripe Billing Portal ("Manage subscription" button in the app's Billing view).
   Local device mode is free forever; expiry never blocks reading or exporting data.

### Landing page

Static, dependency-free: `zyvora/public/landing.html`, served at `/landing.html` and `/welcome`
(rewrite in `vercel.json`). Point the marketing domain there; "Start free" links to the app root.
3. **Deploy the app** — from `zyvora/`:
   ```powershell
   npm run build          # verify it passes and ends with the CLEAN key scan habit
   npx vercel --prod      # first run: log in, accept defaults (framework Vite, output dist)
   ```
   Or connect the repo on vercel.com and set **Root Directory = `zyvora`**; add env vars
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Project Settings (do NOT add the Groq key).
4. **Auth redirect** — in Supabase Dashboard → Authentication → URL Configuration, set Site URL to the Vercel URL (and later the custom domain) so email confirmation/password-reset links land on the live app.

## Each release

```powershell
cd zyvora
npm run build                                   # must pass clean
# verify suite:
.\node_modules\.bin\esbuild.cmd scripts/verify.ts --bundle --platform=node --format=cjs --outfile=scripts/verify.cjs
node scripts/verify.cjs                          # must print ALL CHECKS PASSED
npx vercel --prod
```
If SQL changed: re-run `supabase/build-apply-all.ps1`, paste `APPLY_ALL.sql` in the SQL editor.
If an Edge Function changed: `supabase functions deploy <name>`.

## Custom domain (when ready)

Vercel → Project → Domains → add e.g. `app.zyfora.com`; point DNS CNAME as instructed. Update the Supabase Site URL to match.

## Monitoring

- Client errors land in the `zyvora_client_errors` table (insert-only; see `supabase/42_zyvora_telemetry.sql`). Check it weekly: Supabase Dashboard → Table Editor.
- Edge Function logs: Dashboard → Edge Functions → Logs.
