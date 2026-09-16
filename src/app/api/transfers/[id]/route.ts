import { prisma } from "@/lib/db";
import { serializeTransfer } from "@/lib/ledger";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        fromAccount: true,
        toAccount: true,
        fromDivision: true,
        toDivision: true,
      },
    });
    if (!transfer) return jsonError("Not found", 404);
    return jsonOk(serializeTransfer(transfer));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.transfer.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
