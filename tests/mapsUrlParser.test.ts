import { describe, expect, it } from "vitest";
import { parseGoogleMapsUrl } from "../src/lib/gis/mapsUrlParser";

// This exact matrix was run offline against a dependency-free JS mirror of
// this module during development (tests/_manual_verify_parser.mjs) because
// the sandbox that wrote this code has no network access to `npm install`
// vitest. Re-run `npm test` in your environment to confirm the TS module
// (imported here directly) behaves identically.

describe("parseGoogleMapsUrl", () => {
  it("prefers the precise !3d!4d pin over the @lat,lng map center", () => {
    const result = parseGoogleMapsUrl(
      "https://www.google.com/maps/place/Umm+Al+Quwain/@25.5559,55.5552,15z/data=!4m6!3m5!1s0x0:0x0!8m2!3d25.565!4d55.5501"
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("place_pin_3d4d");
      expect(result.lat).toBeCloseTo(25.565);
      expect(result.lng).toBeCloseTo(55.5501);
      expect(result.precise).toBe(true);
      expect(result.zoom).toBe(15);
    }
  });

  it("falls back to the @lat,lng,zoom component when there is no pin", () => {
    const result = parseGoogleMapsUrl("https://www.google.com/maps/@25.276987,55.296249,12z");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("at_component");
      expect(result.precise).toBe(false);
      expect(result.zoom).toBe(12);
    }
  });

  it("parses ?q=lat,lng", () => {
    const result = parseGoogleMapsUrl("https://www.google.com/maps?q=25.276987,55.296249");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.source).toBe("query_param");
  });

  it("parses legacy ?ll=lat,lng", () => {
    const result = parseGoogleMapsUrl("https://maps.google.com/maps?ll=25.276987,55.296249&z=10");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.source).toBe("ll_param");
  });

  it("accepts bare pasted coordinates", () => {
    const result = parseGoogleMapsUrl("25.276987, 55.296249");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.source).toBe("bare_coordinates");
  });

  it("refuses to guess at short links instead of fabricating a location", () => {
    const result = parseGoogleMapsUrl("https://maps.app.goo.gl/AbCdEfGh123");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("short_link_requires_server_side_resolution");
  });

  it("refuses legacy goo.gl/maps short links the same way", () => {
    const result = parseGoogleMapsUrl("https://goo.gl/maps/AbCdEfGh123");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("short_link_requires_server_side_resolution");
  });

  it("rejects non-Google hosts", () => {
    const result = parseGoogleMapsUrl("https://example.com/not-maps");
    expect(result.ok).toBe(false);
  });

  it("rejects a search URL with no coordinates rather than guessing", () => {
    const result = parseGoogleMapsUrl("https://www.google.com/maps/search/gold+mine+near+me");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no_coordinates_found_in_url");
  });

  it("rejects out-of-range bare coordinates", () => {
    const result = parseGoogleMapsUrl("195.0, 999.0");
    expect(result.ok).toBe(false);
  });

  it("extracts and URL-decodes an Arabic place name", () => {
    const result = parseGoogleMapsUrl(
      "https://www.google.com/maps/place/%D8%AD%D8%B5%D8%A7%D9%8A/@18.35,35.9,10z"
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.placeName).toBe("حصاي");
  });
});
