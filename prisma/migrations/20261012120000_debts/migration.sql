-- CreateEnum
CREATE TYPE "DebtDirection" AS ENUM ('OWED_TO_ME', 'I_OWE');

-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('OPEN', 'SETTLED');

-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "counterparty" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "direction" "DebtDirection" NOT NULL,
    "status" "DebtStatus" NOT NULL DEFAULT 'OPEN',
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" "Currency" NOT NULL,
    "date" DATE NOT NULL,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Debt_status_date_idx" ON "Debt"("status", "date");

-- CreateIndex
CREATE INDEX "Debt_direction_status_idx" ON "Debt"("direction", "status");

-- CreateIndex
CREATE INDEX "Debt_counterparty_idx" ON "Debt"("counterparty");
