/*
  Warnings:

  - Added the required column `client_template_id` to the `client_template_question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "client_template_question" ADD COLUMN     "client_template_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "client_template_question" ADD CONSTRAINT "client_template_question_client_template_id_fkey" FOREIGN KEY ("client_template_id") REFERENCES "client_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
