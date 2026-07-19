import { useEffect, useMemo, useState } from "react";
import {
  WHATSAPP_TEMPLATES,
  numberedTemplateVariables,
  whatsappTemplate,
  whatsappTemplatePreview,
  type WhatsAppTemplateKey,
} from "../core/messageTemplates";
import { formatMoney } from "../core/engine";
import type { MemoryStore } from "../core/memory";
import { recordSentMessage, sendWhatsAppTemplate } from "../core/messaging";
import type { WorkspaceState } from "../core/types";
import { toast } from "./toast";

const dateLabel = (ts: number) => new Date(ts).toLocaleDateString(undefined, {
  day: "numeric", month: "short", year: "numeric",
});

const shippingLabel = (status?: string) => ({
  handed_to_courier: "handed to the courier",
  in_transit: "in transit",
  out_for_delivery: "out for delivery",
  delivery_failed: "waiting for delivery help",
  delivered: "delivered",
  returning: "being returned",
  returned: "returned",
}[status ?? ""] ?? "being prepared for shipping");

function defaultsFor(
  key: WhatsAppTemplateKey,
  customer: string,
  state: WorkspaceState,
  business: string,
): string[] {
  const customerOrders = state.orders
    .filter((order) => order.customer === customer)
    .sort((a, b) => b.createdAt - a.createdAt);
  const pending = customerOrders.find((order) => order.status === "pending") ?? customerOrders[0];
  const shipment = customerOrders.find((order) => order.shipmentStatus) ?? customerOrders[0];
  const invoice = state.invoices
    .filter((row) => row.customer === customer && !row.paidAt)
    .sort((a, b) => b.issuedAt - a.issuedAt)[0];

  if (key === "cod_confirmation") return [
    customer,
    pending?.lines.map((line) => `${line.qty}× ${line.productName}`).join(", ") ?? "your order",
    pending ? formatMoney(pending.lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0) - pending.discount + pending.shippingCharged) : "amount shown at checkout",
    business,
  ];
  if (key === "shipping_update") return [
    customer,
    shippingLabel(shipment?.shipmentStatus),
    shipment?.trackingUrl || shipment?.trackingNumber || (shipment ? `order ${shipment.orderId.slice(0, 8)}` : "tracking will follow"),
    business,
  ];
  if (key === "payment_reminder") return [
    customer,
    invoice ? formatMoney(invoice.amount) : "amount due",
    invoice ? dateLabel(invoice.issuedAt + invoice.dueDays * 86_400_000) : "the agreed due date",
    invoice?.invoiceId ?? "invoice reference",
    business,
  ];
  return [customer, "the items you selected", "paste checkout link", business];
}

export function WhatsAppTemplateComposer({
  customer, phone, state, memory, workspaceId, business, initialKey = "cod_confirmation",
}: {
  customer: string;
  phone: string;
  state: WorkspaceState;
  memory: MemoryStore;
  workspaceId: string;
  business: string;
  initialKey?: WhatsAppTemplateKey;
}) {
  const [key, setKey] = useState<WhatsAppTemplateKey>(initialKey);
  const initialValues = useMemo(() => defaultsFor(key, customer, state, business), [key, customer, state, business]);
  const [values, setValues] = useState<string[]>(initialValues);
  const [sending, setSending] = useState(false);

  useEffect(() => setValues(initialValues), [key, customer]); // reset when purpose or customer changes

  const definition = whatsappTemplate(key);
  const variables = numberedTemplateVariables(values);
  const preview = whatsappTemplatePreview(key, variables);
  const ready = Boolean(phone.trim()) && values.length === definition.variableLabels.length && values.every((value) => value.trim());

  const send = async () => {
    if (!ready) return;
    setSending(true);
    const result = await sendWhatsAppTemplate(phone, key, variables, { workspaceId, customer });
    setSending(false);
    if (!result.ok) { toast(`Couldn't send template: ${result.error}`); return; }
    recordSentMessage(memory, result, { customer, phone, body: preview, channel: "whatsapp" });
    toast(`${definition.label} template sent to ${customer}`);
  };

  return (
    <details className="template-composer">
      <summary>Send approved WhatsApp template</summary>
      <div className="template-composer-body">
        <div className="form-row">
          <div style={{ minWidth: 220 }}>
            <label htmlFor={`template-purpose-${customer}`}>Purpose</label>
            <select
              id={`template-purpose-${customer}`}
              value={key}
              onChange={(event) => setKey(event.target.value as WhatsAppTemplateKey)}
              style={{ width: "100%" }}
            >
              {WHATSAPP_TEMPLATES.map((template) => (
                <option key={template.key} value={template.key}>{template.label}</option>
              ))}
            </select>
          </div>
          <span className="confidence-note" style={{ margin: 0 }}>{definition.purpose}. Works outside the 24-hour reply window after Meta approval.</span>
        </div>
        <div className="template-fields">
          {definition.variableLabels.map((label, index) => (
            <div key={label}>
              <label htmlFor={`template-${key}-${index}-${customer}`}>{label}</label>
              <input
                id={`template-${key}-${index}-${customer}`}
                value={values[index] ?? ""}
                onChange={(event) => setValues((current) => current.map((value, i) => i === index ? event.target.value : value))}
                placeholder={label}
              />
            </div>
          ))}
        </div>
        <div className="template-preview"><strong>Approved content preview</strong><span>{preview}</span></div>
        <div className="row-actions">
          <button className="btn mini" disabled={!ready || sending} onClick={() => void send()}>
            {sending ? "Sending…" : `Send ${definition.label}`}
          </button>
          {!phone.trim() && <span className="confidence-note" style={{ margin: 0 }}>Add a customer phone first.</span>}
        </div>
      </div>
    </details>
  );
}

