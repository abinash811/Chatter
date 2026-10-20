-- AlterTable
ALTER TABLE "widgets" ADD COLUMN "apiUrl" TEXT,
ADD COLUMN "apiMethod" TEXT,
ADD COLUMN "headersEncrypted" TEXT,
ADD COLUMN "writeCapable" BOOLEAN NOT NULL DEFAULT false;
