-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "link_to_phase" BOOLEAN NOT NULL DEFAULT false,
    "link_to_selection" BOOLEAN NOT NULL DEFAULT false,
    "link_to_questionnaire" BOOLEAN NOT NULL DEFAULT true,
    "company_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_template" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL,
    "is_company_template" BOOLEAN NOT NULL DEFAULT true,
    "company_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaire_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_template_question" (
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

    CONSTRAINT "questionnaire_template_question_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_template" ADD CONSTRAINT "questionnaire_template_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_template_question" ADD CONSTRAINT "questionnaire_template_question_questionnaire_template_id_fkey" FOREIGN KEY ("questionnaire_template_id") REFERENCES "questionnaire_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_template_question" ADD CONSTRAINT "questionnaire_template_question_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
