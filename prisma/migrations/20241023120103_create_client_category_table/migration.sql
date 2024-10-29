-- CreateTable
CREATE TABLE "client_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "link_to_phase" BOOLEAN NOT NULL DEFAULT false,
    "phase_id" INTEGER,
    "link_to_initial_selection" BOOLEAN NOT NULL DEFAULT false,
    "link_to_paint_selection" BOOLEAN NOT NULL DEFAULT false,
    "link_to_questionnaire" BOOLEAN NOT NULL DEFAULT true,
    "is_company_category" BOOLEAN NOT NULL DEFAULT false,
    "company_id" INTEGER,
    "questionnaire_order" INTEGER NOT NULL,
    "contractorIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "job_id" INTEGER,

    CONSTRAINT "client_categories_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "client_categories" ADD CONSTRAINT "client_categories_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "contractor_phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_categories" ADD CONSTRAINT "client_categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_categories" ADD CONSTRAINT "client_categories_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_categories" ADD CONSTRAINT "client_categories_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
