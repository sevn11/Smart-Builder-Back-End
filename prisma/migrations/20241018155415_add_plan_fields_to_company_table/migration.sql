-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "plan_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "plan_type" "PlanType";
