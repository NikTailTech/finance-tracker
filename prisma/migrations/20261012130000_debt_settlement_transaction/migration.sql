-- AlterTable
ALTER TABLE "Debt" ADD COLUMN "transactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Debt_transactionId_key" ON "Debt"("transactionId");

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
