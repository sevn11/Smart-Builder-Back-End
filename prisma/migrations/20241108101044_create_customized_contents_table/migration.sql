-- CreateTable
CREATE TABLE "customized_contents" (
    "id" SERIAL NOT NULL,
    "page_type" TEXT,
    "content" TEXT,
    "company_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customized_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customized_contents_company_id_page_type_key" ON "customized_contents"("company_id", "page_type");

-- AddForeignKey
ALTER TABLE "customized_contents" ADD CONSTRAINT "customized_contents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
