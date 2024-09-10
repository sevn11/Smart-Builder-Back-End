/*
  Warnings:

  - Added the required column `question_order` to the `template_question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "template_question" ADD COLUMN "question_order" INTEGER DEFAULT 0;