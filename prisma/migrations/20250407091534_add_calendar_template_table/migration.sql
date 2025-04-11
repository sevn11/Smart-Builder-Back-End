-- AlterTable
ALTER TABLE "questionnaire_template" ADD COLUMN     "ct_id" INTEGER;

-- CreateTable
CREATE TABLE "calendar_template" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_company_template" BOOLEAN NOT NULL DEFAULT true,
    "company_id" INTEGER,

    CONSTRAINT "calendar_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_template_data" (
    "id" SERIAL NOT NULL,
    "calendar_template_id" INTEGER NOT NULL,
    "company_id" INTEGER,
    "is_scheduled_on_weekend" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER NOT NULL DEFAULT 1,
    "phase_id" INTEGER NOT NULL,
    "contractorIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_template_data_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "questionnaire_template" ADD CONSTRAINT "questionnaire_template_ct_id_fkey" FOREIGN KEY ("ct_id") REFERENCES "calendar_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_template" ADD CONSTRAINT "calendar_template_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_template_data" ADD CONSTRAINT "calendar_template_data_calendar_template_id_fkey" FOREIGN KEY ("calendar_template_id") REFERENCES "calendar_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_template_data" ADD CONSTRAINT "calendar_template_data_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_template_data" ADD CONSTRAINT "calendar_template_data_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "contractor_phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
