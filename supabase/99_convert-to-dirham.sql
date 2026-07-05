-- ⚠️ RUN THIS ONCE ONLY. Running it twice will double-convert your prices.
--
-- Converts prices that were entered in Euros into Moroccan Dirham using an
-- approximate rate of 1 € ≈ 10.8 DH, rounded to a whole Dirham. After running,
-- fine-tune any individual prices in the admin panel as you like.
--
-- Run in Supabase → SQL Editor → New query → Run.

-- Product prices
update products
set price = round(price * 10.8);

-- Delivery zone fees (if you added any city-specific shipping)
update delivery_zones
set fee = round(fee * 10.8),
    free_threshold = case when free_threshold is not null then round(free_threshold * 10.8) end;

-- Discount codes: convert fixed-amount values and minimum-basket thresholds.
-- Percentage codes are left untouched (a % doesn't change with currency).
update discount_codes
set value = case when type = 'fixed' then round(value * 10.8) else value end,
    min_subtotal = case when min_subtotal is not null then round(min_subtotal * 10.8) end;
