-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_confirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone_confirmed" BOOLEAN NOT NULL DEFAULT false;
