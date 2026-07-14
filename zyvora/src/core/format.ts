/**
 * Money formatting — global-first (ZPL-040 amendment, 2026-07-11).
 * No currency is hardcoded anywhere in the platform: each Workspace chooses its
 * currency at onboarding (§1/§15) and every surface formats through this module
 * using the platform's Intl support, so any ISO 4217 currency works.
 */

let activeCurrency = "USD";

export function setActiveCurrency(code: string): void {
  activeCurrency = code;
}

export function getActiveCurrency(): string {
  return activeCurrency;
}

export function money(amount: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: activeCurrency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Unknown code (custom/legacy): fall back to plain formatting with the code.
    return `${Math.round(amount).toLocaleString()} ${activeCurrency}`;
  }
}

/** Currencies offered in onboarding — a convenience list, not a limit; any ISO code may be typed. */
export const COMMON_CURRENCIES: { code: string; label: string }[] = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "MAD", label: "MAD — Moroccan Dirham" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "SAR", label: "SAR — Saudi Riyal" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "NGN", label: "NGN — Nigerian Naira" },
  { code: "XOF", label: "XOF — West African CFA Franc" },
  { code: "BRL", label: "BRL — Brazilian Real" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "TRY", label: "TRY — Turkish Lira" },
];
