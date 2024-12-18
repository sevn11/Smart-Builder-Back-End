/*
  Warnings:

  - Added the required column `client_template_id` to the `client_categories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "client_categories" ADD COLUMN     "client_template_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "client_template" (
    "id" SERIAL NOT NULL,
    "questionnaire_template_id" INTEGER,
    "pet_id" INTEGER,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_template_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "client_template" ADD CONSTRAINT "client_template_questionnaire_template_id_fkey" FOREIGN KEY ("questionnaire_template_id") REFERENCES "questionnaire_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_template" ADD CONSTRAINT "client_template_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "project_estimator_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_categories" ADD CONSTRAINT "client_categories_client_template_id_fkey" FOREIGN KEY ("client_template_id") REFERENCES "client_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
