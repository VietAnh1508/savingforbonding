/*
  Warnings:

  - The primary key for the `GameSettings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `tournament` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `seasonId` on the `Stage` table. All the data in the column will be lost.
  - Made the column `tournamentId` on table `ChampionCandidate` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tournamentId` on table `ChampionVote` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tournamentId` on table `GameSettings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tournamentId` on table `Match` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tournamentId` on table `Stage` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tournamentId` on table `TopScorerCandidate` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tournamentId` on table `TopScorerVote` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChampionCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fifaTeamId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "eliminatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChampionCandidate_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChampionCandidate" ("countryCode", "createdAt", "eliminatedAt", "fifaTeamId", "id", "teamName", "tournamentId", "updatedAt") SELECT "countryCode", "createdAt", "eliminatedAt", "fifaTeamId", "id", "teamName", "tournamentId", "updatedAt" FROM "ChampionCandidate";
DROP TABLE "ChampionCandidate";
ALTER TABLE "new_ChampionCandidate" RENAME TO "ChampionCandidate";
CREATE INDEX "ChampionCandidate_tournamentId_idx" ON "ChampionCandidate"("tournamentId");
CREATE UNIQUE INDEX "ChampionCandidate_fifaTeamId_tournamentId_key" ON "ChampionCandidate"("fifaTeamId", "tournamentId");
CREATE TABLE "new_ChampionVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "candidateId" TEXT,
    "isCorrect" BOOLEAN,
    "starMultiplier" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChampionVote_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChampionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChampionVote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ChampionCandidate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ChampionVote" ("candidateId", "createdAt", "id", "isCorrect", "points", "starMultiplier", "tournamentId", "updatedAt", "userId") SELECT "candidateId", "createdAt", "id", "isCorrect", "points", "starMultiplier", "tournamentId", "updatedAt", "userId" FROM "ChampionVote";
DROP TABLE "ChampionVote";
ALTER TABLE "new_ChampionVote" RENAME TO "ChampionVote";
CREATE INDEX "ChampionVote_candidateId_idx" ON "ChampionVote"("candidateId");
CREATE INDEX "ChampionVote_tournamentId_idx" ON "ChampionVote"("tournamentId");
CREATE UNIQUE INDEX "ChampionVote_userId_tournamentId_key" ON "ChampionVote"("userId", "tournamentId");
CREATE TABLE "new_GameSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "championMaxStarMultiplier" INTEGER NOT NULL DEFAULT 4,
    "topScorerMaxStarMultiplier" INTEGER NOT NULL DEFAULT 4,
    CONSTRAINT "GameSettings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GameSettings" ("championMaxStarMultiplier", "id", "topScorerMaxStarMultiplier", "tournamentId") SELECT "championMaxStarMultiplier", "id", "topScorerMaxStarMultiplier", "tournamentId" FROM "GameSettings";
DROP TABLE "GameSettings";
ALTER TABLE "new_GameSettings" RENAME TO "GameSettings";
CREATE UNIQUE INDEX "GameSettings_tournamentId_key" ON "GameSettings"("tournamentId");
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "tournamentId" TEXT NOT NULL,
    "homeCountry" TEXT NOT NULL,
    "awayCountry" TEXT NOT NULL,
    "kickoffAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "homePenaltyScore" INTEGER,
    "awayPenaltyScore" INTEGER,
    "result" TEXT,
    "homeRatio" REAL NOT NULL DEFAULT 0,
    "awayRatio" REAL NOT NULL DEFAULT 0,
    "stageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("awayCountry", "awayPenaltyScore", "awayRatio", "awayScore", "createdAt", "externalId", "homeCountry", "homePenaltyScore", "homeRatio", "homeScore", "id", "kickoffAt", "result", "stageId", "status", "tournamentId", "updatedAt") SELECT "awayCountry", "awayPenaltyScore", "awayRatio", "awayScore", "createdAt", "externalId", "homeCountry", "homePenaltyScore", "homeRatio", "homeScore", "id", "kickoffAt", "result", "stageId", "status", "tournamentId", "updatedAt" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE UNIQUE INDEX "Match_externalId_key" ON "Match"("externalId");
CREATE INDEX "Match_kickoffAt_idx" ON "Match"("kickoffAt");
CREATE INDEX "Match_status_idx" ON "Match"("status");
CREATE INDEX "Match_stageId_idx" ON "Match"("stageId");
CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");
CREATE TABLE "new_Stage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "sequenceOrder" INTEGER NOT NULL,
    "isKnockout" BOOLEAN NOT NULL DEFAULT false,
    "starsAllocated" INTEGER NOT NULL DEFAULT 0,
    "maxStarMultiplier" INTEGER NOT NULL DEFAULT 0,
    "allInEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tournamentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Stage_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Stage" ("allInEnabled", "createdAt", "endDate", "id", "isKnockout", "maxStarMultiplier", "name", "sequenceOrder", "starsAllocated", "startDate", "tournamentId", "updatedAt") SELECT "allInEnabled", "createdAt", "endDate", "id", "isKnockout", "maxStarMultiplier", "name", "sequenceOrder", "starsAllocated", "startDate", "tournamentId", "updatedAt" FROM "Stage";
DROP TABLE "Stage";
ALTER TABLE "new_Stage" RENAME TO "Stage";
CREATE INDEX "Stage_tournamentId_idx" ON "Stage"("tournamentId");
CREATE TABLE "new_TopScorerCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalPlayerId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "minutesPlayed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TopScorerCandidate_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TopScorerCandidate" ("assists", "countryName", "createdAt", "externalPlayerId", "goals", "id", "minutesPlayed", "playerName", "tournamentId", "updatedAt") SELECT "assists", "countryName", "createdAt", "externalPlayerId", "goals", "id", "minutesPlayed", "playerName", "tournamentId", "updatedAt" FROM "TopScorerCandidate";
DROP TABLE "TopScorerCandidate";
ALTER TABLE "new_TopScorerCandidate" RENAME TO "TopScorerCandidate";
CREATE INDEX "TopScorerCandidate_tournamentId_idx" ON "TopScorerCandidate"("tournamentId");
CREATE UNIQUE INDEX "TopScorerCandidate_externalPlayerId_tournamentId_key" ON "TopScorerCandidate"("externalPlayerId", "tournamentId");
CREATE TABLE "new_TopScorerVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "candidateId" TEXT,
    "isCorrect" BOOLEAN,
    "starMultiplier" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TopScorerVote_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TopScorerVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TopScorerVote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "TopScorerCandidate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TopScorerVote" ("candidateId", "createdAt", "id", "isCorrect", "points", "starMultiplier", "tournamentId", "updatedAt", "userId") SELECT "candidateId", "createdAt", "id", "isCorrect", "points", "starMultiplier", "tournamentId", "updatedAt", "userId" FROM "TopScorerVote";
DROP TABLE "TopScorerVote";
ALTER TABLE "new_TopScorerVote" RENAME TO "TopScorerVote";
CREATE INDEX "TopScorerVote_candidateId_idx" ON "TopScorerVote"("candidateId");
CREATE INDEX "TopScorerVote_tournamentId_idx" ON "TopScorerVote"("tournamentId");
CREATE UNIQUE INDEX "TopScorerVote_userId_tournamentId_key" ON "TopScorerVote"("userId", "tournamentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
