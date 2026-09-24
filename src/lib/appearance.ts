export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/income", label: "Income" },
  { href: "/review", label: "Review" },
  { href: "/change", label: "Change" },
  { href: "/accounts", label: "Accounts" },
  { href: "/categories", label: "Categories" },
  { href: "/templates", label: "Templates" },
  { href: "/settings", label: "Settings" },
] as const;

export const NAV_HREFS = NAV_ITEMS.map((item) => item.href);

export const APP_ICONS = [
  "piggy",
  "wallet",
  "coins",
  "landmark",
  "banknote",
  "gem",
] as const;

export type AppIcon = (typeof APP_ICONS)[number];
export type AppTheme = "dark" | "light" | "system";

export const COLOR_PRESETS = [
  { name: "Green", value: "#3dba7e" },
  { name: "Teal", value: "#2aa89a" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Amber", value: "#d97706" },
  { name: "Rose", value: "#e11d48" },
] as const;

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: string) {
  return HEX.test(value);
}

export function resolveNavOrder(stored: string | null | undefined) {
  const known = new Set<string>(NAV_HREFS);
  const parsed = (stored ?? "")
    .split(",")
    .map((href) => href.trim())
    .filter((href) => known.has(href));
  const unique = [...new Set(parsed)];
  for (const href of NAV_HREFS) {
    if (!unique.includes(href)) unique.push(href);
  }
  return unique;
}

export function primaryVars(hex: string): Record<string, string> {
  const color = isHexColor(hex) ? hex : "#3dba7e";
  const r = Number.parseInt(color.slice(1, 3), 16);
  const g = Number.parseInt(color.slice(3, 5), 16);
  const b = Number.parseInt(color.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return {
    "--primary": color,
    "--primary-foreground": luminance > 0.62 ? "#102117" : "#f7fbf8",
    "--primary-soft": `rgba(${r}, ${g}, ${b}, 0.14)`,
    "--ring": `rgba(${r}, ${g}, ${b}, 0.45)`,
  };
}

export function faviconSvg(icon: string, color: string) {
  const fill = isHexColor(color) ? color : "#3dba7e";
  const marks: Record<string, string> = {
    piggy:
      '<ellipse cx="16" cy="18" rx="8" ry="6" fill="currentColor"/><circle cx="20.5" cy="16.2" r="1.1" fill="#102117"/><rect x="12" y="13.2" width="5" height="1.3" rx="0.6" fill="#102117" opacity="0.45"/>',
    wallet:
      '<rect x="7" y="10" width="18" height="13" rx="2" fill="currentColor"/><rect x="7" y="8" width="12" height="4" rx="1" fill="currentColor"/><circle cx="20" cy="16.5" r="1.3" fill="#102117"/>',
    coins:
      '<ellipse cx="13" cy="14" rx="6" ry="3" fill="currentColor"/><path d="M7 14v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" fill="currentColor"/><ellipse cx="19" cy="11" rx="5" ry="2.4" fill="currentColor" opacity="0.85"/>',
    landmark:
      '<path d="M6 13h20L16 7 6 13z" fill="currentColor"/><rect x="8" y="13" width="2.2" height="7" fill="currentColor"/><rect x="14.9" y="13" width="2.2" height="7" fill="currentColor"/><rect x="21.8" y="13" width="2.2" height="7" fill="currentColor"/><rect x="6" y="21" width="20" height="2.2" fill="currentColor"/>',
    banknote:
      '<rect x="5" y="10" width="22" height="12" rx="2" fill="currentColor"/><circle cx="16" cy="16" r="2.4" fill="#102117" opacity="0.35"/>',
    gem:
      '<path d="M8 13 12 7h8l4 6-8 12L8 13z" fill="currentColor"/>',
  };
  const mark = marks[icon] ?? marks.piggy;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#0d1210"/>
  <g color="${fill}">${mark}</g>
</svg>`;
}
