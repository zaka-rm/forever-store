/**
 * Deep links — lets the command palette (or any surface) open an exact record
 * in a view: the customer's profile, the product's editor row, the order's
 * detail expansion. A one-shot handoff: the target view consumes it on mount.
 */
export type DeepLinkType = "customer" | "product" | "order";

let pending: { type: DeepLinkType; key: string } | null = null;

export function setDeepLink(type: DeepLinkType, key: string): void {
  pending = { type, key };
}

/** Returns the key if a deep link of this type is waiting, and clears it. */
export function consumeDeepLink(type: DeepLinkType): string | null {
  if (pending && pending.type === type) {
    const k = pending.key;
    pending = null;
    return k;
  }
  return null;
}
