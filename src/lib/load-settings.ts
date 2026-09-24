import { prisma } from "@/lib/db";
import { resolveNavOrder, type AppTheme } from "@/lib/appearance";
import { serializeRate } from "@/lib/money";
import type { AppearanceState } from "@/components/layout/appearance";

export async function loadAppearance(): Promise<AppearanceState> {
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
    icon: settings.icon,
    appName: settings.appName,
    navOrder: resolveNavOrder(settings.navOrder),
    displayCurrency: settings.displayCurrency,
    eurToChfRate: serializeRate(settings.eurToChfRate),
  };
}
