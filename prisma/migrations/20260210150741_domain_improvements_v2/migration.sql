-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_exposed_urls" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subdomain" TEXT NOT NULL,
    "domainSuffix" TEXT NOT NULL,
    "fullUrl" TEXT NOT NULL,
    "internalPort" INTEGER NOT NULL,
    "targetHost" TEXT,
    "targetPort" INTEGER,
    "schema" TEXT NOT NULL DEFAULT 'http',
    "tunnelId" TEXT,
    "dnsRecordId" TEXT,
    "serviceId" TEXT,
    CONSTRAINT "exposed_urls_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_exposed_urls" ("dnsRecordId", "domainSuffix", "fullUrl", "id", "internalPort", "serviceId", "subdomain", "tunnelId") SELECT "dnsRecordId", "domainSuffix", "fullUrl", "id", "internalPort", "serviceId", "subdomain", "tunnelId" FROM "exposed_urls";
DROP TABLE "exposed_urls";
ALTER TABLE "new_exposed_urls" RENAME TO "exposed_urls";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
