import { prisma } from "@/lib/db";
import { createTransfer, serializeTransfer } from "@/lib/ledger";
import { transferCreateSchema } from "@/lib/schemas";
import { handleApiError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    const rows = await prisma.transfer.findMany({
      include: {
        fromAccount: true,
        toAccount: true,
        fromDivision: true,
        toDivision: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return jsonOk(rows.map(serializeTransfer));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = transferCreateSchema.parse(await request.json());
    const created = await createTransfer({
      ...body,
      kind: body.kind,
    });
    return jsonOk(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
