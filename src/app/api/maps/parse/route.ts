import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/authz";
import { parseGoogleMapsUrl } from "@/lib/gis/mapsUrlParser";
import { isShortGoogleMapsLink, resolveShortLink } from "@/lib/gis/resolveShortLink";
import { logEvent } from "@/lib/log";

const bodySchema = z.object({ url: z.string().min(1).max(2048) });

// User-facing message per the product spec's §5 requirement: never invent
// coordinates when a link can't be confidently parsed.
const UNRESOLVED_MESSAGE_AR =
  "تعذر استخراج موقع موثوق من الرابط. يرجى تحديد الموقع يدويًا على الخريطة.";
const UNRESOLVED_MESSAGE_EN =
  "Could not extract a reliable location from this link. Please select the area manually on the map.";

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    const parsedBody = bodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.flatten() }, { status: 400 });
    }

    let effectiveUrl = parsedBody.data.url.trim();

    if (isShortGoogleMapsLink(effectiveUrl)) {
      try {
        effectiveUrl = await resolveShortLink(effectiveUrl);
      } catch (err) {
        await logEvent("WARN", "maps-parser", "Short link resolution failed", {
          metadata: { url: parsedBody.data.url, error: String(err) }
        });
        return NextResponse.json(
          {
            ok: false,
            reason: "short_link_resolution_failed",
            message: { ar: UNRESOLVED_MESSAGE_AR, en: UNRESOLVED_MESSAGE_EN }
          },
          { status: 200 }
        );
      }
    }

    const result = parseGoogleMapsUrl(effectiveUrl);

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          reason: result.reason,
          message: { ar: UNRESOLVED_MESSAGE_AR, en: UNRESOLVED_MESSAGE_EN }
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, location: result });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}
