/*
  Warnings:

  - You are about to drop the column `is_avatar` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "is_avatar",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;
