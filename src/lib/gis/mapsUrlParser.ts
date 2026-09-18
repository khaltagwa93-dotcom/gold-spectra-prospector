/**
 * Google Maps URL parser.
 *
 * Extracts a location from a Google Maps URL. This module NEVER invents
 * coordinates: if a URL cannot be confidently parsed, it returns
 * `{ ok: false }` and the caller must fall back to manual AOI selection
 * (see src/components/MapExplorer.tsx and ARCHITECTURE.md §3).
 *
 * Supported forms (see tests/mapsUrlParser.test.ts for the full matrix):
 *   - https://www.google.com/maps/place/<name>/@<lat>,<lng>,<zoom>z/...!3d<lat>!4d<lng>
 *   - https://www.google.com/maps/@<lat>,<lng>,<zoom>z
 *   - https://www.google.com/maps?q=<lat>,<lng>
 *   - https://www.google.com/maps?ll=<lat>,<lng>&z=<zoom>   (legacy)
 *   - https://maps.google.com/?q=<lat>,<lng>
 *   - Bare "<lat>,<lng>" pasted text (convenience fallback)
 *
 * Short links (https://maps.app.goo.gl/xxxx, https://goo.gl/maps/xxxx) are
 * NOT resolved by this module — they carry no coordinates in the URL
 * itself and require following an HTTP redirect. That network call lives
 * in src/lib/gis/resolveShortLink.ts (server-side only) and is applied
 * BEFORE calling this parser. This module is pure and dependency-free so
 * it can be unit-tested without any network or database access.
 */

export interface ParsedMapsLocation {
  ok: true;
  lat: number;
  lng: number;
  /** True when the coordinate came from the precise !3d/!4d pin rather than
   * the coarser @lat,lng map-center component. */
  precise: boolean;
  zoom: number | null;
  placeName: string | null;
  source:
    | "place_pin_3d4d"
    | "at_component"
    | "query_param"
    | "ll_param"
    | "bare_coordinates";
}

export interface UnparsedMapsLocation {
  ok: false;
  reason: string;
}

export type MapsParseResult = ParsedMapsLocation | UnparsedMapsLocation;

const LAT_RANGE: [number, number] = [-90, 90];
const LNG_RANGE: [number, number] = [-180, 180];

function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= LAT_RANGE[0] &&
    lat <= LAT_RANGE[1] &&
    lng >= LNG_RANGE[0] &&
    lng <= LNG_RANGE[1]
  );
}

function extractPlaceName(url: string): string | null {
  const match = url.match(/\/maps\/place\/([^/@]+)/i);
  if (!match || !match[1]) return null;
  try {
    const decoded = decodeURIComponent(match[1].replace(/\+/g, " "));
    return decoded.trim() || null;
  } catch {
    return match[1].replace(/\+/g, " ").trim() || null;
  }
}

function extractZoom(url: string): number | null {
  // Zoom appears as the third @lat,lng,ZOOMz component.
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+(?:\.\d+)?)z/i);
  if (!match || !match[3]) return null;
  const zoom = Number(match[3]);
  return Number.isFinite(zoom) ? zoom : null;
}

/**
 * Parses a single Google Maps URL (already a full, non-shortened URL) or a
 * bare "lat,lng" string. Priority order, most precise first:
 *   1. !3d<lat>!4d<lng>   — the actual pinned place (place_pin_3d4d)
 *   2. @<lat>,<lng>       — the map viewport center (at_component)
 *   3. ?q=<lat>,<lng>     — query parameter (query_param)
 *   4. ?ll=<lat>,<lng>    — legacy query parameter (ll_param)
 *   5. bare "<lat>,<lng>" text (bare_coordinates)
 */
export function parseGoogleMapsUrl(input: string): MapsParseResult {
  const raw = (input ?? "").trim();
  if (!raw) {
    return { ok: false, reason: "empty_input" };
  }

  // 5. Bare coordinate pair pasted directly, e.g. "25.276987, 55.296249"
  const bareMatch = raw.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (bareMatch && bareMatch[1] && bareMatch[2]) {
    const lat = Number(bareMatch[1]);
    const lng = Number(bareMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return {
        ok: true,
        lat,
        lng,
        precise: true,
        zoom: null,
        placeName: null,
        source: "bare_coordinates"
      };
    }
    return { ok: false, reason: "bare_coordinates_out_of_range" };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "not_a_valid_url" };
  }

  const host = url.hostname.toLowerCase();

  const isShortLinkHost =
    host === "maps.app.goo.gl" || host === "goo.gl";
  if (isShortLinkHost) {
    return {
      ok: false,
      reason: "short_link_requires_server_side_resolution"
    };
  }

  const isGoogleMapsHost =
    host === "maps.google.com" ||
    host === "www.google.com" ||
    host === "google.com" ||
    host.endsWith(".google.com");

  if (!isGoogleMapsHost) {
    return { ok: false, reason: "not_a_google_maps_host" };
  }

  const placeName = extractPlaceName(raw);
  const zoom = extractZoom(raw);

  // 1. Precise pin: !3d<lat>!4d<lng>
  const pinMatch = raw.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pinMatch && pinMatch[1] && pinMatch[2]) {
    const lat = Number(pinMatch[1]);
    const lng = Number(pinMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return {
        ok: true,
        lat,
        lng,
        precise: true,
        zoom,
        placeName,
        source: "place_pin_3d4d"
      };
    }
  }

  // 2. Map-center @lat,lng
  const atMatch = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch && atMatch[1] && atMatch[2]) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return {
        ok: true,
        lat,
        lng,
        precise: false,
        zoom,
        placeName,
        source: "at_component"
      };
    }
  }

  // 3. ?q=lat,lng  (only when q looks like coordinates, not a text search)
  const q = url.searchParams.get("q");
  if (q) {
    const qMatch = q.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (qMatch && qMatch[1] && qMatch[2]) {
      const lat = Number(qMatch[1]);
      const lng = Number(qMatch[2]);
      if (isValidCoordinate(lat, lng)) {
        return {
          ok: true,
          lat,
          lng,
          precise: true,
          zoom,
          placeName,
          source: "query_param"
        };
      }
    }
  }

  // 4. ?ll=lat,lng (legacy)
  const ll = url.searchParams.get("ll");
  if (ll) {
    const llMatch = ll.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (llMatch && llMatch[1] && llMatch[2]) {
      const lat = Number(llMatch[1]);
      const lng = Number(llMatch[2]);
      if (isValidCoordinate(lat, lng)) {
        return {
          ok: true,
          lat,
          lng,
          precise: false,
          zoom,
          placeName,
          source: "ll_param"
        };
      }
    }
  }

  return { ok: false, reason: "no_coordinates_found_in_url" };
}
