import { prisma } from "@/lib/db";
import { categoryReorderSchema } from "@/lib/schemas";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

export async function PUT(request: Request) {
  try {
    const body = categoryReorderSchema.parse(await request.json());

    const existing = await prisma.category.findMany({
      where: { kind: body.kind },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((row) => row.id));

    if (body.orderedIds.length !== existingIds.size) {
      return jsonError("orderedIds must include every category of this type", 400);
    }
    for (const id of body.orderedIds) {
      if (!existingIds.has(id)) {
        return jsonError("orderedIds contains unknown category id", 400);
      }
    }

    await prisma.$transaction(
      body.orderedIds.map((id, index) =>
        prisma.category.update({
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
