/**
 * Demo seed — six months of a small wholesale/retail business, shaped so each
 * Business Brain has something honest to say (used by "Explore with demo data").
 * All facts are appended through Business Memory like any real entry.
 */
import type { MemoryStore } from "./memory";
import { DAY } from "./projections";
import type { OrderLine, OrderStatus } from "./types";

export function seedDemoData(memory: MemoryStore): void {
  const now = Date.now();
  const at = (daysAgo: number) => now - daysAgo * DAY;
  let n = 0;
  const invoice = (
    customer: string,
    amount: number,
    daysAgo: number,
    dueDays: number,
    paidDaysAgo?: number
  ) => {
    const invoiceId = `INV-${String(++n).padStart(3, "0")}`;
    memory.append(
      "fact",
      "invoice_issued",
      { invoiceId, customer, amount, issuedAt: at(daysAgo), dueDays },
      at(daysAgo)
    );
    if (paidDaysAgo !== undefined) {
      memory.append("fact", "invoice_paid", { invoiceId, paidAt: at(paidDaysAgo) }, at(paidDaysAgo));
    }
  };
  const expense = (label: string, amount: number, daysAgo: number) => {
    memory.append(
      "fact",
      "expense_recorded",
      { expenseId: crypto.randomUUID(), label, amount, date: at(daysAgo) },
      at(daysAgo)
    );
  };

  // --- Atlas Retail: the big customer whose orders dipped (drives the revenue-dip insight)
  invoice("Atlas Retail", 3400, 115, 30, 90);
  invoice("Atlas Retail", 3100, 85, 30, 60);
  invoice("Atlas Retail", 3600, 55, 30, 30);
  invoice("Atlas Retail", 900, 22, 30, 5); // sharp drop in the last 30 days

  // --- Marlowe & Co: steady regular
  invoice("Marlowe & Co", 1150, 110, 14, 100);
  invoice("Marlowe & Co", 1200, 80, 14, 70);
  invoice("Marlowe & Co", 1100, 50, 14, 40);
  invoice("Marlowe & Co", 1250, 20, 14, 8);

  // --- Harbor Café: regular rhythm (~25 days), now silent 70 days → churn signal
  invoice("Harbor Café", 640, 145, 14, 135);
  invoice("Harbor Café", 690, 120, 14, 110);
  invoice("Harbor Café", 655, 95, 14, 85);
  invoice("Harbor Café", 700, 70, 14, 60);

  // --- Nordwind GmbH: two open invoices, one well overdue
  invoice("Nordwind GmbH", 1800, 48, 14); // 34 days overdue
  invoice("Nordwind GmbH", 950, 18, 14); // just past due

  // --- Expenses: steady monthly rhythm (drives runway calculation)
  for (const d of [88, 58, 28]) {
    expense("Rent & utilities", 1450, d);
    expense("Supplier payments", 2600, d - 3);
    expense("Wages (part-time help)", 1900, d - 6);
    expense("Software & fees", 240, d - 8);
  }

  // --- Products
  memory.append(
    "fact",
    "product_added",
    {
      productId: "P-001",
      name: "Ceramic Mug — Classic",
      stock: 18,
      weeklySales: 12,
      leadTimeDays: 14,
      unitCost: 4.2,
      price: 12.5,
    },
    at(160)
  );
  memory.append(
    "fact",
    "product_added",
    {
      productId: "P-002",
      name: "Oak Serving Board",
      stock: 46,
      weeklySales: 6,
      leadTimeDays: 21,
      unitCost: 9.8,
      price: 24.0,
    },
    at(160)
  );
  memory.append(
    "fact",
    "product_added",
    {
      productId: "P-003",
      name: "Linen Tote (old print)",
      stock: 40,
      weeklySales: 0,
      leadTimeDays: 30,
      unitCost: 6.5,
      price: 18.0,
    },
    at(200)
  );

  // --- COD order book (Wave 1): deliveries, remittances, refusals, one in flight
  const MUG: Omit<OrderLine, "qty"> = { productId: "P-001", productName: "Ceramic Mug — Classic", unitPrice: 12.5, unitCost: 4.2 };
  const BOARD: Omit<OrderLine, "qty"> = { productId: "P-002", productName: "Oak Serving Board", unitPrice: 24.0, unitCost: 9.8 };

  // A deliberately reckless promo: 15% off with no minimum basket — small COD
  // baskets can't cover fixed shipping/fees, so it loses money (drives the
  // marketing brain's promo-profitability insight).
  memory.append(
    "fact",
    "promo_created",
    {
      promoId: "PROMO-001",
      code: "WELCOME15",
      type: "percentage",
      value: 15,
      minBasket: 0,
      usageLimit: 50,
      createdAt: at(30),
    },
    at(30)
  );

  let ordN = 0;
  const order = (
    customer: string,
    lines: OrderLine[],
    createdDaysAgo: number,
    path: { status: OrderStatus; daysAgo: number }[],
    costs: { discount?: number; shipCharged?: number; shipCost?: number; codFee?: number; packaging?: number; promoCode?: string },
    cashDaysAgo?: number
  ) => {
    const orderId = `ORD-${String(++ordN).padStart(3, "0")}`;
    memory.append(
      "fact",
      "order_created",
      {
        orderId,
        customer,
        lines,
        discount: costs.discount ?? 0,
        shippingCharged: costs.shipCharged ?? 0,
        shippingCost: costs.shipCost ?? 0,
        codFee: costs.codFee ?? 0,
        packagingCost: costs.packaging ?? 0,
        createdAt: at(createdDaysAgo),
        ...(costs.promoCode ? { promoCode: costs.promoCode } : {}),
      },
      at(createdDaysAgo)
    );
    for (const step of path) {
      memory.append(
        "fact",
        "order_status_changed",
        { orderId, status: step.status, at: at(step.daysAgo) },
        at(step.daysAgo)
      );
    }
    if (cashDaysAgo !== undefined) {
      memory.append("fact", "order_cash_received", { orderId, at: at(cashDaysAgo) }, at(cashDaysAgo));
    }
  };

  const delivered = (d1: number, d2: number, d3: number): { status: OrderStatus; daysAgo: number }[] => [
    { status: "confirmed", daysAgo: d1 },
    { status: "shipped", daysAgo: d2 },
    { status: "delivered", daysAgo: d3 },
  ];

  // Delivered & cash remitted
  order("Fatima B.", [{ ...MUG, qty: 4 }], 25, delivered(25, 24, 22), { shipCharged: 3, shipCost: 4.5, codFee: 1, packaging: 0.8 }, 20);
  order("Omar K.", [{ ...BOARD, qty: 2 }], 20, delivered(20, 19, 17), { shipCharged: 4, shipCost: 5, codFee: 1, packaging: 1 }, 14);
  order("Leila M.", [{ ...MUG, qty: 6 }, { ...BOARD, qty: 1 }], 15, delivered(15, 14, 12), { shipCharged: 4, shipCost: 5, codFee: 1.2, packaging: 1.2 }, 10);
  // Delivered, cash still with the courier
  order("Youssef T.", [{ ...MUG, qty: 3 }], 6, delivered(6, 5, 4), { shipCharged: 3, shipCost: 4.5, codFee: 1, packaging: 0.8 });
  // Delivered and unprofitable — both used WELCOME15 on a tiny basket
  order("Sara H.", [{ ...MUG, qty: 1 }], 4, delivered(4, 3, 2), { discount: 1.88, shipCost: 6, codFee: 1.5, packaging: 0.8, promoCode: "WELCOME15" });
  order("Rania E.", [{ ...MUG, qty: 1 }], 7, delivered(7, 6, 5), { discount: 1.88, shipCost: 6, codFee: 1.5, packaging: 0.8, promoCode: "WELCOME15" }, 3);
  // COD refusals at the door — Karim is a repeat refuser (2 refused, 0 delivered)
  order("Karim Z.", [{ ...MUG, qty: 3 }], 18, [
    { status: "confirmed", daysAgo: 18 },
    { status: "shipped", daysAgo: 17 },
    { status: "refused", daysAgo: 14 },
  ], { shipCost: 5, codFee: 0, packaging: 1 });
  order("Karim Z.", [{ ...MUG, qty: 2 }], 9, [
    { status: "confirmed", daysAgo: 9 },
    { status: "shipped", daysAgo: 8 },
    { status: "refused", daysAgo: 6 },
  ], { shipCost: 5, codFee: 0, packaging: 1 });
  order("Nadia R.", [{ ...BOARD, qty: 1 }], 10, [
    { status: "confirmed", daysAgo: 10 },
    { status: "shipped", daysAgo: 9 },
    { status: "refused", daysAgo: 8 },
  ], { shipCost: 5.5, codFee: 0, packaging: 1 });
  // In flight — holds a reservation
  order("Hassan A.", [{ ...MUG, qty: 2 }], 2, [
    { status: "confirmed", daysAgo: 2 },
    { status: "shipped", daysAgo: 1 },
  ], { shipCharged: 3, shipCost: 4.5, codFee: 1, packaging: 0.8 });

  // Pending — awaiting confirmation (feeds the confirmation queue + inbox action)
  order("Amina T.", [{ ...MUG, qty: 2 }], 1, [], { shipCharged: 3, shipCost: 4.5, codFee: 1, packaging: 0.8 });

  // Contact phones so messaging + inbox work in demo mode
  const contact = (customer: string, phone: string, city: string, daysAgo: number) =>
    memory.append("fact", "customer_contact_updated", { customer, phone, city, at: at(daysAgo) }, at(daysAgo));
  contact("Amina T.", "+212600112233", "Casablanca", 1);
  contact("Leila M.", "+212600445566", "Rabat", 3);

  // Inbound customer messages — the Operations Inbox. Amina's thread is waiting.
  const inbound = (customer: string, phone: string, body: string, hoursAgo: number) => {
    const t = now - hoursAgo * 3_600_000;
    memory.append("fact", "message_received", { messageId: `MSG-${++n}`, customer, phone, body, channel: "whatsapp", at: t }, t);
  };
  // A resolved-ish thread (we replied last)
  inbound("Leila M.", "+212600445566", "Merci beaucoup, tout est parfait!", 30);
  memory.append("fact", "customer_activity_logged", { activityId: `ACT-${++n}`, customer: "Leila M.", kind: "message", note: "WhatsApp: Avec plaisir Leila, à bientôt! 🌿", at: now - 29 * 3_600_000 }, now - 29 * 3_600_000);
  // A thread waiting on us
  inbound("Amina T.", "+212600112233", "Bonjour, ma commande de tasses arrive quand? 😊", 2);
}

