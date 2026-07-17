/**
 * Ask → Act: staged actions (ADR-0005 — AI assists, never replaces judgment).
 * When a question is really a request to DO something ("remind Nordwind to pay",
 * "write a win-back for Harbor Café in French"), ZYVORA stages the action:
 * a fully drafted, editable message the human approves with one tap.
 *
 * Drafts are deterministic templates filled from Business Memory — they work
 * with no AI configured, in any of the three business languages. The LLM may
 * optionally REWRITE a draft (tone/polish), never invent its figures.
 */
import { DAY, type CustomerProfile } from "./projections";
import { money } from "./format";
import type { Contact } from "./projections";
import type { WorkspaceState } from "./types";

export type DraftLang = "en" | "fr" | "ar";
export type DraftIntent = "payment-reminder" | "winback" | "reorder-nudge" | "cod-confirmation" | "thank-you";

export interface StagedMessage {
  intent: DraftIntent;
  customer: string;
  phone?: string;
  lang: DraftLang;
  body: string;
  /** Why this draft exists — the grounding facts, shown to the human. */
  reason: string;
}

const INTENT_WORDS: Record<DraftIntent, RegExp> = {
  "payment-reminder": /remind|reminder|chase|collect|pay(?!.*cod)|overdue|relance|rappel|فلوس|خلص/i,
  winback: /win.?back|re-?engag|come back|miss|gone quiet|silent|recup|récup|reconquérir/i,
  "reorder-nudge": /reorder|nudge|restock them|order again|racheter|recommander/i,
  "cod-confirmation": /confirm/i,
  "thank-you": /thank|merci|شكر/i,
};

const LANG_WORDS: [DraftLang, RegExp][] = [
  ["fr", /french|français|francais|en fr/i],
  ["ar", /arabic|darija|عرب|بالعربية|arabe/i],
];

/** Find which customer a request refers to (longest name match wins). */
function matchCustomer(question: string, names: string[]): string | null {
  const q = question.toLowerCase();
  let best: string | null = null;
  for (const n of names) {
    if (q.includes(n.toLowerCase()) && (!best || n.length > best.length)) best = n;
  }
  return best;
}

function detectIntent(question: string): DraftIntent | null {
  // "draft/write/send/message" strongly signals an action request; specific
  // intent words can also stand alone ("remind Nordwind to pay").
  const wantsAction = /draft|write|send|message|sms|whatsapp|rédige|écris|envoie|صياغة|اكتب/i.test(question);
  for (const [intent, re] of Object.entries(INTENT_WORDS) as [DraftIntent, RegExp][]) {
    if (re.test(question) && (wantsAction || intent === "payment-reminder" || intent === "winback")) return intent;
  }
  return null;
}

function detectLang(question: string): DraftLang {
  for (const [lang, re] of LANG_WORDS) if (re.test(question)) return lang;
  return "en";
}

// ------------------------------------------------------------- Templates ---

function paymentBody(lang: DraftLang, name: string, amount: string, days: number): string {
  if (lang === "fr")
    return `Bonjour ${name}, un petit rappel amical : votre facture de ${amount} est en retard de ${days} jour${days > 1 ? "s" : ""}. Pouvez-vous nous indiquer quand prévoir le règlement ? Merci beaucoup !`;
  if (lang === "ar")
    return `سلام ${name}، غير تذكير بسيط: الفاتورة ديال ${amount} تعدّى أجلها ب ${days} يوم. واش ممكن تخبرنا فوقاش نتوقعو الخلاص؟ شكراً بزاف!`;
  return `Hello ${name}, a friendly reminder: your invoice of ${amount} is ${days} day${days > 1 ? "s" : ""} past due. Could you let us know when to expect payment? Thank you!`;
}

function winbackBody(lang: DraftLang, name: string, days: number): string {
  if (lang === "fr")
    return `Bonjour ${name} ! Ça fait environ ${days} jours qu'on n'a pas eu de vos nouvelles — on espère que tout va bien. Besoin de quelque chose cette semaine ? On peut vous préparer votre commande habituelle. 🌿`;
  if (lang === "ar")
    return `سلام ${name}! شحال هادي ما تواصلناش، تقريباً ${days} يوم — نتمناو تكونو بخير. واش محتاجين شي حاجة هاد السيمانة؟ نقدرو نوجدو ليكم الطلب المعتاد. 🌿`;
  return `Hello ${name}! It's been about ${days} days since we last heard from you — hope all is well. Anything you need this week? We can prepare your usual order. 🌿`;
}

function reorderBody(lang: DraftLang, name: string, days: number): string {
  if (lang === "fr")
    return `Bonjour ${name} ! Votre dernier achat remonte à ~${days} jours — le moment idéal pour renouveler. Dites-nous ce qu'il vous faut et on prépare tout. 🌿`;
  if (lang === "ar")
    return `سلام ${name}! آخر طلب ديالكم كان قبل ~${days} يوم — الوقت مناسب باش تجددو. قولو لينا أشنو خاصكم و نوجدو كلشي. 🌿`;
  return `Hello ${name}! Your last order was ~${days} days ago — a good moment to top up. Tell us what you need and we'll prepare everything. 🌿`;
}

function confirmBody(lang: DraftLang, name: string, items: string, total: string): string {
  if (lang === "fr")
    return `Bonjour ${name}, ici votre boutique. Nous confirmons votre commande : ${items}. Total à payer à la livraison : ${total}. Répondez OUI pour confirmer l'envoi. Merci !`;
  if (lang === "ar")
    return `سلام ${name}، معكم المتجر ديالكم. كنأكدو الطلب ديالكم: ${items}. المجموع عند التسليم: ${total}. جاوبو بنعم باش نصيفطوه. شكراً!`;
  return `Hello ${name}, this is your store. Confirming your order: ${items}. Total to pay on delivery: ${total}. Reply YES to confirm so we can ship it. Thank you!`;
}

function thankYouBody(lang: DraftLang, name: string): string {
  if (lang === "fr")
    return `Merci ${name} pour votre confiance ! C'est un plaisir de vous servir. À très bientôt. 🌿`;
  if (lang === "ar")
    return `شكراً ${name} على الثقة ديالكم! مرحباً بيكم ديماً. 🌿`;
  return `Thank you ${name} for your trust! It's a pleasure serving you. See you soon. 🌿`;
}

// ----------------------------------------------------------------- Stager ---

/**
 * Recognize an action request and stage a fully drafted message, or return
 * null when the question is just a question. Deterministic: same inputs,
 * same draft — the human always sees exactly what will be sent.
 */
export function stageAction(
  state: WorkspaceState,
  profiles: CustomerProfile[],
  contacts: Map<string, Contact>,
  question: string,
  now: number = Date.now()
): StagedMessage | null {
  const intent = detectIntent(question);
  if (!intent) return null;
  const lang = detectLang(question);

  const names = profiles.map((p) => p.name);
  let customer = matchCustomer(question, names);

  // Sensible default targets when no name was given.
  if (!customer) {
    if (intent === "payment-reminder") {
      const overdue = state.invoices
        .filter((i) => !i.paidAt && now > i.issuedAt + i.dueDays * DAY)
        .sort((a, b) => a.issuedAt - b.issuedAt);
      customer = overdue[0]?.customer ?? null;
    } else if (intent === "winback" || intent === "reorder-nudge") {
      const quiet = profiles
        .filter((p) => p.medianGapDays && (now - p.lastActivityAt) / DAY > (p.medianGapDays as number))
        .sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue);
      customer = quiet[0]?.name ?? null;
    } else if (intent === "cod-confirmation") {
      const pending = state.orders.filter((o) => o.status === "pending").sort((a, b) => a.createdAt - b.createdAt);
      customer = pending[0]?.customer ?? null;
    }
  }
  if (!customer) return null;

  const phone = contacts.get(customer)?.phone?.trim() || undefined;
  const profile = profiles.find((p) => p.name === customer);
  const daysSince = profile ? Math.round((now - profile.lastActivityAt) / DAY) : 0;

  switch (intent) {
    case "payment-reminder": {
      const inv = state.invoices
        .filter((i) => !i.paidAt && i.customer === customer)
        .sort((a, b) => a.issuedAt - b.issuedAt)[0];
      if (!inv) return null;
      const days = Math.max(1, Math.floor((now - (inv.issuedAt + inv.dueDays * DAY)) / DAY));
      return {
        intent, customer, phone, lang,
        body: paymentBody(lang, customer, money(inv.amount), days),
        reason: `${customer} has an open invoice of ${money(inv.amount)}, ${days} day(s) past due.`,
      };
    }
    case "winback":
      return {
        intent, customer, phone, lang,
        body: winbackBody(lang, customer, daysSince),
        reason: `${customer} last ordered ${daysSince} days ago${profile?.medianGapDays ? ` (their rhythm is ~${Math.round(profile.medianGapDays)} days)` : ""}; lifetime ${money(profile?.lifetimeRevenue ?? 0)}.`,
      };
    case "reorder-nudge":
      return {
        intent, customer, phone, lang,
        body: reorderBody(lang, customer, daysSince),
        reason: `${customer}'s last activity was ${daysSince} days ago.`,
      };
    case "cod-confirmation": {
      const o = state.orders.filter((x) => x.status === "pending" && x.customer === customer).sort((a, b) => a.createdAt - b.createdAt)[0];
      if (!o) return null;
      const items = o.lines.map((l) => `${l.qty}× ${l.productName}`).join(", ");
      const total = money(o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0) - o.discount + o.shippingCharged);
      return {
        intent, customer, phone, lang,
        body: confirmBody(lang, customer, items, total),
        reason: `${customer} has a pending COD order (${items}).`,
      };
    }
    case "thank-you":
      return {
        intent, customer, phone, lang,
        body: thankYouBody(lang, customer),
        reason: `A goodwill message for ${customer}.`,
      };
  }
}

/** Re-render the same staged action in another language (deterministic). */
export function restageInLang(
  staged: StagedMessage,
  state: WorkspaceState,
  profiles: CustomerProfile[],
  contacts: Map<string, Contact>,
  lang: DraftLang,
  now: number = Date.now()
): StagedMessage {
  // "draft" guarantees the intent recognizer treats this as an action request.
  const q = `draft ${staged.intent} for ${staged.customer} in ${lang === "fr" ? "french" : lang === "ar" ? "arabic" : "english"}`;
  return stageAction(state, profiles, contacts, q, now) ?? { ...staged, lang };
}
