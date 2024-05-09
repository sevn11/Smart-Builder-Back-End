/*
  Warnings:

  - You are about to drop the `questionnaire_template_question` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "questionnaire_template_question" DROP CONSTRAINT "questionnaire_template_question_category_id_fkey";

-- DropForeignKey
ALTER TABLE "questionnaire_template_question" DROP CONSTRAINT "questionnaire_template_question_questionnaire_template_id_fkey";

-- DropTable
DROP TABLE "questionnaire_template_question";

-- CreateTable
CREATE TABLE "template_question" (
    "id" SERIAL NOT NULL,
    "is_deleted" BOOLEAN NOT NULL,
    "link_to_phase" BOOLEAN NOT NULL DEFAULT false,
    "link_to_selection" BOOLEAN NOT NULL DEFAULT false,
    "link_to_questionnaire" BOOLEAN NOT NULL DEFAULT true,
    "question" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "questionnaire_template_id" INTEGER,
    "category_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_question_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "template_question" ADD CONSTRAINT "template_question_questionnaire_template_id_fkey" FOREIGN KEY ("questionnaire_template_id") REFERENCES "questionnaire_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_question" ADD CONSTRAINT "template_question_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
