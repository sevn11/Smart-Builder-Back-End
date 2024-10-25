-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "event_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "calendar_id" TEXT,
ADD COLUMN     "google_access_token" TEXT,
ADD COLUMN     "google_refresh_token" TEXT;
