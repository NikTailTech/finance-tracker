import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { categoryUpdateSchema } from "@/lib/schemas";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

function isUniqueConstraint(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

async function loadCategory(id: string) {
  return prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { transactions: true, templates: true } },
    },
  });
}

function serialize(category: NonNullable<Awaited<ReturnType<typeof loadCategory>>>) {
  return {
    id: category.id,
    name: category.name,
    kind: category.kind,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    transactionCount: category._count.transactions,
    templateCount: category._count.templates,
  };
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await loadCategory(id);
    if (!existing) return jsonError("Category not found", 404);

    const body = categoryUpdateSchema.parse(await request.json());
    const inUse =
      existing._count.transactions > 0 || existing._count.templates > 0;

    if (body.kind && body.kind !== existing.kind && inUse) {
      return jsonError(
        "Cannot change type while this category is used by transactions or templates",
        409,
      );
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: body.name,
        kind: body.kind,
        isActive: body.isActive,
      },
      include: {
        _count: { select: { transactions: true, templates: true } },
      },
    });

    return jsonOk(serialize(updated));
  } catch (error) {
    if (isUniqueConstraint(error)) {
      return jsonError("A category with this name already exists", 409);
    }
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await loadCategory(id);
    if (!existing) return jsonError("Category not found", 404);

    const inUse =
      existing._count.transactions > 0 || existing._count.templates > 0;

    if (inUse) {
      const updated = await prisma.category.update({
        where: { id },
        data: { isActive: false },
        include: {
          _count: { select: { transactions: true, templates: true } },
        },
      });
      return jsonOk({ mode: "deactivated", category: serialize(updated) });
    }

    await prisma.category.delete({ where: { id } });
    return jsonOk({ mode: "deleted", id });
  } catch (error) {
    return handleApiError(error);
  }
}
