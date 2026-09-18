import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AoiResult } from "@/lib/gis/aoi";
import type { StudyAreaSource } from "@prisma/client";

/**
 * Prisma's `Unsupported("geometry(...)")` columns (see prisma/schema.prisma)
 * cannot be written or read through the normal Prisma Client API — Prisma
 * has no type for PostGIS geometry. Every study_areas read/write therefore
 * goes through this module using tagged-template `$queryRaw`/`$executeRaw`,
 * which is still fully parameterized (SQL-injection safe) despite being
 * "raw".
 */

export interface CreateStudyAreaInput {
  projectId: string;
  name?: string | null;
  sourceType: StudyAreaSource;
  sourceUrl?: string | null;
  placeName?: string | null;
  zoomLevel?: number | null;
  aoi: AoiResult;
}

export interface StudyAreaRecord {
  id: string;
  projectId: string;
  name: string | null;
  sourceType: StudyAreaSource;
  sourceUrl: string | null;
  placeName: string | null;
  zoomLevel: number | null;
  centerLat: number;
  centerLng: number;
  areaKm2: number;
  boundingBox: { minLng: number; minLat: number; maxLng: number; maxLat: number };
  geometryGeoJson: GeoJSON.Polygon;
  createdAt: Date;
}

export async function createStudyArea(input: CreateStudyAreaInput): Promise<StudyAreaRecord> {
  const id = randomUUID();
  const geometryGeoJson = JSON.stringify(input.aoi.geometry.geometry);
  const boundingBoxJson = JSON.stringify(input.aoi.boundingBox);

  await prisma.$executeRaw`
    INSERT INTO study_areas
      (id, "projectId", name, "sourceType", "sourceUrl", "placeName", "zoomLevel",
       "centerLat", "centerLng", "areaKm2", geometry, "boundingBox", "createdAt")
    VALUES
      (${id}, ${input.projectId}, ${input.name ?? null}, ${input.sourceType}::"StudyAreaSource",
       ${input.sourceUrl ?? null}, ${input.placeName ?? null}, ${input.zoomLevel ?? null},
       ${input.aoi.centerLat}, ${input.aoi.centerLng}, ${input.aoi.areaKm2},
       ST_SetSRID(ST_GeomFromGeoJSON(${geometryGeoJson}), 4326),
       ${boundingBoxJson}::jsonb, now())
  `;

  const created = await getStudyAreaById(id);
  if (!created) {
    // This would indicate a transaction/visibility problem, not bad input -
    // surfacing it loudly is safer than silently returning a partial object.
    throw new Error(`Study area ${id} was inserted but could not be read back`);
  }
  return created;
}

export async function getStudyAreaById(id: string): Promise<StudyAreaRecord | null> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      projectId: string;
      name: string | null;
      sourceType: StudyAreaSource;
      sourceUrl: string | null;
      placeName: string | null;
      zoomLevel: number | null;
      centerLat: number;
      centerLng: number;
      areaKm2: number;
      boundingBox: Prisma.JsonValue;
      geometryGeoJson: string;
      createdAt: Date;
    }>
  >`
    SELECT id, "projectId", name, "sourceType", "sourceUrl", "placeName", "zoomLevel",
           "centerLat", "centerLng", "areaKm2", "boundingBox",
           ST_AsGeoJSON(geometry) AS "geometryGeoJson", "createdAt"
    FROM study_areas
    WHERE id = ${id}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    ...row,
    boundingBox: row.boundingBox as StudyAreaRecord["boundingBox"],
    geometryGeoJson: JSON.parse(row.geometryGeoJson) as GeoJSON.Polygon
  };
}

export async function listStudyAreasForProject(projectId: string): Promise<StudyAreaRecord[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      projectId: string;
      name: string | null;
      sourceType: StudyAreaSource;
      sourceUrl: string | null;
      placeName: string | null;
      zoomLevel: number | null;
      centerLat: number;
      centerLng: number;
      areaKm2: number;
      boundingBox: Prisma.JsonValue;
      geometryGeoJson: string;
      createdAt: Date;
    }>
  >`
    SELECT id, "projectId", name, "sourceType", "sourceUrl", "placeName", "zoomLevel",
           "centerLat", "centerLng", "areaKm2", "boundingBox",
           ST_AsGeoJSON(geometry) AS "geometryGeoJson", "createdAt"
    FROM study_areas
    WHERE "projectId" = ${projectId}
    ORDER BY "createdAt" DESC
  `;

  return rows.map((row) => ({
    ...row,
    boundingBox: row.boundingBox as StudyAreaRecord["boundingBox"],
    geometryGeoJson: JSON.parse(row.geometryGeoJson) as GeoJSON.Polygon
  }));
}
