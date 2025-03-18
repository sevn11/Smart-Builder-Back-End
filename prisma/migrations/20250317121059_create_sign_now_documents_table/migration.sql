-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PROPOSAL', 'SPECIFICATION', 'CHANGE_ORDER', 'INITIAL_SELECTION', 'PAINT_SELECTION');

-- CreateTable
CREATE TABLE "sign_now_documents" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_id" TEXT NOT NULL,
    "sign_now_event_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "change_order_id" INTEGER,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sign_now_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sign_now_documents_document_id_key" ON "sign_now_documents"("document_id");

-- AddForeignKey
ALTER TABLE "sign_now_documents" ADD CONSTRAINT "sign_now_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_now_documents" ADD CONSTRAINT "sign_now_documents_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_now_documents" ADD CONSTRAINT "sign_now_documents_change_order_id_fkey" FOREIGN KEY ("change_order_id") REFERENCES "job_project_estimator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
