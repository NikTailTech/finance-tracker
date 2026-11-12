import { PrismaClient, Currency } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Settings only: create once, never overwrite user changes.
  // Accounts and categories stay empty — the user creates them as first steps.
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      eurToChfRate: "0.94514000",
      displayCurrency: Currency.EUR,
    },
  });

  console.log(
    "Seed complete: settings ready. Accounts and categories left empty for the user.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
