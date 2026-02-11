/*
  Warnings:

  - You are about to drop the column `schema` on the `exposed_urls` table. All the data in the column will be lost.
  - You are about to drop the column `targetHost` on the `exposed_urls` table. All the data in the column will be lost.
  - You are about to drop the column `targetPort` on the `exposed_urls` table. All the data in the column will be lost.
  - Made the column `serviceId` on table `exposed_urls` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_exposed_urls" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subdomain" TEXT NOT NULL,
    "domainSuffix" TEXT NOT NULL,
    "fullUrl" TEXT NOT NULL,
    "internalPort" INTEGER NOT NULL,
    "tunnelId" TEXT,
    "dnsRecordId" TEXT,
    "serviceId" TEXT NOT NULL,
    CONSTRAINT "exposed_urls_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_exposed_urls" ("dnsRecordId", "domainSuffix", "fullUrl", "id", "internalPort", "serviceId", "subdomain", "tunnelId") SELECT "dnsRecordId", "domainSuffix", "fullUrl", "id", "internalPort", "serviceId", "subdomain", "tunnelId" FROM "exposed_urls";
DROP TABLE "exposed_urls";
ALTER TABLE "new_exposed_urls" RENAME TO "exposed_urls";
CREATE TABLE "new_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'STANDARD',
    "composeContent" TEXT,
    "envContent" TEXT,
    "gitRepoUrl" TEXT,
    "gitBranch" TEXT,
    "gitComposePath" TEXT DEFAULT 'docker-compose.yml',
    "gitAuthId" TEXT,
    CONSTRAINT "projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_projects" ("createdAt", "description", "id", "name", "ownerId", "updatedAt") SELECT "createdAt", "description", "id", "name", "ownerId", "updatedAt" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
CREATE TABLE "new_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'STOPPED',
    "containerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sourceType" TEXT NOT NULL,
    "imageName" TEXT,
    "gitRepoUrl" TEXT,
    "gitBranch" TEXT,
    "gitCommitSha" TEXT,
    "gitDockerfilePath" TEXT DEFAULT 'Dockerfile',
    "gitContextPath" TEXT DEFAULT '.',
    "dockerfileUser" BOOLEAN NOT NULL DEFAULT true,
    "composePath" TEXT,
    "isComposeService" BOOLEAN NOT NULL DEFAULT false,
    "webhookSecret" TEXT,
    "githubWebhookId" INTEGER,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "services_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_services" ("composePath", "containerId", "createdAt", "description", "dockerfileUser", "gitBranch", "gitCommitSha", "gitRepoUrl", "githubWebhookId", "id", "imageName", "name", "projectId", "sourceType", "status", "updatedAt", "webhookSecret") SELECT "composePath", "containerId", "createdAt", "description", "dockerfileUser", "gitBranch", "gitCommitSha", "gitRepoUrl", "githubWebhookId", "id", "imageName", "name", "projectId", "sourceType", "status", "updatedAt", "webhookSecret" FROM "services";
DROP TABLE "services";
ALTER TABLE "new_services" RENAME TO "services";
CREATE UNIQUE INDEX "services_projectId_name_key" ON "services"("projectId", "name");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxProjects" INTEGER NOT NULL DEFAULT 5,
    "maxRamUsage" INTEGER NOT NULL DEFAULT 2048,
    "canExpose" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("avatarUrl", "canExpose", "createdAt", "email", "id", "maxProjects", "maxRamUsage", "name", "passwordHash", "role") SELECT "avatarUrl", "canExpose", "createdAt", "email", "id", "maxProjects", "maxRamUsage", "name", "passwordHash", "role" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");
