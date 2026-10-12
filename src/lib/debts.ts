import {
  DebtDirection,
  DebtStatus,
  TransactionType,
  type Debt,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { createExpenseOrIncome } from "@/lib/ledger";
import { serializeDecimal } from "@/lib/money";

export type DebtRow = {
  id: string;
  counterparty: string;
  title: string;
  notes: string | null;
  direction: DebtDirection;
  status: DebtStatus;
  amount: string;
  currency: "EUR" | "CHF";
  date: string;
  settledAt: string | null;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeDebt(debt: Debt): DebtRow {
  return {
    id: debt.id,
    counterparty: debt.counterparty,
    title: debt.title,
    notes: debt.notes,
    direction: debt.direction,
    status: debt.status,
    amount: serializeDecimal(debt.amount),
    currency: debt.currency,
    date: debt.date.toISOString().slice(0, 10),
    settledAt: debt.settledAt ? debt.settledAt.toISOString() : null,
    transactionId: debt.transactionId,
    createdAt: debt.createdAt.toISOString(),
    updatedAt: debt.updatedAt.toISOString(),
  };
}

export type DebtCreateData = {
  counterparty: string;
  title: string;
  notes?: string | null;
  direction: DebtDirection;
  amount: string;
  currency: "EUR" | "CHF";
  date: string;
};

export function debtCreatePayload(
  body: DebtCreateData,
): Prisma.DebtCreateInput {
  return {
    counterparty: body.counterparty,
    title: body.title,
    notes: body.notes ?? null,
    direction: body.direction,
    amount: body.amount,
    currency: body.currency,
    date: new Date(body.date),
    status: DebtStatus.OPEN,
  };
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function settlementNotes(debt: Debt) {
  const base = `Debt · ${debt.counterparty}`;
  return debt.notes?.trim() ? `${base}\n${debt.notes.trim()}` : base;
}

/**
 * Mark debt settled and create matching ledger entry:
 * OWED_TO_ME → income, I_OWE → expense.
 */
export async function settleDebt(
  debt: Debt,
  input: { accountId: string; divisionId: string; categoryId: string },
) {
  if (debt.status === DebtStatus.SETTLED) {
    throw new Error("Debt is already settled");
  }

  const account = await prisma.account.findUnique({
    where: { id: input.accountId },
  });
  if (!account || !account.isActive) throw new Error("Account not found");
  if (account.currency !== debt.currency) {
    throw new Error(
      `Account currency must be ${debt.currency} to settle this debt`,
    );
  }

  const type =
    debt.direction === DebtDirection.OWED_TO_ME
      ? TransactionType.INCOME
      : TransactionType.EXPENSE;

  const created = await createExpenseOrIncome(type, {
    title: debt.title,
    notes: settlementNotes(debt),
    date: todayIsoDate(),
    amount: serializeDecimal(debt.amount),
    accountId: input.accountId,
    divisionId: input.divisionId,
    categoryId: input.categoryId,
  });

  const updated = await prisma.debt.update({
    where: { id: debt.id },
    data: {
      status: DebtStatus.SETTLED,
      settledAt: new Date(),
      transactionId: created.id,
    },
  });

  return serializeDebt(updated);
}

/** Reopen a settled debt and remove the linked income/expense. */
export async function reopenDebt(debt: Debt) {
  if (debt.status !== DebtStatus.SETTLED) {
    throw new Error("Debt is not settled");
  }

  if (debt.transactionId) {
    await prisma.transaction.delete({ where: { id: debt.transactionId } });
  }

  const updated = await prisma.debt.update({
    where: { id: debt.id },
    data: {
      status: DebtStatus.OPEN,
      settledAt: null,
      transactionId: null,
    },
  });

  return serializeDebt(updated);
}
