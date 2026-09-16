import { CategoryKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { categoryCreateSchema } from "@/lib/schemas";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind");
    const where =
      kind === "EXPENSE" || kind === "INCOME"
        ? { kind: kind as CategoryKind, isActive: true }
        : { isActive: true };

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
    const created = await prisma.category.create({
      data: {
        name: body.name,
        kind: body.kind,
        color: body.color ?? null,
        icon: body.icon ?? null,
      },
    });
    return jsonOk(created, 201);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return jsonError("Category already exists", 409);
    }
    return handleApiError(error);
  }
}
