/*
  Warnings:

  - You are about to alter the column `sale_tax_rate` on the `companies` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "companies" ALTER COLUMN "sale_tax_rate" SET DATA TYPE DOUBLE PRECISION;
