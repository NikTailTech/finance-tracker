import { prisma } from "@/lib/db";
import {
  assertCategoryKind,
  assertDivisionBelongsToAccount,
  serializeTransaction,
} from "@/lib/ledger";
import { money } from "@/lib/money";
import { transactionUpdateSchema } from "@/lib/schemas";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { CategoryKind, TransactionType } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const tx = await prisma.transaction.findUnique({
      where: { id },
      include: { account: true, division: true, category: true },
    });
    if (!tx) return jsonError("Not found", 404);
    return jsonOk(serializeTransaction(tx));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) return jsonError("Not found", 404);

    const body = transactionUpdateSchema.parse(await request.json());
    const accountId = body.accountId ?? existing.accountId;
    const divisionId = body.divisionId ?? existing.divisionId;
    const categoryId = body.categoryId ?? existing.categoryId;

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error("Account not found");

    await assertDivisionBelongsToAccount(divisionId, accountId);
    await assertCategoryKind(
      categoryId,
      existing.type === TransactionType.EXPENSE
        ? CategoryKind.EXPENSE
        : CategoryKind.INCOME,
    );

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        title: body.title,
        notes: body.notes === undefined ? undefined : body.notes,
        date: body.date ? new Date(body.date) : undefined,
        amount: body.amount ? money(body.amount).toFixed(4) : undefined,
        accountId,
        divisionId,
        categoryId,
        currency: account.currency,
      },
      include: { account: true, division: true, category: true },
    });

    return jsonOk(serializeTransaction(updated));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.transaction.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
