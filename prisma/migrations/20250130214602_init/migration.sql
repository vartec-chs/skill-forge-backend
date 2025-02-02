/*
  Warnings:

  - You are about to drop the column `expires` on the `refresh_tokens` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ConfirmCodeType" AS ENUM ('MAIL', 'PHONE', 'RESET_PASSWORD', 'RESET_PHONE', 'RESET_EMAIL');

-- AlterTable
ALTER TABLE "refresh_tokens" DROP COLUMN "expires",
ADD COLUMN     "expires_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "confirm_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "ConfirmCodeType" NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "confirm_codes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "confirm_codes" ADD CONSTRAINT "confirm_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
