import { PrismaClient, Currency, AccountKind, DivisionType, CategoryKind } from "@prisma/client";

const prisma = new PrismaClient();

const DIVISIONS: DivisionType[] = [
  DivisionType.NEEDS,
  DivisionType.PLAY,
  DivisionType.INVESTMENT,
  DivisionType.SAVINGS,
];

const ACCOUNTS = [
  { name: "Conto EUR", currency: Currency.EUR, kind: AccountKind.CHECKING, sortOrder: 1 },
  { name: "Conto CHF", currency: Currency.CHF, kind: AccountKind.CHECKING, sortOrder: 2 },
  { name: "Cash", currency: Currency.EUR, kind: AccountKind.CASH, sortOrder: 3 },
] as const;

const EXPENSE_CATEGORIES = [
  "House",
  "Entertainment",
  "Shopping",
  "Groceries",
  "Transport",
  "Bills",
  "Health",
  "Food & Dining",
  "Travel",
  "Other",
];

const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investments",
  "Gift",
  "Refund",
  "Other",
];

async function main() {
  // Settings: create once, never overwrite user changes.
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      eurToChfRate: "0.94514000",
      displayCurrency: Currency.EUR,
    },
  });

  // Accounts: only bootstrap when the ledger is empty.
  // Never recreate/reactivate defaults after the user renamed or deleted them.
  const accountCount = await prisma.account.count();
  if (accountCount === 0) {
    for (const account of ACCOUNTS) {
      const created = await prisma.account.create({
        data: {
          name: account.name,
          currency: account.currency,
          kind: account.kind,
          sortOrder: account.sortOrder,
        },
      });

      for (const type of DIVISIONS) {
        await prisma.accountDivision.create({
          data: {
            accountId: created.id,
            type,
          },
        });
      }
    }
    console.log("Seed: created default accounts + divisions.");
  } else {
    console.log(
      `Seed: skipped accounts (${accountCount} already present).`,
    );
  }

  // Categories: create missing defaults only — never force isActive/sortOrder.
  for (const [index, name] of EXPENSE_CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { name_kind: { name, kind: CategoryKind.EXPENSE } },
      update: {},
      create: { name, kind: CategoryKind.EXPENSE, sortOrder: index },
    });
  }

  for (const [index, name] of INCOME_CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { name_kind: { name, kind: CategoryKind.INCOME } },
      update: {},
      create: { name, kind: CategoryKind.INCOME, sortOrder: index },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
