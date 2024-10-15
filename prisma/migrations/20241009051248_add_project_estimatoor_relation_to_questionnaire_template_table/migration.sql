-- AlterTable
ALTER TABLE "questionnaire_template" ADD COLUMN     "pet_id" INTEGER;

-- AddForeignKey
ALTER TABLE "questionnaire_template" ADD CONSTRAINT "questionnaire_template_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "project_estimator_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
