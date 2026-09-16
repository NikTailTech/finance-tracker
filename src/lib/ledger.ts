import {
  CategoryKind,
  Currency,
  DivisionType,
  Prisma,
  TransactionType,
  TransferKind,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { fetchExternalInvestments } from "@/lib/external-investments";
import { add, money, serializeDecimal, serializeRate, sub, toDecimal } from "@/lib/money";
import {
  buildWealthAllocation,
  convertCurrency,
  sumInvestmentEnvelopeByCurrency,
} from "@/lib/wealth-allocation";

const divisionInclude = {
  account: true,
} satisfies Prisma.AccountDivisionInclude;

export async function assertDivisionBelongsToAccount(
  divisionId: string,
  accountId: string,
) {
  const division = await prisma.accountDivision.findUnique({
    where: { id: divisionId },
    include: divisionInclude,
  });
  if (!division || division.accountId !== accountId) {
    throw new Error("Division does not belong to the selected account");
  }
  return division;
}

export async function assertCategoryKind(
  categoryId: string,
  kind: CategoryKind,
) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || !category.isActive) {
    throw new Error("Category not found");
  }
  if (category.kind !== kind) {
    throw new Error(`Category must be of kind ${kind}`);
  }
  return category;
}

type BalanceMap = Map<string, ReturnType<typeof money>>;

function bump(map: BalanceMap, key: string, delta: Prisma.Decimal | string) {
  const current = map.get(key) ?? money(0);
  map.set(key, add(current, delta));
}

export type DivisionBalance = {
  divisionId: string;
  type: DivisionType;
  balance: string;
};

export type AccountBalance = {
  accountId: string;
  name: string;
  currency: Currency;
  kind: string;
  balance: string;
  divisions: DivisionBalance[];
};

export async function computeBalances(): Promise<AccountBalance[]> {
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    include: { divisions: { orderBy: { type: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  const [transactions, transfers] = await Promise.all([
    prisma.transaction.findMany({
      select: {
        type: true,
        amount: true,
        accountId: true,
        divisionId: true,
      },
    }),
    prisma.transfer.findMany({
      select: {
        fromAccountId: true,
        fromDivisionId: true,
        fromAmount: true,
        toAccountId: true,
        toDivisionId: true,
        toAmount: true,
      },
    }),
  ]);

  const divisionBalances: BalanceMap = new Map();

  for (const account of accounts) {
    for (const division of account.divisions) {
      divisionBalances.set(division.id, money(0));
    }
  }

  for (const tx of transactions) {
    if (tx.type === TransactionType.INCOME) {
      bump(divisionBalances, tx.divisionId, tx.amount);
    } else {
      bump(divisionBalances, tx.divisionId, money(tx.amount).negated());
    }
  }

  for (const transfer of transfers) {
    bump(divisionBalances, transfer.fromDivisionId, money(transfer.fromAmount).negated());
    bump(divisionBalances, transfer.toDivisionId, transfer.toAmount);
  }

  return accounts.map((account) => {
    const divisions = account.divisions.map((division) => ({
      divisionId: division.id,
      type: division.type,
      balance: serializeDecimal(divisionBalances.get(division.id) ?? money(0)),
    }));
    const balance = divisions.reduce(
      (sum, d) => add(sum, d.balance),
      money(0),
    );
    return {
      accountId: account.id,
      name: account.name,
      currency: account.currency,
      kind: account.kind,
      balance: serializeDecimal(balance),
      divisions,
    };
  });
}

export async function getDashboardSummary(from?: Date, to?: Date) {
  const dateFilter =
    from || to
      ? {
          date: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

  const [balances, settings, recentExpenses, recentIncome, recentTransfers, expenses, incomes] =
    await Promise.all([
      computeBalances(),
      prisma.settings.findUnique({ where: { id: "default" } }),
      prisma.transaction.findMany({
        where: { type: TransactionType.EXPENSE },
        include: { account: true, division: true, category: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 8,
      }),
      prisma.transaction.findMany({
        where: { type: TransactionType.INCOME },
        include: { account: true, division: true, category: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 8,
      }),
      prisma.transfer.findMany({
        include: {
          fromAccount: true,
          toAccount: true,
          fromDivision: true,
          toDivision: true,
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 8,
      }),
      prisma.transaction.findMany({
        where: { type: TransactionType.EXPENSE, ...dateFilter },
        include: { category: true, account: true },
      }),
      prisma.transaction.findMany({
        where: { type: TransactionType.INCOME, ...dateFilter },
        include: { category: true, account: true },
      }),
    ]);

  const eurToChf = toDecimal(settings?.eurToChfRate ?? "0.95");
  const displayCurrency = settings?.displayCurrency ?? Currency.EUR;

  const externalInvestments = await fetchExternalInvestments({
    eurToChf,
  });

  let ledgerEur = money(0);
  let ledgerChf = money(0);
  for (const account of balances) {
    if (account.currency === Currency.EUR) {
      ledgerEur = add(ledgerEur, account.balance);
    } else {
      ledgerChf = add(ledgerChf, account.balance);
    }
  }

  const investmentsEurNative = money(externalInvestments.totals.EUR);
  const investmentsChfNative = money(externalInvestments.totals.CHF);

  /** Sum of assets denominated in that currency (no FX). */
  const byCurrencyEur = add(ledgerEur, investmentsEurNative);
  const byCurrencyChf = add(ledgerChf, investmentsChfNative);

  /** Everything converted into one currency via FX. */
  const convertedEur = add(
    add(
      ledgerEur,
      convertCurrency(ledgerChf, Currency.CHF, Currency.EUR, eurToChf),
    ),
    add(
      investmentsEurNative,
      convertCurrency(investmentsChfNative, Currency.CHF, Currency.EUR, eurToChf),
    ),
  );
  const convertedChf = add(
    add(
      convertCurrency(ledgerEur, Currency.EUR, Currency.CHF, eurToChf),
      ledgerChf,
    ),
    add(
      convertCurrency(investmentsEurNative, Currency.EUR, Currency.CHF, eurToChf),
      investmentsChfNative,
    ),
  );

  const wealthAllocation = buildWealthAllocation(
    balances,
    externalInvestments,
    eurToChf,
    Currency.CHF,
  );

  const investmentEnvelope = sumInvestmentEnvelopeByCurrency(balances, eurToChf);

  const incomeByCurrency: Record<Currency, ReturnType<typeof money>> = {
    EUR: money(0),
    CHF: money(0),
  };
  const expenseByCurrency: Record<Currency, ReturnType<typeof money>> = {
    EUR: money(0),
    CHF: money(0),
  };

  for (const tx of incomes) {
    incomeByCurrency[tx.currency] = add(incomeByCurrency[tx.currency], tx.amount);
  }
  for (const tx of expenses) {
    expenseByCurrency[tx.currency] = add(expenseByCurrency[tx.currency], tx.amount);
  }

  const expensesByCategoryMap = new Map<
    string,
    { categoryId: string; name: string; EUR: ReturnType<typeof money>; CHF: ReturnType<typeof money> }
  >();

  for (const tx of expenses) {
    const key = tx.categoryId;
    const existing = expensesByCategoryMap.get(key) ?? {
      categoryId: tx.categoryId,
      name: tx.category.name,
      EUR: money(0),
      CHF: money(0),
    };
    existing[tx.currency] = add(existing[tx.currency], tx.amount);
    expensesByCategoryMap.set(key, existing);
  }

  const recent = [
    ...recentExpenses.map((t) => ({
      entryType: "expense" as const,
      ...serializeTransaction(t),
    })),
    ...recentIncome.map((t) => ({
      entryType: "income" as const,
      ...serializeTransaction(t),
    })),
    ...recentTransfers.map((t) => ({
      entryType: "transfer" as const,
      ...serializeTransfer(t),
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 12);

  return {
    netWorth: {
      eurToChfRate: serializeRate(eurToChf),
      /** Native sums: accounts + investments denominated in that currency. */
      byCurrency: {
        EUR: serializeDecimal(byCurrencyEur),
        CHF: serializeDecimal(byCurrencyChf),
      },
      /** Fully converted wealth (toggle on dashboard). */
      converted: {
        EUR: serializeDecimal(convertedEur),
        CHF: serializeDecimal(convertedChf),
      },
      ledger: {
        EUR: serializeDecimal(ledgerEur),
        CHF: serializeDecimal(ledgerChf),
      },
      /** Native investment totals by currency (API usually fills CHF). */
      investments: {
        EUR: serializeDecimal(investmentsEurNative),
        CHF: serializeDecimal(investmentsChfNative),
      },
      /** @deprecated */
      total: {
        EUR: serializeDecimal(convertedEur),
        CHF: serializeDecimal(convertedChf),
      },
      amount: serializeDecimal(
        displayCurrency === Currency.EUR ? convertedEur : convertedChf,
      ),
      currency: displayCurrency,
    },
    accounts: balances,
    income: {
      EUR: serializeDecimal(incomeByCurrency.EUR),
      CHF: serializeDecimal(incomeByCurrency.CHF),
    },
    expenses: {
      EUR: serializeDecimal(expenseByCurrency.EUR),
      CHF: serializeDecimal(expenseByCurrency.CHF),
    },
    expensesByCategory: Array.from(expensesByCategoryMap.values()).map((row) => ({
      categoryId: row.categoryId,
      name: row.name,
      EUR: serializeDecimal(row.EUR),
      CHF: serializeDecimal(row.CHF),
    })),
    investments: {
      totals: {
        EUR: serializeDecimal(investmentsEurNative),
        CHF: serializeDecimal(investmentsChfNative),
      },
      /** CHF total converted to EUR for display helpers. */
      totalChf: serializeDecimal(investmentsChfNative),
      totalEur: serializeDecimal(
        convertCurrency(investmentsChfNative, Currency.CHF, Currency.EUR, eurToChf),
      ),
      envelope: investmentEnvelope,
      connected: externalInvestments.connected,
      sources: externalInvestments.sources.map((source) => {
        const sourceCurrency =
          source.currency === "EUR" ? Currency.EUR : Currency.CHF;
        return {
          ...source,
          amountEur: serializeDecimal(
            convertCurrency(source.amount, sourceCurrency, Currency.EUR, eurToChf),
          ),
          amountChf: serializeDecimal(
            convertCurrency(source.amount, sourceCurrency, Currency.CHF, eurToChf),
          ),
        };
      }),
    },
    wealthAllocation: {
      total: wealthAllocation.total,
      currency: wealthAllocation.currency,
      segments: wealthAllocation.segments,
    },
    recent,
  };
}

type TxWithRelations = Prisma.TransactionGetPayload<{
  include: { account: true; division: true; category: true };
}>;

type TransferWithRelations = Prisma.TransferGetPayload<{
  include: {
    fromAccount: true;
    toAccount: true;
    fromDivision: true;
    toDivision: true;
  };
}>;

export type TransactionListFilters = {
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  divisionId?: string;
  from?: string;
  to?: string;
  amountMin?: string;
  amountMax?: string;
  q?: string;
};

export async function listTransactions(filters: TransactionListFilters = {}) {
  const where: Prisma.TransactionWhereInput = {};

  if (filters.type) where.type = filters.type;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.accountId) where.accountId = filters.accountId;
  if (filters.divisionId) where.divisionId = filters.divisionId;

  if (filters.from || filters.to) {
    where.date = {
      ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}),
      ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}),
    };
  }

  if (filters.amountMin || filters.amountMax) {
    where.amount = {
      ...(filters.amountMin ? { gte: money(filters.amountMin).toFixed(4) } : {}),
      ...(filters.amountMax ? { lte: money(filters.amountMax).toFixed(4) } : {}),
    };
  }

  if (filters.q) {
    where.title = { contains: filters.q, mode: "insensitive" };
  }

  const rows = await prisma.transaction.findMany({
    where,
    include: { account: true, division: true, category: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return rows.map(serializeTransaction);
}

export function serializeTransaction(tx: TxWithRelations) {
  return {
    id: tx.id,
    type: tx.type,
    title: tx.title,
    notes: tx.notes,
    date: tx.date.toISOString().slice(0, 10),
    amount: serializeDecimal(tx.amount),
    currency: tx.currency,
    accountId: tx.accountId,
    divisionId: tx.divisionId,
    categoryId: tx.categoryId,
    account: { id: tx.account.id, name: tx.account.name, currency: tx.account.currency },
    division: { id: tx.division.id, type: tx.division.type },
    category: { id: tx.category.id, name: tx.category.name, kind: tx.category.kind },
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

export function serializeTransfer(transfer: TransferWithRelations) {
  return {
    id: transfer.id,
    kind: transfer.kind,
    title: transfer.title,
    notes: transfer.notes,
    date: transfer.date.toISOString().slice(0, 10),
    fromAccountId: transfer.fromAccountId,
    fromDivisionId: transfer.fromDivisionId,
    fromAmount: serializeDecimal(transfer.fromAmount),
    fromCurrency: transfer.fromCurrency,
    toAccountId: transfer.toAccountId,
    toDivisionId: transfer.toDivisionId,
    toAmount: serializeDecimal(transfer.toAmount),
    toCurrency: transfer.toCurrency,
    exchangeRate: transfer.exchangeRate
      ? serializeDecimal(transfer.exchangeRate)
      : null,
    fromAccount: {
      id: transfer.fromAccount.id,
      name: transfer.fromAccount.name,
      currency: transfer.fromAccount.currency,
    },
    toAccount: {
      id: transfer.toAccount.id,
      name: transfer.toAccount.name,
      currency: transfer.toAccount.currency,
    },
    fromDivision: { id: transfer.fromDivision.id, type: transfer.fromDivision.type },
    toDivision: { id: transfer.toDivision.id, type: transfer.toDivision.type },
    createdAt: transfer.createdAt.toISOString(),
    updatedAt: transfer.updatedAt.toISOString(),
  };
}

export async function createExpenseOrIncome(
  type: TransactionType,
  input: {
    title: string;
    notes?: string | null;
    date: string;
    amount: string;
    accountId: string;
    divisionId: string;
    categoryId: string;
  },
) {
  const account = await prisma.account.findUnique({ where: { id: input.accountId } });
  if (!account || !account.isActive) throw new Error("Account not found");

  await assertDivisionBelongsToAccount(input.divisionId, input.accountId);
  await assertCategoryKind(
    input.categoryId,
    type === TransactionType.EXPENSE ? CategoryKind.EXPENSE : CategoryKind.INCOME,
  );

  const created = await prisma.transaction.create({
    data: {
      type,
      title: input.title,
      notes: input.notes ?? null,
      date: new Date(input.date),
      amount: money(input.amount).toFixed(4),
      currency: account.currency,
      accountId: input.accountId,
      divisionId: input.divisionId,
      categoryId: input.categoryId,
    },
    include: { account: true, division: true, category: true },
  });

  return serializeTransaction(created);
}

export async function createTransfer(input: {
  kind: TransferKind;
  title: string;
  notes?: string | null;
  date: string;
  fromAccountId: string;
  fromDivisionId: string;
  fromAmount: string;
  toAccountId: string;
  toDivisionId: string;
  toAmount?: string;
  exchangeRate?: string | null;
}) {
  const [fromAccount, toAccount] = await Promise.all([
    prisma.account.findUnique({ where: { id: input.fromAccountId } }),
    prisma.account.findUnique({ where: { id: input.toAccountId } }),
  ]);
  if (!fromAccount || !toAccount) throw new Error("Account not found");

  await assertDivisionBelongsToAccount(input.fromDivisionId, input.fromAccountId);
  await assertDivisionBelongsToAccount(input.toDivisionId, input.toAccountId);

  const fromAmount = money(input.fromAmount);
  let toAmount = input.toAmount ? money(input.toAmount) : fromAmount;
  let exchangeRate: string | null = null;

  if (input.kind === TransferKind.CONVERSION) {
    if (fromAccount.currency === toAccount.currency) {
      throw new Error("Conversion requires different currencies");
    }
    if (input.exchangeRate) {
      exchangeRate = money(input.exchangeRate).toFixed(8);
      const rate = toDecimal(exchangeRate);
      if (fromAccount.currency === Currency.EUR && toAccount.currency === Currency.CHF) {
        toAmount = money(fromAmount.mul(rate));
      } else if (fromAccount.currency === Currency.CHF && toAccount.currency === Currency.EUR) {
        toAmount = money(fromAmount.div(rate));
      } else {
        throw new Error("Unsupported currency pair");
      }
    } else if (!input.toAmount) {
      throw new Error("Provide exchangeRate or toAmount for conversions");
    }
  } else {
    if (fromAccount.currency !== toAccount.currency) {
      throw new Error("Use CONVERSION for different currencies");
    }
    toAmount = fromAmount;
    if (input.kind === TransferKind.DIVISION && input.fromAccountId !== input.toAccountId) {
      throw new Error("Division transfer must stay within the same account");
    }
    if (input.kind === TransferKind.ACCOUNT && input.fromAccountId === input.toAccountId) {
      throw new Error("Account transfer requires different accounts");
    }
  }

  if (
    input.fromAccountId === input.toAccountId &&
    input.fromDivisionId === input.toDivisionId
  ) {
    throw new Error("Source and destination must differ");
  }

  const created = await prisma.transfer.create({
    data: {
      kind: input.kind,
      title: input.title,
      notes: input.notes ?? null,
      date: new Date(input.date),
      fromAccountId: input.fromAccountId,
      fromDivisionId: input.fromDivisionId,
      fromAmount: fromAmount.toFixed(4),
      fromCurrency: fromAccount.currency,
      toAccountId: input.toAccountId,
      toDivisionId: input.toDivisionId,
      toAmount: toAmount.toFixed(4),
      toCurrency: toAccount.currency,
      exchangeRate,
    },
    include: {
      fromAccount: true,
      toAccount: true,
      fromDivision: true,
      toDivision: true,
    },
  });

  return serializeTransfer(created);
}

export { sub };
