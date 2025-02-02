-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "fingerprint" TEXT,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
