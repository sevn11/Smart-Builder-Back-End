/*
  Warnings:

  - You are about to drop the column `phase` on the `contractors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "contractors" DROP COLUMN "phase",
ADD COLUMN     "phase_id" INTEGER;

-- AddForeignKey
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "contractor_phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
