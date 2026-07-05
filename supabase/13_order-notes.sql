-- Run in Supabase → SQL Editor → New query → Run.
-- Adds a free-text "notes" field to orders for the customer's delivery
-- instructions (e.g. "call before arriving", nearest landmark, floor).
alter table orders add column if not exists notes text;
