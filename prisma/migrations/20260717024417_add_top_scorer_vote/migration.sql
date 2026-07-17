-- CreateTable
CREATE TABLE "TopScorerCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalPlayerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "minutesPlayed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TopScorerVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "candidateId" TEXT,
    "isCorrect" BOOLEAN,
    "starMultiplier" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TopScorerVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TopScorerVote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "TopScorerCandidate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GameSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "championMaxStarMultiplier" INTEGER NOT NULL DEFAULT 4,
    "topScorerMaxStarMultiplier" INTEGER NOT NULL DEFAULT 4
);
INSERT INTO "new_GameSettings" ("championMaxStarMultiplier", "id") SELECT "championMaxStarMultiplier", "id" FROM "GameSettings";
DROP TABLE "GameSettings";
ALTER TABLE "new_GameSettings" RENAME TO "GameSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TopScorerCandidate_externalPlayerId_key" ON "TopScorerCandidate"("externalPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "TopScorerVote_userId_key" ON "TopScorerVote"("userId");

-- CreateIndex
CREATE INDEX "TopScorerVote_candidateId_idx" ON "TopScorerVote"("candidateId");
