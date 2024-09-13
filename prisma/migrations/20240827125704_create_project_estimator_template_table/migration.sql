-- CreateTable
CREATE TABLE "project_estimator_template" (
    "id" SERIAL NOT NULL,
    "templateName" TEXT NOT NULL,
    "company_id" INTEGER,

    CONSTRAINT "project_estimator_template_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "project_estimator_template" ADD CONSTRAINT "project_estimator_template_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
