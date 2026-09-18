-- Run this ONCE against the target database, BEFORE `npx prisma migrate dev`.
-- Prisma's Unsupported("geometry(...)") columns need the PostGIS extension
-- to already exist, or the CREATE TABLE statements Prisma generates will fail.

CREATE EXTENSION IF NOT EXISTS postgis;
