/*
  Warnings:

  - You are about to alter the column `unit_cost` on the `job_project_estimator` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `actual_cost` on the `job_project_estimator` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `gross_profit` on the `job_project_estimator` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `contract_price` on the `job_project_estimator` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - Added the required column `updated_at` to the `job_project_estimator` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "job_project_estimator" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "unit_cost" SET DEFAULT 0.00,
ALTER COLUMN "unit_cost" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "actual_cost" SET DEFAULT 0.00,
ALTER COLUMN "actual_cost" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "gross_profit" SET DEFAULT 0.00,
ALTER COLUMN "gross_profit" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "contract_price" SET DEFAULT 0.00,
ALTER COLUMN "contract_price" SET DATA TYPE DECIMAL(10,2);
