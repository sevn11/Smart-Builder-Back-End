-- CreateTable
CREATE TABLE "client_question_answer" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "answerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "answerText" JSONB,
    "job_id" INTEGER,
    "customer_id" INTEGER NOT NULL,
    "is_company_category" BOOLEAN NOT NULL DEFAULT false,
    "company_id" INTEGER,
    "client_template_id" INTEGER NOT NULL,
    "client_category_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_question_answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_question_answer_question_id_key" ON "client_question_answer"("question_id");

-- AddForeignKey
ALTER TABLE "client_question_answer" ADD CONSTRAINT "client_question_answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "client_template_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_question_answer" ADD CONSTRAINT "client_question_answer_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_question_answer" ADD CONSTRAINT "client_question_answer_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_question_answer" ADD CONSTRAINT "client_question_answer_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_question_answer" ADD CONSTRAINT "client_question_answer_client_template_id_fkey" FOREIGN KEY ("client_template_id") REFERENCES "client_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_question_answer" ADD CONSTRAINT "client_question_answer_client_category_id_fkey" FOREIGN KEY ("client_category_id") REFERENCES "client_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
