import * as turf from "@turf/turf";
import type { Feature, Polygon } from "geojson";

/**
 * AOI (Area of Interest) generation.
 *
 * All geometry math is delegated to Turf.js (a mature, independently
 * tested geospatial library) rather than reimplemented here — the one
 * exception is the circle-radius-from-area formula, which is simple
 * enough to verify directly (see the inline comment) and is the only
 * piece of "real" math this module owns.
 *
 * Everything returned here is in WGS84 (EPSG:4326), matching the
 * `geometry` columns in prisma/schema.prisma.
 */

export const AOI_PRESET_AREAS_KM2 = [1, 5, 10, 25, 50] as const;
export type AoiPresetAreaKm2 = (typeof AOI_PRESET_AREAS_KM2)[number];

export interface AoiResult {
  geometry: Feature<Polygon>;
  areaKm2: number;
  centerLat: number;
  centerLng: number;
  boundingBox: { minLng: number; minLat: number; maxLng: number; maxLat: number };
}

function summarize(feature: Feature<Polygon>): AoiResult {
  const areaM2 = turf.area(feature);
  const [minLng, minLat, maxLng, maxLat] = turf.bbox(feature);
  const center = turf.centerOfMass(feature);
  const [centerLng, centerLat] = center.geometry.coordinates;

  return {
    geometry: feature,
    areaKm2: areaM2 / 1_000_000,
    centerLat,
    centerLng,
    boundingBox: { minLng, minLat, maxLng, maxLat }
  };
}

/**
 * A circle of the given area, centered on (lat, lng).
 *
 * radius = sqrt(area / π)  — the standard circle-area inverse (A = πr²).
 * Sanity check: a 1 km² circle has r ≈ 0.5642 km; a 50 km² circle has
 * r ≈ 3.989 km. Verified independently in tests/aoi.test.ts.
 */
export function buildCirclePresetAoi(
  centerLat: number,
  centerLng: number,
  areaKm2: number,
  steps = 64
): AoiResult {
  if (areaKm2 <= 0) {
    throw new Error("areaKm2 must be positive");
  }
  const radiusKm = Math.sqrt(areaKm2 / Math.PI);
  const circle = turf.circle([centerLng, centerLat], radiusKm, {
    steps,
    units: "kilometers"
  });
  return summarize(circle as Feature<Polygon>);
}

/** A freeform circle drawn by the user (center + arbitrary radius in meters). */
export function buildFreeformCircleAoi(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  steps = 64
): AoiResult {
  if (radiusMeters <= 0) {
    throw new Error("radiusMeters must be positive");
  }
  const circle = turf.circle([centerLng, centerLat], radiusMeters / 1000, {
    steps,
    units: "kilometers"
  });
  return summarize(circle as Feature<Polygon>);
}

/** A rectangle from two opposite corners, e.g. from a click-drag interaction. */
export function buildRectangleAoi(
  corner1: { lat: number; lng: number },
  corner2: { lat: number; lng: number }
): AoiResult {
  const minLat = Math.min(corner1.lat, corner2.lat);
  const maxLat = Math.max(corner1.lat, corner2.lat);
  const minLng = Math.min(corner1.lng, corner2.lng);
  const maxLng = Math.max(corner1.lng, corner2.lng);

  if (minLat === maxLat || minLng === maxLng) {
    throw new Error("Rectangle corners must not be identical or collinear");
  }

  const polygon = turf.bboxPolygon([minLng, minLat, maxLng, maxLat]);
  return summarize(polygon);
}

/**
 * A freeform polygon from an ordered list of {lat, lng} vertices, as drawn
 * with the polygon draw tool. Automatically closes the ring if the caller
 * did not repeat the first point at the end.
 */
export function buildPolygonAoi(points: Array<{ lat: number; lng: number }>): AoiResult {
  if (points.length < 3) {
    throw new Error("A polygon AOI needs at least 3 vertices");
  }
  const ring = points.map((p) => [p.lng, p.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first as [number, number]);
  }
  const polygon = turf.polygon([ring as Array<[number, number]>]);
  return summarize(polygon);
}

/** A single-point AOI (e.g. a raw click) — has no area on its own; pair it
 * with one of AOI_PRESET_AREAS_KM2 via buildCirclePresetAoi to get an AOI. */
export interface AoiPoint {
  lat: number;
  lng: number;
}
