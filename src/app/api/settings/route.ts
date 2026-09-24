import { prisma } from "@/lib/db";
import { NAV_HREFS, resolveNavOrder } from "@/lib/appearance";
import { serializeRate, toDecimal } from "@/lib/money";
import { settingsUpdateSchema } from "@/lib/schemas";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

function rateForDb(value: string) {
  return toDecimal(value).toDecimalPlaces(8).toFixed(8);
}

function serializeSettings(settings: {
  id: string;
  eurToChfRate: { toString(): string };
  displayCurrency: "EUR" | "CHF";
  theme: string;
  primaryColor: string;
  icon: string;
  appName: string;
  navOrder: string;
}) {
  return {
    id: settings.id,
    eurToChfRate: serializeRate(settings.eurToChfRate.toString()),
    displayCurrency: settings.displayCurrency,
    theme: settings.theme,
    primaryColor: settings.primaryColor,
    icon: settings.icon,
    appName: settings.appName,
    navOrder: resolveNavOrder(settings.navOrder),
  };
}

export async function GET() {
  try {
    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
    return jsonOk(serializeSettings(settings));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = settingsUpdateSchema.parse(await request.json());
    if (body.navOrder) {
      const unique = [...new Set(body.navOrder)];
      const known = new Set<string>(NAV_HREFS);
      if (
        unique.length !== NAV_HREFS.length ||
        unique.some((href) => !known.has(href))
      ) {
        return jsonError("navOrder must list every menu item once", 400);
      }
    }

    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      update: {
        eurToChfRate: body.eurToChfRate
          ? rateForDb(body.eurToChfRate)
          : undefined,
        displayCurrency: body.displayCurrency,
        theme: body.theme,
        primaryColor: body.primaryColor,
        icon: body.icon,
        appName: body.appName,
        navOrder: body.navOrder ? body.navOrder.join(",") : undefined,
      },
      create: {
        id: "default",
        eurToChfRate: body.eurToChfRate
          ? rateForDb(body.eurToChfRate)
          : undefined,
        displayCurrency: body.displayCurrency,
        theme: body.theme,
        primaryColor: body.primaryColor,
        icon: body.icon,
        appName: body.appName,
        navOrder: body.navOrder ? body.navOrder.join(",") : undefined,
      },
    });
    return jsonOk(serializeSettings(settings));
  } catch (error) {
    return handleApiError(error);
  }
}
