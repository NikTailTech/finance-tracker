"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { primaryVars, type AppTheme } from "@/lib/appearance";
import {
  formatDisplayDate,
  resolveDateFormat,
  type DateFormat,
} from "@/lib/date-format";

export type AppearanceState = {
  theme: AppTheme;
  primaryColor: string;
  appName: string;
  navOrder: string[];
  displayCurrency: "EUR" | "CHF";
  eurToChfRate: string;
  dateFormat: DateFormat;
};

const AppearanceContext = createContext<{
  appearance: AppearanceState;
  setAppearance: (next: AppearanceState) => void;
} | null>(null);

function resolvedTheme(theme: AppTheme) {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function AppearanceProvider({
  initial,
  children,
}: {
  initial: AppearanceState;
  children: React.ReactNode;
}) {
  const [appearance, setAppearance] = useState(initial);
  const [systemLight, setSystemLight] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const sync = () => setSystemLight(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const mode =
    appearance.theme === "system"
      ? systemLight
        ? "light"
        : "dark"
      : appearance.theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", mode === "light");
    root.classList.toggle("dark", mode === "dark");
    const vars = primaryVars(appearance.primaryColor);
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
    const link =
      document.querySelector<HTMLLinkElement>("link[rel='icon']") ??
      document.head.appendChild(document.createElement("link"));
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = `/api/favicon?color=${encodeURIComponent(appearance.primaryColor)}`;
    document.title = appearance.appName;
  }, [appearance, mode]);

  const value = useMemo(
    () => ({ appearance, setAppearance }),
    [appearance],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within AppearanceProvider");
  }
  return context;
}

/** Format ISO dates (`YYYY-MM-DD`) using the user’s Settings preference. */
export function useFormatDate() {
  const { appearance } = useAppearance();
  const format = resolveDateFormat(appearance.dateFormat);
  return (iso: string | null | undefined) => formatDisplayDate(iso, format);
}

export { resolvedTheme };
