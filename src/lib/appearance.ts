export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/income", label: "Income" },
  { href: "/review", label: "Review" },
  { href: "/change", label: "Change" },
  { href: "/debts", label: "Debts" },
  { href: "/accounts", label: "Accounts" },
  { href: "/categories", label: "Categories" },
  { href: "/templates", label: "Templates" },
  { href: "/settings", label: "Settings" },
] as const;

export const NAV_HREFS = NAV_ITEMS.map((item) => item.href);

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

/** Fixed bank-building mark for favicon (primary color tint). */
export function faviconSvg(color: string) {
  const fill = isHexColor(color) ? color : "#3dba7e";
  const r = Number.parseInt(fill.slice(1, 3), 16);
  const g = Number.parseInt(fill.slice(3, 5), 16);
  const b = Number.parseInt(fill.slice(5, 7), 16);
  const light = `rgb(${Math.min(255, r + 48)}, ${Math.min(255, g + 48)}, ${Math.min(255, b + 40)})`;
  const dark = `rgb(${Math.max(0, r - 55)}, ${Math.max(0, g - 55)}, ${Math.max(0, b - 45)})`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <defs>
    <linearGradient id="mark" x1="8" y1="6" x2="24" y2="26" gradientUnits="userSpaceOnUse">
      <stop stop-color="${light}"/>
      <stop offset="1" stop-color="${fill}"/>
    </linearGradient>
  </defs>
  <g transform="translate(16 16) scale(1.28) translate(-16 -16)">
    <path d="M16 5.2 6.8 11.4a.9.9 0 0 0 .5 1.6h17.4a.9.9 0 0 0 .5-1.6L16 5.2Z" fill="url(#mark)"/>
    <rect x="7.4" y="13.2" width="17.2" height="1.35" rx="0.5" fill="url(#mark)" opacity="0.9"/>
    <rect x="8.6" y="15.1" width="2.2" height="7.6" rx="0.55" fill="url(#mark)"/>
    <rect x="12.9" y="15.1" width="2.2" height="7.6" rx="0.55" fill="url(#mark)"/>
    <rect x="17" y="15.1" width="2.2" height="7.6" rx="0.55" fill="url(#mark)"/>
    <rect x="21.2" y="15.1" width="2.2" height="7.6" rx="0.55" fill="url(#mark)"/>
    <rect x="6.8" y="23.1" width="18.4" height="2.1" rx="0.6" fill="url(#mark)"/>
    <rect x="8.2" y="25.5" width="15.6" height="1.35" rx="0.45" fill="url(#mark)" opacity="0.75"/>
    <circle cx="16" cy="10.1" r="1.15" fill="${dark}" opacity="0.55"/>
  </g>
</svg>`;
}
