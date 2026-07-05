-- Run in Supabase → SQL Editor → New query → Run.
-- Adds a "hidden" flag so the admin can hide/show a product on the public site
-- without deleting it. NULL/false = visible; true = hidden (admin only).
alter table products add column if not exists hidden boolean not null default false;
