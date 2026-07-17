/*
  Warnings:

  - You are about to drop the column `weeklyPoints` on the `User` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nameUpdatedAt" DATETIME,
    "termsAcceptedAt" DATETIME,
    "termsAcceptedVersion" INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "id", "image", "mustChangePassword", "name", "nameUpdatedAt", "passwordHash", "termsAcceptedAt", "termsAcceptedVersion", "totalPoints") SELECT "createdAt", "email", "emailVerified", "id", "image", "mustChangePassword", "name", "nameUpdatedAt", "passwordHash", "termsAcceptedAt", "termsAcceptedVersion", "totalPoints" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
