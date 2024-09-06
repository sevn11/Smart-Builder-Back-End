-- AlterTable
ALTER TABLE "template_question" ADD COLUMN     "phase_id" INTEGER;

-- AddForeignKey
ALTER TABLE "template_question" ADD CONSTRAINT "template_question_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "contractor_phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
