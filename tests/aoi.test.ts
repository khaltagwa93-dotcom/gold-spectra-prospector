import { describe, expect, it } from "vitest";
import {
  AOI_PRESET_AREAS_KM2,
  buildCirclePresetAoi,
  buildRectangleAoi,
  buildPolygonAoi
} from "../src/lib/gis/aoi";

describe("buildCirclePresetAoi", () => {
  it.each(AOI_PRESET_AREAS_KM2)("produces a circle whose measured area matches the %d km² preset", (areaKm2) => {
    const result = buildCirclePresetAoi(25.276987, 55.296249, areaKm2);
    // Turf approximates a circle with a 64-sided polygon, and area is
    // computed on the ellipsoid, not the plane — allow a small tolerance.
    expect(result.areaKm2).toBeGreaterThan(areaKm2 * 0.97);
    expect(result.areaKm2).toBeLessThan(areaKm2 * 1.03);
  });

  it("centers the circle on the requested coordinates", () => {
    const result = buildCirclePresetAoi(25.276987, 55.296249, 10);
    expect(result.centerLat).toBeCloseTo(25.276987, 2);
    expect(result.centerLng).toBeCloseTo(55.296249, 2);
  });

  it("rejects a non-positive area instead of silently producing a degenerate shape", () => {
    expect(() => buildCirclePresetAoi(25, 55, 0)).toThrow();
    expect(() => buildCirclePresetAoi(25, 55, -5)).toThrow();
  });
});

describe("buildRectangleAoi", () => {
  it("builds a rectangle from two opposite corners regardless of order", () => {
    const a = buildRectangleAoi({ lat: 25.0, lng: 55.0 }, { lat: 25.1, lng: 55.1 });
    const b = buildRectangleAoi({ lat: 25.1, lng: 55.1 }, { lat: 25.0, lng: 55.0 });
    expect(a.boundingBox).toEqual(b.boundingBox);
  });

  it("rejects identical corners", () => {
    expect(() => buildRectangleAoi({ lat: 25, lng: 55 }, { lat: 25, lng: 55 })).toThrow();
  });
});

describe("buildPolygonAoi", () => {
  it("closes an open ring automatically", () => {
    const result = buildPolygonAoi([
      { lat: 25.0, lng: 55.0 },
      { lat: 25.1, lng: 55.0 },
      { lat: 25.1, lng: 55.1 },
      { lat: 25.0, lng: 55.1 }
    ]);
    expect(result.areaKm2).toBeGreaterThan(0);
  });

  it("rejects fewer than 3 vertices", () => {
    expect(() =>
      buildPolygonAoi([
        { lat: 25.0, lng: 55.0 },
        { lat: 25.1, lng: 55.1 }
      ])
    ).toThrow();
  });
});
