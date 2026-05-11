-- CreateTable
CREATE TABLE "ScoutEmail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "expectedSalary" TEXT,
    "salaryClass" TEXT NOT NULL DEFAULT 'unknown',
    "jobDescription" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "isMatch" BOOLEAN NOT NULL DEFAULT false,
    "rawSubject" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "gmailThreadId" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "historyId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ScoutEmail_gmailMessageId_key" ON "ScoutEmail"("gmailMessageId");
