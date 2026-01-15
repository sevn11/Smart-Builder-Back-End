-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SignerStatus" AS ENUM ('PENDING', 'SIGNED');

-- CreateEnum
CREATE TYPE "SignatureType" AS ENUM ('TYPED', 'DRAWN');

-- AlterTable
ALTER TABLE "client_template_question" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "sign_here" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "originalPdf" TEXT NOT NULL,
    "signedPdf" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "ccAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sign_here_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signers" (
    "id" TEXT NOT NULL,
    "signerType" "SignatureType" NOT NULL,
    "documentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "approved_date" TIMESTAMP(3) NOT NULL,
    "signed_date" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "status" "SignerStatus" NOT NULL DEFAULT 'PENDING',
    "signedAt" TIMESTAMP(3),
    "signImage" TEXT[],
    "type" "SignatureType" NOT NULL,
    "typedName" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "signers_token_key" ON "signers"("token");

-- AddForeignKey
ALTER TABLE "signers" ADD CONSTRAINT "signers_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "sign_here"("id") ON DELETE CASCADE ON UPDATE CASCADE;
