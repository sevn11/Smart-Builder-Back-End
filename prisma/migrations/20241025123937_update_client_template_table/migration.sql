/*
  Warnings:

  - Added the required column `customer_id` to the `client_template` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "client_template" ADD COLUMN     "company_id" INTEGER,
ADD COLUMN     "customer_id" INTEGER NOT NULL,
ADD COLUMN     "job_id" INTEGER;

-- AddForeignKey
ALTER TABLE "client_template" ADD CONSTRAINT "client_template_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_template" ADD CONSTRAINT "client_template_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_template" ADD CONSTRAINT "client_template_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
