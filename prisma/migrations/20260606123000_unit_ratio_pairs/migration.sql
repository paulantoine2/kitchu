CREATE TABLE "UnitRatio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromUnitId" TEXT NOT NULL,
    "toUnitId" TEXT NOT NULL,
    "factor" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnitRatio_fromUnitId_fkey" FOREIGN KEY ("fromUnitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnitRatio_toUnitId_fkey" FOREIGN KEY ("toUnitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UnitRatio_fromUnitId_toUnitId_key" ON "UnitRatio"("fromUnitId", "toUnitId");

INSERT INTO "UnitRatio" ("id", "fromUnitId", "toUnitId", "factor", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))),
       "id",
       "globalBaseUnitId",
       "globalToBaseFactor",
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "Unit"
WHERE "globalBaseUnitId" IS NOT NULL
  AND "globalToBaseFactor" IS NOT NULL
  AND "globalToBaseFactor" > 0;
