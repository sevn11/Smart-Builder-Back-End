-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "template_id" INTEGER;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "questionnaire_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
