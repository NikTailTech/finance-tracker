import { CategoryKind, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  assertCategoryKind,
  assertDivisionBelongsToAccount,
} from "@/lib/ledger";
import { money, serializeDecimal } from "@/lib/money";
import { templateUpdateSchema } from "@/lib/schemas";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

const include = {
  account: true,
  division: true,
  category: true,
} as const;

type Params = { params: Promise<{ id: string }> };

function serializeTemplate(template: {
  id: string;
  name: string;
  type: string;
  notes: string | null;
  amount: { toString(): string } | null;
  accountId: string | null;
  divisionId: string | null;
  categoryId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  account: { id: string; name: string; currency: "EUR" | "CHF" } | null;
  division: { id: string; type: string } | null;
  category: { id: string; name: string; kind: string } | null;
}) {
  return {
    id: template.id,
    name: template.name,
    type: template.type,
    notes: template.notes,
    amount: template.amount
      ? serializeDecimal(template.amount.toString())
      : null,
    accountId: template.accountId,
    divisionId: template.divisionId,
    categoryId: template.categoryId,
    sortOrder: template.sortOrder,
    account: template.account,
    division: template.division,
    category: template.category,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const template = await prisma.transactionTemplate.findUnique({
      where: { id },
      include,
    });
    if (!template) return jsonError("Not found", 404);
    return jsonOk(serializeTemplate(template));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await prisma.transactionTemplate.findUnique({
      where: { id },
    });
    if (!existing) return jsonError("Not found", 404);

    const body = templateUpdateSchema.parse(await request.json());
    const accountId =
      body.accountId === undefined ? existing.accountId : body.accountId;
    const divisionId =
      body.divisionId === undefined ? existing.divisionId : body.divisionId;
    const categoryId =
      body.categoryId === undefined ? existing.categoryId : body.categoryId;
    const type = (body.type ?? existing.type) as TransactionType;

    if (accountId && divisionId) {
      await assertDivisionBelongsToAccount(divisionId, accountId);
    } else if (divisionId && !accountId) {
      throw new Error("Account is required when a division is set");
    }

    if (categoryId) {
      await assertCategoryKind(
        categoryId,
        type === "EXPENSE" ? CategoryKind.EXPENSE : CategoryKind.INCOME,
      );
    }

    const updated = await prisma.transactionTemplate.update({
      where: { id },
      data: {
        name: body.name,
        type: body.type,
        notes: body.notes === undefined ? undefined : body.notes,
        amount:
          body.amount === undefined
            ? undefined
            : body.amount
              ? money(body.amount).toFixed(4)
              : null,
        accountId: body.accountId === undefined ? undefined : accountId,
        divisionId: body.divisionId === undefined ? undefined : divisionId,
        categoryId: body.categoryId === undefined ? undefined : categoryId,
      },
      include,
    });

    return jsonOk(serializeTemplate(updated));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return jsonError("A template with this name already exists", 409);
    }
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.transactionTemplate.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
