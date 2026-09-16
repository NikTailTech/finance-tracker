import { prisma } from "@/lib/db";
import { serializeRate, toDecimal } from "@/lib/money";
import { settingsUpdateSchema } from "@/lib/schemas";
import { handleApiError, jsonOk } from "@/lib/api";

function rateForDb(value: string) {
  return toDecimal(value).toDecimalPlaces(8).toFixed(8);
}

export async function GET() {
  try {
    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
    return jsonOk({
      id: settings.id,
      eurToChfRate: serializeRate(settings.eurToChfRate),
      displayCurrency: settings.displayCurrency,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = settingsUpdateSchema.parse(await request.json());
    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      update: {
        eurToChfRate: body.eurToChfRate
          ? rateForDb(body.eurToChfRate)
          : undefined,
        displayCurrency: body.displayCurrency,
      },
      create: {
        id: "default",
        eurToChfRate: body.eurToChfRate
          ? rateForDb(body.eurToChfRate)
          : undefined,
        displayCurrency: body.displayCurrency,
      },
    });
    return jsonOk({
      id: settings.id,
      eurToChfRate: serializeRate(settings.eurToChfRate),
      displayCurrency: settings.displayCurrency,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
