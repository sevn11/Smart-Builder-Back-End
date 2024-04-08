/*
  Warnings:

  - Made the column `company_id` on table `Customer` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "mobile_number_1" DROP NOT NULL,
ALTER COLUMN "mobile_number_2" DROP NOT NULL,
ALTER COLUMN "email_address_1" DROP NOT NULL,
ALTER COLUMN "email_address_2" DROP NOT NULL,
ALTER COLUMN "employer_1" DROP NOT NULL,
ALTER COLUMN "employer_2" DROP NOT NULL,
ALTER COLUMN "work_telephone_1" DROP NOT NULL,
ALTER COLUMN "work_telephone_2" DROP NOT NULL,
ALTER COLUMN "company_id" SET NOT NULL;
