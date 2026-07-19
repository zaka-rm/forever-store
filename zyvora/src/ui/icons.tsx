/**
 * Icon set — one hand-drawn stroke family (16-grid, 1.6px stroke, round caps).
 * Learned from commerce-admin design systems (Shopify Polaris): icons carry
 * recognition, color carries state; icons are always quiet, never decorated.
 */
const P = {
  fill: "none",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function I({ d, children }: { d?: string; children?: React.ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" {...P} aria-hidden="true">
      {d ? <path d={d} /> : children}
    </svg>
  );
}

export const Icons = {
  today: () => <I><circle cx="10" cy="10" r="3.4" /><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4" /></I>,
  bell: () => <I d="M10 3a4.6 4.6 0 0 0-4.6 4.6c0 4-1.9 5.4-1.9 5.4h13s-1.9-1.4-1.9-5.4A4.6 4.6 0 0 0 10 3ZM8.3 16a1.9 1.9 0 0 0 3.4 0" />,
  orders: () => <I d="M3.2 6.2 10 2.8l6.8 3.4v7.6L10 17.2l-6.8-3.4ZM3.2 6.2 10 9.6l6.8-3.4M10 9.6v7.6" />,
  automation: () => <I><circle cx="5" cy="5" r="2" /><circle cx="15" cy="10" r="2" /><circle cx="5" cy="15" r="2" /><path d="M7 5h2.2c3.1 0 3.8 1.9 3.8 3M7 15h2.2c3.1 0 3.8-1.9 3.8-3" /></I>,
  finance: () => <I><circle cx="10" cy="10" r="7.2" /><path d="M12.4 7.6c-.5-.9-1.4-1.3-2.4-1.3-1.4 0-2.5.8-2.5 1.9s.9 1.5 2.5 1.8c1.8.3 2.7.9 2.7 2 0 1.1-1.2 1.9-2.7 1.9-1.1 0-2.1-.5-2.6-1.4M10 4.8v10.4" /></I>,
  customers: () => <I><circle cx="7.2" cy="7" r="2.8" /><path d="M2.6 16.4c.6-2.8 2.4-4.4 4.6-4.4s4 1.6 4.6 4.4M13.4 4.6a2.8 2.8 0 0 1 0 4.8M14.6 12.2c1.6.5 2.6 1.9 3 4.2" /></I>,
  inventory: () => <I d="M3 6.4h14v3H3ZM4.2 9.4v6.8h11.6V9.4M8.2 12h3.6" />,
  promos: () => <I><path d="M3 10.4V4h6.4l7.3 7.3a1.4 1.4 0 0 1 0 2L12 18a1.4 1.4 0 0 1-2 0Z" /><circle cx="6.8" cy="7.8" r="1.2" /></I>,
  analytics: () => <I d="M3.5 16.5v-5M8 16.5V7M12.5 16.5v-7.5M17 16.5V4" />,
  ask: () => <I d="M17 9.4a6.6 6.6 0 0 1-6.9 6.3 7.6 7.6 0 0 1-2.6-.4L3 16.6l1.4-3.3A6 6 0 0 1 3.1 9.4 6.6 6.6 0 0 1 10 3.1a6.6 6.6 0 0 1 7 6.3ZM7 9.5h.01M10 9.5h.01M13 9.5h.01" />,
  import: () => <I d="M10 3v9M6.6 8.8 10 12.2l3.4-3.4M4 15.5h12" />,
  team: () => <I><circle cx="10" cy="6.4" r="2.6" /><path d="M4.6 16.6c.7-3 2.9-4.6 5.4-4.6s4.7 1.6 5.4 4.6" /></I>,
  billing: () => <I d="M2.8 6.6A1.6 1.6 0 0 1 4.4 5h11.2a1.6 1.6 0 0 1 1.6 1.6v6.8a1.6 1.6 0 0 1-1.6 1.6H4.4a1.6 1.6 0 0 1-1.6-1.6ZM2.8 8.4h14.4M5.4 12.4h3.2" />,
  documents: () => <I d="M5 2.8h6.5l3.5 3.5v10.9H5ZM11.5 2.8v3.5H15M7.5 10h5M7.5 13h5" />,
  memory: () => <I d="M5 3.4h9.4a1 1 0 0 1 1 1v11.2a1 1 0 0 1-1 1H5a1.4 1.4 0 0 1-1.4-1.4V4.8A1.4 1.4 0 0 1 5 3.4ZM3.6 13.2h11.8M7.2 6.8h5.6M7.2 9.4h4" />,
  // Landing feature icons
  compass: () => <I><circle cx="10" cy="10" r="7.2" /><path d="m12.8 7.2-1.6 4-4 1.6 1.6-4Z" /></I>,
  truck: () => <I d="M2.8 5.4h9v8h-9ZM11.8 8h3l2.4 2.6v2.8h-2.4M5.2 15.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2ZM13.6 15.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z" />,
  scale: () => <I d="M10 3.4v13.2M5 5.4h10M5 5.4 2.6 11a2.6 2.6 0 0 0 4.8 0ZM15 5.4 12.6 11a2.6 2.6 0 0 0 4.8 0ZM6.8 16.6h6.4" />,
  boxes: () => <I d="M3 11h6v6H3ZM11 11h6v6h-6ZM7 3.8h6v6H7" />,
  heart: () => <I d="M10 16.4S3.2 12.6 3.2 7.9A3.6 3.6 0 0 1 10 6a3.6 3.6 0 0 1 6.8 1.9c0 4.7-6.8 8.5-6.8 8.5Z" />,
  chat: () => <I d="M17 9.4a6.6 6.6 0 0 1-6.9 6.3 7.6 7.6 0 0 1-2.6-.4L3 16.6l1.4-3.3A6 6 0 0 1 3.1 9.4 6.6 6.6 0 0 1 10 3.1a6.6 6.6 0 0 1 7 6.3Z" />,
  lock: () => <I d="M5.4 9h9.2v7.4H5.4ZM6.8 9V6.6a3.2 3.2 0 0 1 6.4 0V9" />,
  eye: () => <I><path d="M2.6 10S5.4 4.9 10 4.9 17.4 10 17.4 10 14.6 15.1 10 15.1 2.6 10 2.6 10Z" /><circle cx="10" cy="10" r="2.2" /></I>,
  anchor: () => <I d="M10 6.4v10.2M10 6.4a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM3.8 11.2a6.2 6.2 0 0 0 12.4 0M3.8 11.2 2.4 9.8M3.8 11.2l1.5-1.4M16.2 11.2l1.4-1.4M16.2 11.2l-1.5-1.4M7 9.2h6" />,
  // Shell chrome
  menu: () => <I d="M3.4 5.6h13.2M3.4 10h13.2M3.4 14.4h13.2" />,
  close: () => <I d="M5 5l10 10M15 5L5 15" />,
  search: () => <I><circle cx="9" cy="9" r="5.6" /><path d="m13.2 13.2 3.6 3.6" /></I>,
};

export type IconName = keyof typeof Icons;
