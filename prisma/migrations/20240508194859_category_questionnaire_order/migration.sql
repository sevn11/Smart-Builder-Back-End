/*
  Warnings:

  - Added the required column `questionnaire_order` to the `categories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "is_company_category" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "questionnaire_order" INTEGER NOT NULL;
