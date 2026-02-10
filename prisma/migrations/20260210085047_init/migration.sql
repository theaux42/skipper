-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxProjects" INTEGER NOT NULL DEFAULT 5,
    "maxRamUsage" INTEGER NOT NULL DEFAULT 2048,
    "canExpose" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "services" (
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
    "dockerfileUser" BOOLEAN NOT NULL DEFAULT true,
    "composePath" TEXT,
    "webhookSecret" TEXT,
    "githubWebhookId" INTEGER,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "services_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "exposed_urls" (
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

-- CreateTable
CREATE TABLE "env_variables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    CONSTRAINT "env_variables_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "volumes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hostPath" TEXT NOT NULL,
    "mountPath" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    CONSTRAINT "volumes_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "services_projectId_name_key" ON "services"("projectId", "name");
