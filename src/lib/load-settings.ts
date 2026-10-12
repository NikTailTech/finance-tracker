import { resolveNavOrder, type AppTheme } from "@/lib/appearance";
import { DEFAULT_DATE_FORMAT, resolveDateFormat } from "@/lib/date-format";
import { serializeRate } from "@/lib/money";
import type { AppearanceState } from "@/components/layout/appearance";

function defaultAppearance(): AppearanceState {
  return {
    theme: "dark",
    primaryColor: "#3dba7e",
    appName: "Finance Tracker",
    navOrder: resolveNavOrder(""),
    displayCurrency: "EUR",
    eurToChfRate: serializeRate("0.95"),
    dateFormat: DEFAULT_DATE_FORMAT,
  };
}

export async function loadAppearance(): Promise<AppearanceState> {
  // next build prerenders the root layout. Skip the database so the image
  // does not need a real DATABASE_URL; runtime requests still load settings.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return defaultAppearance();
  }

  const { prisma } = await import("@/lib/db");
  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  const theme: AppTheme =
    settings.theme === "light" || settings.theme === "system"
      ? settings.theme
      : "dark";
  return {
    theme,
    primaryColor: settings.primaryColor,
    appName: settings.appName,
    navOrder: resolveNavOrder(settings.navOrder),
    displayCurrency: settings.displayCurrency,
    eurToChfRate: serializeRate(settings.eurToChfRate),
    dateFormat: resolveDateFormat(settings.dateFormat),
  };
}
