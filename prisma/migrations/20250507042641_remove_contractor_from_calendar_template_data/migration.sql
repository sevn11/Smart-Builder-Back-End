/*
  Warnings:

  - You are about to drop the column `contractorId` on the `calendar_template_data` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "calendar_template_data" DROP CONSTRAINT "calendar_template_data_contractorId_fkey";

-- AlterTable
ALTER TABLE "calendar_template_data" DROP COLUMN "contractorId";
