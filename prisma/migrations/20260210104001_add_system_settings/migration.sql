-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL
);
