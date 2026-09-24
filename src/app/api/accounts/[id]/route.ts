import { DivisionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { accountUpdateSchema } from "@/lib/schemas";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

const DELETED_ACCOUNT_NAME = "ACCOUNT DELETED";
const DIVISIONS: DivisionType[] = [
  DivisionType.NEEDS,
  DivisionType.PLAY,
  DivisionType.INVESTMENT,
  DivisionType.SAVINGS,
];

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return jsonError("Account not found", 404);
    }

    const body = accountUpdateSchema.parse(await request.json());

    const updated = await prisma.account.update({
      where: { id },
      data: { name: body.name },
      include: { divisions: { orderBy: { type: "asc" } } },
    });

    return jsonOk({
      id: updated.id,
      name: updated.name,
      currency: updated.currency,
      kind: updated.kind,
      sortOrder: updated.sortOrder,
      divisions: updated.divisions.map((d) => ({
        id: d.id,
        type: d.type,
      })),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return jsonError("An account with this name already exists", 409);
    }
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as
      | { confirmName?: string }
      | null;
    const existing = await prisma.account.findUnique({
      where: { id },
      include: { divisions: true },
    });
    if (!existing || !existing.isActive) {
      return jsonError("Account not found", 404);
    }
    if (existing.name === DELETED_ACCOUNT_NAME) {
      return jsonError("This account cannot be deleted", 400);
    }
    if (body?.confirmName !== existing.name) {
      return jsonError("Type the account name to confirm deletion", 400);
    }

    const divisionType = new Map(existing.divisions.map((d) => [d.id, d.type]));

    await prisma.$transaction(async (tx) => {
      const tombstone = await tx.account.upsert({
        where: { name: DELETED_ACCOUNT_NAME },
        update: { isActive: false },
        create: {
          name: DELETED_ACCOUNT_NAME,
          currency: "EUR",
          kind: "CHECKING",
          isActive: false,
          sortOrder: 9999,
          divisions: { create: DIVISIONS.map((type) => ({ type })) },
        },
        include: { divisions: true },
      });
      const tombstoneDivision = new Map(
        tombstone.divisions.map((d) => [d.type, d.id]),
      );
      const fallbackDivision = tombstone.divisions[0]?.id;
      if (!fallbackDivision) {
        throw new Error("Deleted-account placeholder has no divisions");
      }

      const transfers = await tx.transfer.findMany({
        where: { OR: [{ fromAccountId: id }, { toAccountId: id }] },
      });
      for (const transfer of transfers) {
        const data: { fromAccountId?: string; fromDivisionId?: string; toAccountId?: string; toDivisionId?: string } = {};
        if (transfer.fromAccountId === id) {
          data.fromAccountId = tombstone.id;
          data.fromDivisionId =
            tombstoneDivision.get(divisionType.get(transfer.fromDivisionId) ?? DivisionType.NEEDS) ??
            fallbackDivision;
        }
        if (transfer.toAccountId === id) {
          data.toAccountId = tombstone.id;
          data.toDivisionId =
            tombstoneDivision.get(divisionType.get(transfer.toDivisionId) ?? DivisionType.NEEDS) ??
            fallbackDivision;
        }
        await tx.transfer.update({ where: { id: transfer.id }, data });
      }

      await tx.transaction.deleteMany({ where: { accountId: id } });
      await tx.transactionTemplate.updateMany({
        where: { accountId: id },
        data: { accountId: null, divisionId: null },
      });
      await tx.account.delete({ where: { id } });
    });

    return jsonOk({ deleted: true, id });
  } catch (error) {
    return handleApiError(error);
  }
}
