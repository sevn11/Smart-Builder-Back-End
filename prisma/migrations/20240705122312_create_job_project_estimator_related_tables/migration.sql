-- CreateTable
CREATE TABLE "job_project_estimator_header" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "company_id" INTEGER,
    "job_id" INTEGER,
    "is_deleted" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_project_estimator_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_project_estimator" (
    "id" SERIAL NOT NULL,
    "item" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost_type" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DOUBLE PRECISION NOT NULL,
    "actual_cost" DOUBLE PRECISION NOT NULL,
    "gross_profit" DOUBLE PRECISION NOT NULL,
    "contract_price" DOUBLE PRECISION NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "job_project_estimator_header_id" INTEGER,

    CONSTRAINT "job_project_estimator_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "job_project_estimator_header" ADD CONSTRAINT "job_project_estimator_header_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_project_estimator_header" ADD CONSTRAINT "job_project_estimator_header_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_project_estimator" ADD CONSTRAINT "job_project_estimator_job_project_estimator_header_id_fkey" FOREIGN KEY ("job_project_estimator_header_id") REFERENCES "job_project_estimator_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
