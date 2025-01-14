-- CreateEnum
CREATE TYPE "ProfitCalculationType" AS ENUM ('MARKUP', 'MARGIN');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "profilt_calculation_type" "ProfitCalculationType" DEFAULT 'MARGIN';
