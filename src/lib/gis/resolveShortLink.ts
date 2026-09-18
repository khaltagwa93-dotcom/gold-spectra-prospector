/**
 * Resolves a shortened Google Maps link (maps.app.goo.gl, goo.gl/maps) to
 * its full URL by following the HTTP redirect Google's server returns.
 *
 * This requires outbound network access and therefore only runs server-side
 * (an API route or server action) — never in the browser, and it cannot be
 * exercised inside an offline dev sandbox. Test it against real short links
 * once deployed; see ARCHITECTURE.md "Known limitations".
 *
 * On any failure this throws rather than guessing a location — callers must
 * surface "تعذر استخراج موقع موثوق من الرابط" and fall back to manual AOI,
 * per the anti-fabrication rule in the product spec.
 */

const SHORT_LINK_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);

export function isShortGoogleMapsLink(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return SHORT_LINK_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export async function resolveShortLink(
  shortUrl: string,
  timeoutMs = Number(process.env.GOOGLE_MAPS_SHORTLINK_RESOLVER_TIMEOUT_MS ?? 5000)
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // `redirect: "manual"` so we read the Location header ourselves instead
    // of silently following an arbitrary chain to an unexpected host.
    const response = await fetch(shortUrl, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal
    });

    const location = response.headers.get("location");
    if (!location) {
      throw new Error(
        `Short link did not return a redirect (status ${response.status}).`
      );
    }
    return location;
  } finally {
    clearTimeout(timeout);
  }
}
