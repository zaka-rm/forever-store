-- Run in Supabase → SQL Editor → New query → Run.
-- Adds extra product photos (a gallery) shown on the product page, in addition
-- to the main image. Stored as a list of image URLs.
alter table products add column if not exists gallery text[];
