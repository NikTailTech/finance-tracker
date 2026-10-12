import { prisma } from "@/lib/db";
import { reopenDebt, serializeDebt, settleDebt } from "@/lib/debts";
import { debtSettleSchema, debtUpdateSchema } from "@/lib/schemas";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await prisma.debt.findUnique({ where: { id } });
    if (!existing) return jsonError("Debt not found", 404);

    const raw = await request.json();

    // Settle → create income/expense from debt values.
    if (raw?.status === "SETTLED") {
      const settle = debtSettleSchema.parse(raw);
      const updated = await settleDebt(existing, settle);
      return jsonOk(updated);
    }

    // Reopen → delete linked ledger entry.
    if (raw?.status === "OPEN") {
      const updated = await reopenDebt(existing);
      return jsonOk(updated);
    }

    if (existing.status === "SETTLED") {
      return jsonError("Reopen the debt before editing it", 400);
    }

    const body = debtUpdateSchema.parse(raw);
    const data: {
      counterparty?: string;
      title?: string;
      notes?: string | null;
      direction?: "OWED_TO_ME" | "I_OWE";
      amount?: string;
      currency?: "EUR" | "CHF";
      date?: Date;
    } = {};

    if (body.counterparty !== undefined) data.counterparty = body.counterparty;
    if (body.title !== undefined) data.title = body.title;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.direction !== undefined) data.direction = body.direction;
    if (body.amount !== undefined) data.amount = body.amount;
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.date !== undefined) data.date = new Date(body.date);

    const updated = await prisma.debt.update({
      where: { id },
      data,
    });
    return jsonOk(serializeDebt(updated));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await prisma.debt.findUnique({ where: { id } });
    if (!existing) return jsonError("Debt not found", 404);
    // Keep the linked income/expense if any; only remove the debt row.
    await prisma.debt.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
