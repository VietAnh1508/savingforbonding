-- CreateTable
CREATE TABLE "BeerAmountSpin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BeerAmountSpin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BeerAmountSpin_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GameSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "championMaxStarMultiplier" INTEGER NOT NULL DEFAULT 4,
    "topScorerMaxStarMultiplier" INTEGER NOT NULL DEFAULT 4,
    "beerAmountSpinEnabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "GameSettings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GameSettings" ("championMaxStarMultiplier", "id", "topScorerMaxStarMultiplier", "tournamentId") SELECT "championMaxStarMultiplier", "id", "topScorerMaxStarMultiplier", "tournamentId" FROM "GameSettings";
DROP TABLE "GameSettings";
ALTER TABLE "new_GameSettings" RENAME TO "GameSettings";
CREATE UNIQUE INDEX "GameSettings_tournamentId_key" ON "GameSettings"("tournamentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BeerAmountSpin_tournamentId_idx" ON "BeerAmountSpin"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "BeerAmountSpin_userId_tournamentId_key" ON "BeerAmountSpin"("userId", "tournamentId");
