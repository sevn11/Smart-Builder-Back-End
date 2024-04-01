-- AlterTable
ALTER TABLE "users" ADD COLUMN     "invitation_token" TEXT,
ALTER COLUMN "hash" DROP NOT NULL;
