/*
  Warnings:

  - You are about to drop the column `contractorIds` on the `calendar_template_data` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "calendar_template_data" DROP COLUMN "contractorIds",
ADD COLUMN     "contractorId" INTEGER;

-- AddForeignKey
ALTER TABLE "calendar_template_data" ADD CONSTRAINT "calendar_template_data_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "contractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
