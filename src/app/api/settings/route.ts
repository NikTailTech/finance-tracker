import { prisma } from "@/lib/db";
import { NAV_HREFS, resolveNavOrder } from "@/lib/appearance";
import { resolveDateFormat } from "@/lib/date-format";
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
  appName: string;
  navOrder: string;
  dateFormat: string;
}) {
  return {
    id: settings.id,
    eurToChfRate: serializeRate(settings.eurToChfRate.toString()),
    displayCurrency: settings.displayCurrency,
    theme: settings.theme,
    primaryColor: settings.primaryColor,
    appName: settings.appName,
    navOrder: resolveNavOrder(settings.navOrder),
    dateFormat: resolveDateFormat(settings.dateFormat),
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

    const data: {
      eurToChfRate?: string;
      displayCurrency?: "EUR" | "CHF";
      theme?: string;
      primaryColor?: string;
      appName?: string;
      navOrder?: string;
      dateFormat?: string;
    } = {};

    if (body.eurToChfRate) data.eurToChfRate = rateForDb(body.eurToChfRate);
    if (body.displayCurrency) data.displayCurrency = body.displayCurrency;
    if (body.theme) data.theme = body.theme;
    if (body.primaryColor) data.primaryColor = body.primaryColor;
    if (body.appName) data.appName = body.appName;
    if (body.navOrder) data.navOrder = body.navOrder.join(",");
    if (body.dateFormat) data.dateFormat = body.dateFormat;

    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });
    return jsonOk(serializeSettings(settings));
  } catch (error) {
    return handleApiError(error);
  }
}
