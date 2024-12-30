-- AlterTable
ALTER TABLE "client_template_question" ADD COLUMN     "initial_question_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paint_question_order" INTEGER NOT NULL DEFAULT 0;
