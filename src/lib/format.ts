// Central currency formatting. Change CURRENCY_SYMBOL here to switch the symbol
// shown across the whole site (storefront, cart, checkout, admin, receipts).
// 'DH' = Moroccan Dirham (درهم).
export const CURRENCY_SYMBOL = 'DH'

/** Formats an amount with the site currency, e.g. formatPrice(380) → "380.00 DH". */
export function formatPrice(amount: number, decimals: 0 | 2 = 2): string {
  return `${(Number(amount) || 0).toFixed(decimals)} ${CURRENCY_SYMBOL}`
}
