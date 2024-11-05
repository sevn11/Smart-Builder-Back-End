-- CreateTable
CREATE TABLE "client_template_question" (
    "id" SERIAL NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "link_to_phase" BOOLEAN NOT NULL DEFAULT false,
    "link_to_initial_selection" BOOLEAN NOT NULL DEFAULT false,
    "link_to_paint_selection" BOOLEAN NOT NULL DEFAULT false,
    "link_to_questionnaire" BOOLEAN NOT NULL DEFAULT true,
    "question" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "multipleOptions" JSONB,
    "client_category_id" INTEGER,
    "phase_id" INTEGER,
    "question_order" INTEGER NOT NULL DEFAULT 0,
    "customer_id" INTEGER NOT NULL,
    "job_id" INTEGER,
    "contractorIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_template_question_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "client_template_question" ADD CONSTRAINT "client_template_question_client_category_id_fkey" FOREIGN KEY ("client_category_id") REFERENCES "client_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_template_question" ADD CONSTRAINT "client_template_question_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "contractor_phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_template_question" ADD CONSTRAINT "client_template_question_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_template_question" ADD CONSTRAINT "client_template_question_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
