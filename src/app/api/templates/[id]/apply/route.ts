import { prisma } from "@/lib/db";
import { createExpenseOrIncome } from "@/lib/ledger";
import { serializeDecimal } from "@/lib/money";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { hasTemplatePlaceholders } from "@/lib/template-title";

type Params = { params: Promise<{ id: string }> };

function todayIsoDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const template = await prisma.transactionTemplate.findUnique({
      where: { id },
    });
    if (!template) return jsonError("Template not found", 404);

    if (
      !template.amount ||
      !template.accountId ||
      !template.divisionId ||
      !template.categoryId
    ) {
      return jsonError(
        "Template is incomplete. Fill the missing fields in the form first.",
        422,
      );
    }

    if (hasTemplatePlaceholders(template.name)) {
      return jsonError(
        "Template title has placeholders. Fill the title in the form first.",
        422,
      );
    }

    const created = await createExpenseOrIncome(template.type, {
      title: template.name,
      notes: template.notes,
      date: todayIsoDate(),
      amount: serializeDecimal(template.amount.toString()),
      accountId: template.accountId,
      divisionId: template.divisionId,
      categoryId: template.categoryId,
    });

    return jsonOk(
      {
        transaction: created,
        appliedDate: todayIsoDate(),
        templateId: template.id,
        templateName: template.name,
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
