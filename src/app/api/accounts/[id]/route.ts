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
