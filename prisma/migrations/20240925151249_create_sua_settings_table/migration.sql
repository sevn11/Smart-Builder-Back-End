-- CreateTable
CREATE TABLE "sua_settings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "extra_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sua_settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sua_settings" ADD CONSTRAINT "sua_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
