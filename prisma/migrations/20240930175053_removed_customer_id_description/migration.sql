/*
  Warnings:

  - You are about to drop the column `customer_id` on the `project_description` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "project_description" DROP CONSTRAINT "project_description_customer_id_fkey";

-- AlterTable
ALTER TABLE "project_description" DROP COLUMN "customer_id";
