/*
  Warnings:

  - You are about to drop the column `password_reset_code` on the `companies` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "companies" DROP COLUMN "password_reset_code";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_reset_code" INTEGER;
