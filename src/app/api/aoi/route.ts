import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireOwnedProject, UnauthorizedError, ForbiddenError } from "@/lib/authz";
import {
  AOI_PRESET_AREAS_KM2,
  buildCirclePresetAoi,
  buildFreeformCircleAoi,
  buildRectangleAoi,
  buildPolygonAoi
} from "@/lib/gis/aoi";
import { createStudyArea } from "@/lib/gis/studyArea";
import { logEvent } from "@/lib/log";

const latLng = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

const bodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("preset_circle"),
    projectId: z.string(),
    center: latLng,
    areaKm2: z.union(AOI_PRESET_AREAS_KM2.map((a) => z.literal(a)) as [z.ZodLiteral<number>, ...z.ZodLiteral<number>[]]),
    name: z.string().max(200).optional(),
    sourceUrl: z.string().max(2048).optional(),
    placeName: z.string().max(500).optional(),
    zoomLevel: z.number().optional()
  }),
  z.object({
    kind: z.literal("freeform_circle"),
    projectId: z.string(),
    center: latLng,
    radiusMeters: z.number().positive().max(50_000),
    name: z.string().max(200).optional()
  }),
  z.object({
    kind: z.literal("rectangle"),
    projectId: z.string(),
    corner1: latLng,
    corner2: latLng,
    name: z.string().max(200).optional()
  }),
  z.object({
    kind: z.literal("polygon"),
    projectId: z.string(),
    points: z.array(latLng).min(3).max(500),
    name: z.string().max(200).optional()
  })
]);

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await requireOwnedProject(user, parsed.data.projectId);

    const data = parsed.data;
    let aoi;
    let sourceType: "MANUAL_POINT" | "MANUAL_CIRCLE" | "MANUAL_RECTANGLE" | "MANUAL_POLYGON" =
      "MANUAL_CIRCLE";
    let sourceUrl: string | null = null;
    let placeName: string | null = null;
    let zoomLevel: number | null = null;

    switch (data.kind) {
      case "preset_circle":
        aoi = buildCirclePresetAoi(data.center.lat, data.center.lng, data.areaKm2);
        sourceType = data.sourceUrl ? "GOOGLE_MAPS_URL" : "MANUAL_POINT";
        sourceUrl = data.sourceUrl ?? null;
        placeName = data.placeName ?? null;
        zoomLevel = data.zoomLevel ?? null;
        break;
      case "freeform_circle":
        aoi = buildFreeformCircleAoi(data.center.lat, data.center.lng, data.radiusMeters);
        sourceType = "MANUAL_CIRCLE";
        break;
      case "rectangle":
        aoi = buildRectangleAoi(data.corner1, data.corner2);
        sourceType = "MANUAL_RECTANGLE";
        break;
      case "polygon":
        aoi = buildPolygonAoi(data.points);
        sourceType = "MANUAL_POLYGON";
        break;
    }

    const studyArea = await createStudyArea({
      projectId: data.projectId,
      name: data.name ?? null,
      sourceType,
      sourceUrl,
      placeName,
      zoomLevel,
      aoi
    });

    await logEvent("INFO", "aoi", `Study area created (${data.kind})`, {
      userId: user.id,
      metadata: { projectId: data.projectId, studyAreaId: studyArea.id, areaKm2: aoi.areaKm2 }
    });

    return NextResponse.json({ studyArea }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
