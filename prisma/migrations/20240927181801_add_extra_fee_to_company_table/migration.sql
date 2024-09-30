/*
  Warnings:

  - You are about to drop the `sua_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "sua_settings" DROP CONSTRAINT "sua_settings_user_id_fkey";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "extra_fee" DECIMAL(10,2) NOT NULL DEFAULT 20.00;

-- DropTable
DROP TABLE "sua_settings";
