import { CategoryKind, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  assertCategoryKind,
  assertDivisionBelongsToAccount,
} from "@/lib/ledger";
import { money, serializeDecimal } from "@/lib/money";
import { templateCreateSchema } from "@/lib/schemas";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

function serializeTemplate(
  template: {
    id: string;
    name: string;
    type: TransactionType;
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
  },
) {
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

const include = {
  account: true,
  division: true,
  category: true,
} as const;

async function validateTemplateRefs(input: {
  type: TransactionType;
  accountId: string | null;
  divisionId: string | null;
  categoryId: string | null;
}) {
  if (input.accountId && input.divisionId) {
    await assertDivisionBelongsToAccount(input.divisionId, input.accountId);
  } else if (input.divisionId && !input.accountId) {
    throw new Error("Account is required when a division is set");
  }

  if (input.categoryId) {
    await assertCategoryKind(
      input.categoryId,
      input.type === "EXPENSE" ? CategoryKind.EXPENSE : CategoryKind.INCOME,
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const where =
      type === "EXPENSE" || type === "INCOME"
        ? { type: type as TransactionType }
        : {};

    const rows = await prisma.transactionTemplate.findMany({
      where,
      include,
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
    return jsonOk(rows.map(serializeTemplate));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = templateCreateSchema.parse(await request.json());
    await validateTemplateRefs({
      type: body.type,
      accountId: body.accountId,
      divisionId: body.divisionId,
      categoryId: body.categoryId,
    });

    const maxSort = await prisma.transactionTemplate.aggregate({
      where: { type: body.type },
      _max: { sortOrder: true },
    });

    const created = await prisma.transactionTemplate.create({
      data: {
        name: body.name,
        type: body.type,
        notes: body.notes ?? null,
        amount: body.amount ? money(body.amount).toFixed(4) : null,
        accountId: body.accountId,
        divisionId: body.divisionId,
        categoryId: body.categoryId,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
      include,
    });

    return jsonOk(serializeTemplate(created), 201);
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

export { serializeTemplate };
