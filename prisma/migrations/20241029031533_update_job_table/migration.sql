-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_template_id_fkey";

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "questionnaire_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
