/**
 * Segment broadcasts with measured lift — marketing with receipts.
 * A campaign records exactly who was messaged and when (append-only
 * CampaignSent event). Lift is then measured honestly: orders from those same
 * recipients in the N days AFTER the send vs. the N days BEFORE. Pure counting
 * on recorded orders — never a modeled or attributed guess (Law IX).
 */
import { DAY, orderRevenue } from "./projections";
import type { CampaignSent, MemoryEvent, WorkspaceState } from "./types";

export interface CampaignResult {
  campaignId: string;
  segment: string;
  channel: string;
  message: string;
  at: number;
  recipients: number;
  windowDays: number;
  ordersBefore: number;
  ordersAfter: number;
  revenueBefore: number;
  revenueAfter: number;
  /** Ready only once the measurement window has fully elapsed. */
  ready: boolean;
}

export function projectCampaigns(events: readonly MemoryEvent[]): CampaignSent[] {
  return events
    .filter((e) => e.stream === "fact" && e.type === "campaign_sent")
    .map((e) => e.payload as unknown as CampaignSent)
    .sort((a, b) => b.at - a.at);
}

/**
 * Measure a campaign's lift: order count and revenue from its recipients in the
 * equal windows before and after the send. Uses order creation date (when the
 * customer acted), not delivery, so intent is measured close to the message.
 */
export function measureCampaign(
  state: WorkspaceState,
  campaign: CampaignSent,
  now: number = Date.now(),
  windowDays = 14
): CampaignResult {
  const recipients = new Set(campaign.customers);
  const w = windowDays * DAY;
  const beforeStart = campaign.at - w;
  const afterEnd = campaign.at + w;

  const inWindow = (from: number, to: number) =>
    state.orders.filter(
      (o) => recipients.has(o.customer) && o.status !== "cancelled" && o.createdAt >= from && o.createdAt < to
    );
  const before = inWindow(beforeStart, campaign.at);
  const after = inWindow(campaign.at, Math.min(afterEnd, now));

  return {
    campaignId: campaign.campaignId,
    segment: campaign.segment,
    channel: campaign.channel,
    message: campaign.message,
    at: campaign.at,
    recipients: campaign.customers.length,
    windowDays,
    ordersBefore: before.length,
    ordersAfter: after.length,
    revenueBefore: before.reduce((s, o) => s + orderRevenue(o), 0),
    revenueAfter: after.reduce((s, o) => s + orderRevenue(o), 0),
    ready: now >= afterEnd,
  };
}
