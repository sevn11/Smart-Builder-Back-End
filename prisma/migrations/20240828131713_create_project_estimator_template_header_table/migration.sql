-- CreateTable
CREATE TABLE "project_estimator_template_header" (
    "id" SERIAL NOT NULL,
    "project_estimator_template_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "company_id" INTEGER,
    "is_deleted" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_estimator_template_header_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "project_estimator_template_header" ADD CONSTRAINT "project_estimator_template_header_project_estimator_templa_fkey" FOREIGN KEY ("project_estimator_template_id") REFERENCES "project_estimator_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_estimator_template_header" ADD CONSTRAINT "project_estimator_template_header_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
