/**
 * Theme engine — light / dark / auto (follows the OS).
 * Design tokens live in styles.css under [data-theme="dark"]; this module only
 * decides which attribute is on <html>. Calm software: the theme never flashes —
 * it is applied before first paint (main.tsx calls initTheme() at module load).
 */
export type ThemePref = "auto" | "light" | "dark";

const KEY = "zyvora.theme";
const media = window.matchMedia?.("(prefers-color-scheme: dark)");

export function themePref(): ThemePref {
  const v = localStorage.getItem(KEY);
  // Light is the default polished experience (commerce-admin convention);
  // dark and auto (follow OS) remain one click away.
  return v === "light" || v === "dark" || v === "auto" ? (v as ThemePref) : "light";
}

function resolved(pref: ThemePref): "light" | "dark" {
  if (pref === "auto") return media?.matches ? "dark" : "light";
  return pref;
}

function apply(pref: ThemePref) {
  document.documentElement.dataset.theme = resolved(pref);
}

export function setThemePref(pref: ThemePref) {
  localStorage.setItem(KEY, pref); // "auto" is stored explicitly — light is the unset default
  apply(pref);
}

/** Cycle light → dark → auto (for a single toggle button). */
export function cycleTheme(): ThemePref {
  const order: ThemePref[] = ["light", "dark", "auto"];
  const next = order[(order.indexOf(themePref()) + 1) % order.length];
  setThemePref(next);
  return next;
}

export function initTheme() {
  apply(themePref());
  media?.addEventListener?.("change", () => {
    if (themePref() === "auto") apply("auto");
  });
}
