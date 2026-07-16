/**
 * ZYVORA core types.
 * Traceability: CODEX 00 D.1 (five layers), D.8 (four memory streams),
 * D.4 (decision layers); CODEX 10 P4.6 (four transparency layers), 5.8 (Options Table).
 */

// ---------- Memory layer (CODEX 00 D.8 — append-only, four streams) ----------

export type Stream = "fact" | "interpretation" | "decision" | "outcome";

export interface MemoryEvent {
  id: string;
  ts: number; // epoch ms
  stream: Stream;
  type: string;
  payload: Record<string, unknown>;
}

// ---------- Information layer facts (Domains own their facts — D.2) ----------

export interface InvoiceIssued {
  invoiceId: string;
  customer: string;
  amount: number;
  issuedAt: number;
  dueDays: number;
}

export interface InvoicePaid {
  invoiceId: string;
  paidAt: number;
}

export interface ExpenseRecorded {
  expenseId: string;
  label: string;
  amount: number;
  date: number;
}

export interface ProductAdded {
  productId: string;
  name: string;
  stock: number;
  weeklySales: number;
  leadTimeDays: number;
  unitCost: number;
  price: number;
}

export interface StockAdjusted {
  productId: string;
  delta: number;
  reason: string;
}

// ---------- Commerce & COD (Wave 1 — ZPL-040 §4, ZPL-041 §3) ----------

export interface OrderLine {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
}

/** COD lifecycle. Revenue is recognized on DELIVERY (ZPL-041 Binding Principle 8). */
export type OrderStatus =
  | "pending" // awaiting confirmation call
  | "confirmed"
  | "shipped"
  | "delivered"
  | "refused" // COD refusal at the door
  | "cancelled"
  | "returned"; // returned after delivery — revenue reversed

export interface OrderCreated {
  orderId: string;
  customer: string;
  lines: OrderLine[];
  discount: number;
  shippingCharged: number; // paid by the customer (part of revenue)
  shippingCost: number; // paid by the business
  codFee: number;
  packagingCost: number;
  createdAt: number;
  promoCode?: string; // the promo applied, if any (stacking prevented: at most one)
}

export interface OrderStatusChanged {
  orderId: string;
  status: OrderStatus;
  at: number;
}

/** Courier remitted the collected COD cash for this order. */
export interface OrderCashReceived {
  orderId: string;
  at: number;
}

// ---------- Procurement (CAP-000006 — FEAT-000045 purchase orders & receipts) ----------

export interface PoLine {
  productId: string;
  productName: string;
  qty: number;
  unitCost: number; // what you pay the supplier (Forever) per unit
}

export interface PurchaseOrderCreated {
  poId: string;
  supplier: string;
  lines: PoLine[];
  createdAt: number;
}

/** Receiving a PO increases stock and closes the incoming quantity (append-only). */
export interface GoodsReceived {
  poId: string;
  at: number;
}

// ---------- CRM depth (CAP-000007 — FEAT-000049 contacts, FEAT-000052 activities) ----------

export interface CustomerContactUpdated {
  customer: string; // matches the name used on orders/invoices
  phone?: string;
  city?: string;
  notes?: string;
  at: number;
}

export type ActivityKind = "call" | "message" | "visit" | "note" | "followup";

export interface CustomerActivityLogged {
  activityId: string;
  customer: string;
  kind: ActivityKind;
  note: string;
  dueAt?: number; // set for a follow-up task
  at: number;
}

export interface CustomerActivityCompleted {
  activityId: string;
  at: number;
}

// ---------- Discounts & promos (Wave 1 completion — ZPL-040 §8, ZPL-041 §4) ----------

export type PromoType = "percentage" | "fixed";

export interface PromoCreated {
  promoId: string;
  code: string; // uppercase, unique among active promos
  type: PromoType;
  value: number; // percent (0–100) or fixed amount in Workspace currency
  minBasket: number; // 0 = no minimum
  maxDiscount?: number; // caps a percentage promo
  usageLimit?: number; // total redemptions allowed; undefined = unlimited
  expiresAt?: number; // epoch ms; undefined = no expiry
  createdAt: number;
}

/** Append-only deactivation (no deletes — ADR-0002). */
export interface PromoDeactivated {
  promoId: string;
  at: number;
}

// ---------- Goals (Wave 3 — ZPL-041 §11) ----------

export type GoalMetric = "revenue" | "profit" | "orders";

/** Editing a goal appends a new event; the latest target per metric wins (append-only). */
export interface GoalSet {
  metric: GoalMetric;
  target: number;
  setAt: number;
}

// ---------- Projections (derived, read-only — One Source of Truth, D.9) ----------

export interface Invoice extends InvoiceIssued {
  paidAt?: number;
}

export interface Product extends ProductAdded {}

export interface Order extends OrderCreated {
  status: OrderStatus;
  deliveredAt?: number;
  cashReceivedAt?: number;
}

export interface PurchaseOrder extends PurchaseOrderCreated {
  receivedAt?: number;
}

export interface Promo extends PromoCreated {
  active: boolean;
  timesUsed: number; // server-counted from non-cancelled orders referencing this code
}

export interface WorkspaceState {
  invoices: Invoice[];
  expenses: ExpenseRecorded[];
  products: Product[];
  orders: Order[];
  promos: Promo[];
  purchaseOrders: PurchaseOrder[];
  /** Latest target per goal metric (empty if none set). */
  goals: Partial<Record<GoalMetric, number>>;
  /** Units reserved by open orders (pending/confirmed/shipped), per productId. */
  reserved: Record<string, number>;
  /** Units on open (not-yet-received) purchase orders, per productId. */
  incoming: Record<string, number>;
}

// ---------- Insight & Decision layers (D.1 levels 4–5; CODEX 10 P4.6) ----------

export type DomainName = "finance" | "customers" | "inventory" | "marketing";
export type DecisionLayer = "operational" | "tactical" | "strategic";
export type Confidence = "high" | "medium" | "low";

/** One row of the canonical Options Table (CODEX 10 §5.8, ADR-1004). */
export interface GuidanceOption {
  id: string;
  label: string;
  path: string; // what you would actually do
  gain: string;
  cost: string;
  reversibility: "easy" | "moderate" | "hard";
  falsifier: string; // what evidence would make this the wrong choice
  isNullOption?: boolean; // "do nothing", presented with equal rigor
}

export interface Guidance {
  options: GuidanceOption[]; // 2–4, null option always present
  recommendedId: string;
  recommendationReason: string;
}

/** An Insight carries all four transparency layers (P4.6). */
export interface Insight {
  id: string;
  decisionKey: string; // stable key; a recorded decision suppresses re-nagging (P4.3)
  domain: DomainName;
  layer: DecisionLayer;
  score: number; // ranking weight — few and ranked (Law X)
  claim: string; // L1
  reasoning: string; // L2
  evidence: { label: string; value: string }[]; // L3 — sources, checkable
  confidence: Confidence; // L4
  confidenceNote: string; // includes honest uncertainty (Law VIII/IX)
  guidance?: Guidance; // present ⇒ this needs the Builder's judgment
}

export interface RecordedDecision {
  eventId: string;
  ts: number;
  decisionKey: string;
  claim: string;
  layer: DecisionLayer;
  optionId: string;
  optionLabel: string;
  rationale: string;
  hasOutcome: boolean;
}
