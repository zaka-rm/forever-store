# Supabase setup — recreating your project the easy way

You lost the Naturaloe project. Here is how to bring it back **without pasting 33 files one by one.**

## The easy way (one paste)

1. Go to [supabase.com](https://supabase.com) → **New project**. Give it a name and a database password. Wait for it to finish provisioning.
2. Open the new project → **SQL Editor** → **New query**.
3. Open **`supabase/APPLY_ALL.sql`** (in this repo), select all, copy, paste into the editor, and click **Run**.
   - This one file contains every schema step (all 33 `.sql` files) in the right order, so the whole store **and** the ZYVORA app tables are created in a single run.
4. In the project's **Settings → API**, copy the **Project URL** and the **anon public** key.
5. Put them in your `.env` files (root `.env` for the store, `zyvora/.env` for the ZYVORA app):
   ```
   VITE_SUPABASE_URL=https://YOUR-NEW-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-NEW-ANON-KEY
   ```
6. Restart the dev servers. Done.

## If you change the SQL later

`APPLY_ALL.sql` is auto-generated. After editing or adding a `NN_something.sql` file, regenerate it:

```powershell
cd supabase
powershell -File build-apply-all.ps1
```

## Notes

- `APPLY_ALL.sql` is meant for a **fresh** project. Running it twice on the same project will error on `CREATE TABLE` (that's expected — it's a first-time setup file, not a migration runner).
- The store uses tables from `01`–`30` and `99`; the ZYVORA app only needs `40_zyvora.sql` (already included). If you only want ZYVORA, you can paste just that one file instead.
- Your **data** is not in these files — they create empty tables. Product/order data you export from ZYVORA (Business Memory export) or import via the app's CSV import is separate.
