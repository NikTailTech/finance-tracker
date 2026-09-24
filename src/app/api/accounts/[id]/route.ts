import { prisma } from "@/lib/db";
import { accountUpdateSchema } from "@/lib/schemas";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

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

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await prisma.account.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true, transfersFrom: true, transfersTo: true },
        },
      },
    });
    if (!existing || !existing.isActive) {
      return jsonError("Account not found", 404);
    }

    const transferCount =
      existing._count.transfersFrom + existing._count.transfersTo;
    if (existing._count.transactions > 0 || transferCount > 0) {
      return jsonError(
        "This account has transactions or transfers and cannot be deleted",
        409,
      );
    }

    await prisma.$transaction(async (tx) => {
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
