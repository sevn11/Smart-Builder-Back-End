/*
  Warnings:

  - You are about to alter the column `amount` on the `payment_schedule` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `bank_fees` on the `payment_schedule_draw` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "payment_schedule" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "payment_schedule_draw" ALTER COLUMN "bank_fees" SET DATA TYPE DECIMAL(10,2);
