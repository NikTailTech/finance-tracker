-- AlterTable
ALTER TABLE "TransactionTemplate" ALTER COLUMN "amount" DROP NOT NULL;
ALTER TABLE "TransactionTemplate" ALTER COLUMN "accountId" DROP NOT NULL;
ALTER TABLE "TransactionTemplate" ALTER COLUMN "divisionId" DROP NOT NULL;
ALTER TABLE "TransactionTemplate" ALTER COLUMN "categoryId" DROP NOT NULL;
