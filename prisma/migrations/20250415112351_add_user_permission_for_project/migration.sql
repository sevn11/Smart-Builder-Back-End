-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "user_id" INTEGER;

-- AlterTable
ALTER TABLE "permission_sets" ADD COLUMN     "project_access" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
