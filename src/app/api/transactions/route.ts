import { TransactionType } from "@prisma/client";
import { createExpenseOrIncome, listTransactions } from "@/lib/ledger";
import { transactionCreateSchema, transactionListQuerySchema } from "@/lib/schemas";
import { handleApiError, jsonOk } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = Object.fromEntries(searchParams.entries());
    const legacyType = searchParams.get("type");
    if (
      legacyType &&
      (legacyType === "EXPENSE" || legacyType === "INCOME") &&
      searchParams.size === 1
    ) {
      const rows = await listTransactions({ type: legacyType as TransactionType });
      return jsonOk(rows);
    }

    const query = transactionListQuerySchema.parse(raw);
    const rows = await listTransactions({
      type: query.type,
      categoryId: query.categoryId,
      accountId: query.accountId,
      divisionId: query.divisionId,
      from: query.from,
      to: query.to,
      amountMin: query.amountMin,
      amountMax: query.amountMax,
      q: query.q,
    });
    return jsonOk(rows);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");
    if (typeParam !== "EXPENSE" && typeParam !== "INCOME") {
      throw new Error("Query param type must be EXPENSE or INCOME");
    }
    const body = transactionCreateSchema.parse(await request.json());
    const created = await createExpenseOrIncome(typeParam, body);
    return jsonOk(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
