-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "questionnaire_template_id" INTEGER;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_questionnaire_template_id_fkey" FOREIGN KEY ("questionnaire_template_id") REFERENCES "questionnaire_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
