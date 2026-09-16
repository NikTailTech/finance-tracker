import { prisma } from "@/lib/db";
import { templateReorderSchema } from "@/lib/schemas";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

export async function PUT(request: Request) {
  try {
    const body = templateReorderSchema.parse(await request.json());

    const existing = await prisma.transactionTemplate.findMany({
      where: { type: body.type },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((row) => row.id));

    if (body.orderedIds.length !== existingIds.size) {
      return jsonError("orderedIds must include every template of this type", 400);
    }
    for (const id of body.orderedIds) {
      if (!existingIds.has(id)) {
        return jsonError("orderedIds contains unknown template id", 400);
      }
    }

    await prisma.$transaction(
      body.orderedIds.map((id, index) =>
        prisma.transactionTemplate.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
