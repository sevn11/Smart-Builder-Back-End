/*
  Warnings:

  - You are about to drop the `PermissionSet` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PermissionSet" DROP CONSTRAINT "PermissionSet_user_id_fkey";

-- DropTable
DROP TABLE "PermissionSet";

-- CreateTable
CREATE TABLE "permission_sets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "full_access" BOOLEAN NOT NULL DEFAULT false,
    "specifications" BOOLEAN NOT NULL DEFAULT false,
    "selection" BOOLEAN NOT NULL DEFAULT false,
    "schedule" BOOLEAN NOT NULL DEFAULT false,
    "view_only" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permission_sets_user_id_key" ON "permission_sets"("user_id");

-- AddForeignKey
ALTER TABLE "permission_sets" ADD CONSTRAINT "permission_sets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
