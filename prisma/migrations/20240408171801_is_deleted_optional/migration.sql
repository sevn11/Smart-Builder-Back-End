-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "is_deleted" DROP NOT NULL,
ALTER COLUMN "is_deleted" SET DEFAULT false,
ALTER COLUMN "meet_date" DROP NOT NULL;
