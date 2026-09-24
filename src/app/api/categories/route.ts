import { CategoryKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { categoryCreateSchema } from "@/lib/schemas";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

function isUniqueConstraint(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind");
    const includeInactive = searchParams.get("includeInactive") === "1";
    const kindFilter =
      kind === "EXPENSE" || kind === "INCOME"
        ? { kind: kind as CategoryKind }
        : {};
    const where = includeInactive ? kindFilter : { ...kindFilter, isActive: true };

    if (includeInactive) {
      const categories = await prisma.category.findMany({
        where,
        orderBy: [
          { kind: "asc" },
          { sortOrder: "asc" },
          { name: "asc" },
        ],
        include: {
          _count: { select: { transactions: true, templates: true } },
        },
      });
      return jsonOk(
        categories.map((category) => ({
          id: category.id,
          name: category.name,
          kind: category.kind,
          isActive: category.isActive,
          sortOrder: category.sortOrder,
          transactionCount: category._count.transactions,
          templateCount: category._count.templates,
        })),
      );
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
    return jsonOk(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = categoryCreateSchema.parse(await request.json());
    const existing = await prisma.category.findUnique({
      where: { name_kind: { name: body.name, kind: body.kind } },
    });
    if (existing) {
      return jsonError(
        existing.isActive
          ? "A category with this name already exists"
          : "A hidden category with this name already exists. Restore it instead.",
        409,
      );
    }

    const maxSort = await prisma.category.aggregate({
      where: { kind: body.kind },
      _max: { sortOrder: true },
    });

    const created = await prisma.category.create({
      data: {
        name: body.name,
        kind: body.kind,
        color: body.color ?? null,
        icon: body.icon ?? null,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
    return jsonOk(created, 201);
  } catch (error) {
    if (isUniqueConstraint(error)) {
      return jsonError("A category with this name already exists", 409);
    }
    return handleApiError(error);
  }
}
