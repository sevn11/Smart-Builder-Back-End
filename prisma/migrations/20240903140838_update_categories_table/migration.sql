-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "phase_id" INTEGER;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "contractor_phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
