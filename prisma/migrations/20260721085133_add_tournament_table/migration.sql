-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sportKind" TEXT NOT NULL DEFAULT 'football',
    "dataSourceKey" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChampionCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fifaTeamId" TEXT NOT NULL,
    "tournamentId" TEXT,
    "teamName" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "eliminatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChampionCandidate_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ChampionCandidate" ("countryCode", "createdAt", "eliminatedAt", "fifaTeamId", "id", "teamName", "updatedAt") SELECT "countryCode", "createdAt", "eliminatedAt", "fifaTeamId", "id", "teamName", "updatedAt" FROM "ChampionCandidate";
DROP TABLE "ChampionCandidate";
ALTER TABLE "new_ChampionCandidate" RENAME TO "ChampionCandidate";
CREATE UNIQUE INDEX "ChampionCandidate_fifaTeamId_key" ON "ChampionCandidate"("fifaTeamId");
CREATE INDEX "ChampionCandidate_tournamentId_idx" ON "ChampionCandidate"("tournamentId");
CREATE TABLE "new_ChampionVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT,
    "candidateId" TEXT,
    "isCorrect" BOOLEAN,
    "starMultiplier" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChampionVote_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChampionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChampionVote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ChampionCandidate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ChampionVote" ("candidateId", "createdAt", "id", "isCorrect", "points", "starMultiplier", "updatedAt", "userId") SELECT "candidateId", "createdAt", "id", "isCorrect", "points", "starMultiplier", "updatedAt", "userId" FROM "ChampionVote";
DROP TABLE "ChampionVote";
ALTER TABLE "new_ChampionVote" RENAME TO "ChampionVote";
CREATE UNIQUE INDEX "ChampionVote_userId_key" ON "ChampionVote"("userId");
CREATE INDEX "ChampionVote_candidateId_idx" ON "ChampionVote"("candidateId");
CREATE INDEX "ChampionVote_tournamentId_idx" ON "ChampionVote"("tournamentId");
CREATE TABLE "new_GameSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "tournamentId" TEXT,
    "championMaxStarMultiplier" INTEGER NOT NULL DEFAULT 4,
    "topScorerMaxStarMultiplier" INTEGER NOT NULL DEFAULT 4,
    CONSTRAINT "GameSettings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GameSettings" ("championMaxStarMultiplier", "id", "topScorerMaxStarMultiplier") SELECT "championMaxStarMultiplier", "id", "topScorerMaxStarMultiplier" FROM "GameSettings";
DROP TABLE "GameSettings";
ALTER TABLE "new_GameSettings" RENAME TO "GameSettings";
CREATE UNIQUE INDEX "GameSettings_tournamentId_key" ON "GameSettings"("tournamentId");
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "tournament" TEXT NOT NULL DEFAULT 'FIFA World Cup',
    "tournamentId" TEXT,
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
    CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("awayCountry", "awayPenaltyScore", "awayRatio", "awayScore", "createdAt", "externalId", "homeCountry", "homePenaltyScore", "homeRatio", "homeScore", "id", "kickoffAt", "result", "stageId", "status", "tournament", "updatedAt") SELECT "awayCountry", "awayPenaltyScore", "awayRatio", "awayScore", "createdAt", "externalId", "homeCountry", "homePenaltyScore", "homeRatio", "homeScore", "id", "kickoffAt", "result", "stageId", "status", "tournament", "updatedAt" FROM "Match";
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
    "seasonId" TEXT NOT NULL,
    "isKnockout" BOOLEAN NOT NULL DEFAULT false,
    "starsAllocated" INTEGER NOT NULL DEFAULT 0,
    "maxStarMultiplier" INTEGER NOT NULL DEFAULT 0,
    "allInEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tournamentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Stage_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Stage" ("allInEnabled", "createdAt", "endDate", "id", "isKnockout", "maxStarMultiplier", "name", "seasonId", "sequenceOrder", "starsAllocated", "startDate", "updatedAt") SELECT "allInEnabled", "createdAt", "endDate", "id", "isKnockout", "maxStarMultiplier", "name", "seasonId", "sequenceOrder", "starsAllocated", "startDate", "updatedAt" FROM "Stage";
DROP TABLE "Stage";
ALTER TABLE "new_Stage" RENAME TO "Stage";
CREATE INDEX "Stage_tournamentId_idx" ON "Stage"("tournamentId");
CREATE TABLE "new_TopScorerCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalPlayerId" TEXT NOT NULL,
    "tournamentId" TEXT,
    "playerName" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "minutesPlayed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TopScorerCandidate_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TopScorerCandidate" ("assists", "countryName", "createdAt", "externalPlayerId", "goals", "id", "minutesPlayed", "playerName", "updatedAt") SELECT "assists", "countryName", "createdAt", "externalPlayerId", "goals", "id", "minutesPlayed", "playerName", "updatedAt" FROM "TopScorerCandidate";
DROP TABLE "TopScorerCandidate";
ALTER TABLE "new_TopScorerCandidate" RENAME TO "TopScorerCandidate";
CREATE UNIQUE INDEX "TopScorerCandidate_externalPlayerId_key" ON "TopScorerCandidate"("externalPlayerId");
CREATE INDEX "TopScorerCandidate_tournamentId_idx" ON "TopScorerCandidate"("tournamentId");
CREATE TABLE "new_TopScorerVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT,
    "candidateId" TEXT,
    "isCorrect" BOOLEAN,
    "starMultiplier" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TopScorerVote_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TopScorerVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TopScorerVote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "TopScorerCandidate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TopScorerVote" ("candidateId", "createdAt", "id", "isCorrect", "points", "starMultiplier", "updatedAt", "userId") SELECT "candidateId", "createdAt", "id", "isCorrect", "points", "starMultiplier", "updatedAt", "userId" FROM "TopScorerVote";
DROP TABLE "TopScorerVote";
ALTER TABLE "new_TopScorerVote" RENAME TO "TopScorerVote";
CREATE UNIQUE INDEX "TopScorerVote_userId_key" ON "TopScorerVote"("userId");
CREATE INDEX "TopScorerVote_candidateId_idx" ON "TopScorerVote"("candidateId");
CREATE INDEX "TopScorerVote_tournamentId_idx" ON "TopScorerVote"("tournamentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");

-- Backfill: single tournament row representing the app's only tournament to date.
-- status is 'ACTIVE' (not 'COMPLETED') because getActiveTournamentId() looks up
-- the tournament by status = ACTIVE — this is "which tournament is the current
-- context", not "did the matches finish". startDate/endDate prefer the real
-- Stage min/max, falling back to the actual known 2026 World Cup dates only
-- when Stage is empty — required so `prisma migrate dev`'s shadow database
-- (which replays this migration against an empty database with no Stage rows)
-- can validate it; real deploys against dev/prod Turso (which do have Stage
-- data) always take the real min/max branch.
INSERT INTO "Tournament" ("id", "slug", "name", "sportKind", "dataSourceKey", "startDate", "endDate", "status", "createdAt", "updatedAt")
VALUES (
    'fifa-world-cup-2026',
    'fifa-world-cup-2026',
    'FIFA World Cup 2026',
    'football',
    'fifa-world-cup',
    COALESCE((SELECT MIN("startDate") FROM "Stage"), '2026-06-11 00:00:00'),
    COALESCE((SELECT MAX("endDate") FROM "Stage"), '2026-07-19 00:00:00'),
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Backfill: point every existing row at the single tournament above.
UPDATE "Stage" SET "tournamentId" = 'fifa-world-cup-2026';
UPDATE "Match" SET "tournamentId" = 'fifa-world-cup-2026';
UPDATE "GameSettings" SET "tournamentId" = 'fifa-world-cup-2026';
UPDATE "ChampionCandidate" SET "tournamentId" = 'fifa-world-cup-2026';
UPDATE "TopScorerCandidate" SET "tournamentId" = 'fifa-world-cup-2026';
UPDATE "ChampionVote" SET "tournamentId" = 'fifa-world-cup-2026';
UPDATE "TopScorerVote" SET "tournamentId" = 'fifa-world-cup-2026';
