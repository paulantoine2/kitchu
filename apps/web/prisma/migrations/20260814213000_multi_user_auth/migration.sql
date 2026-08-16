-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- Preserve the single-user data until the configured administrator signs in.
CREATE TABLE "LegacyCartItem" (
    "recipeId" TEXT NOT NULL,
    "portions" INTEGER NOT NULL,
    CONSTRAINT "LegacyCartItem_pkey" PRIMARY KEY ("recipeId")
);

INSERT INTO "LegacyCartItem" ("recipeId", "portions")
SELECT "recipeId", "portions" FROM "CartItem";

CREATE TABLE "LegacyProductStock" (
    "productReferenceId" TEXT NOT NULL,
    "stockQuantity" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "LegacyProductStock_pkey" PRIMARY KEY ("productReferenceId")
);

INSERT INTO "LegacyProductStock" ("productReferenceId", "stockQuantity")
SELECT "id", "stockQuantity"
FROM "ProductReference"
WHERE "stockQuantity" IS NOT NULL;

-- Replace the global cart with user-owned carts.
DROP TABLE "CartItem";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "legacyDataClaimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "portions" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserProductState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productReferenceId" TEXT NOT NULL,
    "stockQuantity" DOUBLE PRECISION,
    "priceOverride" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserProductState_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ProductReference" DROP COLUMN "stockQuantity",
ADD COLUMN "ownerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");
CREATE UNIQUE INDEX "CartItem_userId_recipeId_key" ON "CartItem"("userId", "recipeId");
CREATE INDEX "CartItem_recipeId_idx" ON "CartItem"("recipeId");
CREATE UNIQUE INDEX "UserProductState_userId_productReferenceId_key" ON "UserProductState"("userId", "productReferenceId");
CREATE INDEX "UserProductState_productReferenceId_idx" ON "UserProductState"("productReferenceId");
CREATE INDEX "ProductReference_ingredientId_ownerId_idx" ON "ProductReference"("ingredientId", "ownerId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReference" ADD CONSTRAINT "ProductReference_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserProductState" ADD CONSTRAINT "UserProductState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserProductState" ADD CONSTRAINT "UserProductState_productReferenceId_fkey" FOREIGN KEY ("productReferenceId") REFERENCES "ProductReference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
