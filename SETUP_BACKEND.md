# Setting up the real store (Supabase + Stripe + Resend)

The code is ready. What's left is creating three free accounts and pasting a
handful of keys into place — steps only you can do, since each requires your
own email/verification. Everything below is safe to do at your own pace; the
site keeps working locally while you set these up.

## 1. Supabase (database + backend functions)

1. Go to supabase.com and create a free account, then **New project**.
2. Once it's created, open **SQL Editor** (left sidebar) → **New query**, paste
   the entire contents of [supabase/01_schema.sql](supabase/01_schema.sql), and click **Run**.
   This creates the `orders`, `contact_messages`, and `reviews` tables.

   > 📋 For the full ordered list of every SQL script (there are 14), see
   > [supabase/README.md](supabase/README.md) — they're numbered `01_…` to `13_…`
   > plus a one-time `99_convert-to-dirham.sql`.
3. Go to **Project Settings → API**. Copy the **Project URL** and the
   **anon public** key.
4. In this project folder, copy `.env.example` to a new file named `.env`,
   and fill in:
   ```
   VITE_SUPABASE_URL=<your Project URL>
   VITE_SUPABASE_ANON_KEY=<your anon public key>
   ```
   (These two values are safe to share — you can paste them to me if you'd
   like me to fill the file in for you. Never share the **service_role**
   key or any Stripe/Resend secret key with anyone, including me.)

### Deploying the 3 backend functions

The functions live in `supabase/functions/create-checkout-session`,
`supabase/functions/stripe-webhook`, and `supabase/functions/send-contact-email`.

Easiest path (no install required):
1. In the Supabase dashboard, go to **Edge Functions → Create a function**,
   name it exactly `create-checkout-session`, and paste the contents of
   `supabase/functions/create-checkout-session/index.ts` into the editor. Deploy.
2. Repeat for `stripe-webhook` and `send-contact-email`.
3. Also create a function named `_shared` is not needed this way — instead,
   inline the two lines from `supabase/functions/_shared/cors.ts` directly at
   the top of each function if you use the dashboard editor (replace the
   `import { corsHeaders } from '../_shared/cors.ts'` line with the two
   `corsHeaders` lines from that file).

Alternative (CLI, if you're comfortable with a terminal):
```
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy send-contact-email
```

### Setting function secrets

In the dashboard: **Edge Functions → Manage secrets** (or via CLI:
`supabase secrets set KEY=value`). Add:
- `STRIPE_SECRET_KEY` — from Stripe (step 2 below)
- `STRIPE_WEBHOOK_SECRET` — from Stripe (step 2 below)
- `RESEND_API_KEY` — from Resend (step 3 below)
- `NOTIFICATION_EMAIL` — the email address that should receive order/contact
  notifications (currently `bomgala158@gmail.com` in `src/lib/constants.ts`)

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically by
Supabase inside Edge Functions — you don't need to set those yourself.)

## 2. Stripe (payments)

1. Create a free account at stripe.com.
2. Stay in **Test mode** (toggle top-right of the dashboard) — this lets you
   test the entire checkout flow with fake cards before ever handling real
   money. You can switch to Live mode later once Stripe verifies your
   business, at your own pace.
3. Go to **Developers → API keys** → copy the **Secret key** → set it as the
   `STRIPE_SECRET_KEY` secret above.
4. Go to **Developers → Webhooks → Add endpoint**. Endpoint URL is your
   deployed function's URL, which looks like:
   `https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook`
   Select the event `checkout.session.completed`. After creating it, copy the
   **Signing secret** shown → set it as `STRIPE_WEBHOOK_SECRET` above.
5. To test a full purchase later, use Stripe's test card `4242 4242 4242 4242`,
   any future expiry date, any 3-digit CVC.

## 3. Resend (order/contact emails)

1. Create a free account at resend.com.
2. Go to **API Keys → Create API Key** → copy it → set it as `RESEND_API_KEY`
   above.
3. For real launch, verify your own sending domain under **Domains** so
   emails come from your own address instead of Resend's shared test domain
   (`onboarding@resend.dev`, already wired in as the default sender — fine for
   testing, but swap it in `supabase/functions/stripe-webhook/index.ts` and
   `supabase/functions/send-contact-email/index.ts` once you have your domain).

## Once everything above is in place

Run the site locally (`npm run dev`), add a product to the cart, and go
through checkout with the Stripe test card. You should land back on the
confirmation page, see a new row in the `orders` table (Supabase → **Table
Editor**), and receive both emails. Same idea for the Contact form and
product reviews (`contact_messages` and `reviews` tables).

## 4. Admin panel — products, orders, messages & reviews (no code, no Table Editor)

The `/admin` panel now has four tabs, so you manage the whole store from one
private page:

- **Produits** — add/edit/delete products, drag-and-drop image upload
- **Commandes** — view every order, payment status, items and shipping address
- **Messages** — read contact-form messages, mark them as handled
- **Avis** — approve, hide or delete customer reviews (moderation)

It all builds on the same Supabase project.

**One-time setup:**

1. **Create the products table + image storage.** In Supabase → **SQL Editor**,
   paste and run [supabase/02_products-and-admin.sql](supabase/02_products-and-admin.sql).
   This adds the `products` table and a public `product-images` storage bucket.
2. **Import your existing 72 products.** Run once locally to generate the seed:
   ```
   node scripts/gen-products-seed.cjs
   ```
   Then paste the contents of the generated
   [supabase/03_products-seed.sql](supabase/03_products-seed.sql) into the SQL Editor and Run.
   (Re-run this only if you ever want to reset back to the original catalogue —
   it skips products that already exist.)
3. **Create your admin login.** In Supabase → **Authentication → Users →
   Add user**, create a user with your email and a password. That email +
   password is what you'll log in with. (Optionally turn off "Confirm email"
   under Authentication → Providers → Email so the account works immediately.)

**Using it:**

- Go to `votre-site.com/admin` (or `http://localhost:5173/admin` locally) and log in.
- Edit any field, drag an image onto the upload box, toggle "Meilleure vente" /
  "Nouveau", or click **+ Ajouter un produit**. Changes appear on the live site
  immediately — no code, no re-deploy.
- The public site always keeps working: if the database has no products (or
  Supabase isn't configured yet), it automatically falls back to the built-in
  catalogue, so nothing ever looks broken.

> Security note: only your logged-in admin account can change products or upload
> images (enforced by the database's row-level security). The public can only read.
