/**
 * Approved WhatsApp template catalog.
 *
 * The Twilio Content SIDs live only in Edge Function secrets. The client sends
 * one of these allow-listed purposes plus numbered variables, so a browser can
 * never choose an arbitrary Twilio template.
 */
export type WhatsAppTemplateKey =
  | "cod_confirmation"
  | "shipping_update"
  | "abandoned_cart"
  | "payment_reminder";

export interface WhatsAppTemplateDefinition {
  key: WhatsAppTemplateKey;
  label: string;
  purpose: string;
  variableLabels: readonly string[];
  body: string;
}

export const WHATSAPP_TEMPLATES: readonly WhatsAppTemplateDefinition[] = [
  {
    key: "cod_confirmation",
    label: "COD confirmation",
    purpose: "Confirm an order before courier handoff",
    variableLabels: ["Customer", "Order summary", "Total on delivery", "Business"],
    body: "Hello {{1}}, please confirm your order: {{2}}. Total on delivery: {{3}}. Reply YES to confirm or NO to cancel. Thank you from {{4}}.",
  },
  {
    key: "shipping_update",
    label: "Shipping update",
    purpose: "Share delivery progress and tracking",
    variableLabels: ["Customer", "Shipping status", "Tracking reference or link", "Business"],
    body: "Hello {{1}}, your order is now {{2}}. Tracking: {{3}}. Thank you from {{4}}.",
  },
  {
    key: "abandoned_cart",
    label: "Abandoned cart",
    purpose: "Help a customer finish a saved cart",
    variableLabels: ["Customer", "Cart summary", "Checkout link", "Business"],
    body: "Hello {{1}}, you left {{2}} in your cart. Complete your order here: {{3}}. Reply STOP to opt out. Thank you from {{4}}.",
  },
  {
    key: "payment_reminder",
    label: "Payment reminder",
    purpose: "Remind a customer about an unpaid invoice",
    variableLabels: ["Customer", "Amount due", "Due date", "Invoice reference", "Business"],
    body: "Hello {{1}}, this is a reminder that {{2}} for invoice {{4}} was due on {{3}}. Please reply if you need help. Thank you from {{5}}.",
  },
] as const;

export const whatsappTemplate = (key: WhatsAppTemplateKey): WhatsAppTemplateDefinition =>
  WHATSAPP_TEMPLATES.find((template) => template.key === key)!;

/** Trim and number values exactly as Twilio ContentVariables expects. */
export function numberedTemplateVariables(values: readonly string[]): Record<string, string> {
  return Object.fromEntries(values.map((value, index) => [String(index + 1), value.trim()]));
}

/** Human-readable Business Memory copy of the approved content. */
export function whatsappTemplatePreview(
  key: WhatsAppTemplateKey,
  variables: Record<string, string>,
): string {
  return whatsappTemplate(key).body.replace(/\{\{(\d+)\}\}/g, (_, number: string) => variables[number] || `{{${number}}}`);
}

