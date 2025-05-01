-- CreateTable
CREATE TABLE "calendar_template_data_link" (
    "id" SERIAL NOT NULL,
    "ct_id" INTEGER,
    "source_id" INTEGER NOT NULL,
    "target_id" INTEGER NOT NULL,
    "type" "TypeEnum" NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_template_data_link_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "calendar_template_data_link" ADD CONSTRAINT "calendar_template_data_link_ct_id_fkey" FOREIGN KEY ("ct_id") REFERENCES "calendar_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_template_data_link" ADD CONSTRAINT "calendar_template_data_link_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "calendar_template_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_template_data_link" ADD CONSTRAINT "calendar_template_data_link_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "calendar_template_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;
