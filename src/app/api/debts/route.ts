import { DebtStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { debtCreatePayload, serializeDebt } from "@/lib/debts";
import { debtCreateSchema } from "@/lib/schemas";
import { handleApiError, jsonOk } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const status =
      statusParam === "OPEN" || statusParam === "SETTLED"
        ? (statusParam as DebtStatus)
        : undefined;

    const debts = await prisma.debt.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: "asc" }, { date: "desc" }, { createdAt: "desc" }],
    });

    return jsonOk(debts.map(serializeDebt));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = debtCreateSchema.parse(await request.json());
    const created = await prisma.debt.create({
      data: debtCreatePayload(body),
    });
    return jsonOk(serializeDebt(created), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
