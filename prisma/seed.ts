import { PrismaClient, SatelliteSourceName } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- First admin account --------------------------------------------------
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-immediately";

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: "Admin", role: "ADMIN" }
  });
  console.log(`Admin user ready: ${admin.email} (change the seed password after first login)`);

  // --- Satellite source catalogue (sensor metadata, not credentials) --------
  const satelliteSources: Array<{
    name: SatelliteSourceName;
    displayName: string;
    provider: string;
    bands: object;
    resolutionMeters: number;
    revisitDays: number;
    isHyperspectral: boolean;
    notes: string;
  }> = [
    {
      name: "SENTINEL2_MSI",
      displayName: "Sentinel-2 MSI (Level-2A Surface Reflectance)",
      provider: "Copernicus Data Space Ecosystem / Sentinel Hub",
      bands: { visible: ["B02", "B03", "B04"], nir: ["B08"], swir: ["B11", "B12"], redEdge: ["B05", "B06", "B07"] },
      resolutionMeters: 10,
      revisitDays: 5,
      isHyperspectral: false,
      notes: "Primary data source per the product spec's priority order."
    },
    {
      name: "LANDSAT_8_9",
      displayName: "Landsat 8/9 (Collection 2 Level-2 Surface Reflectance)",
      provider: "USGS / NASA",
      bands: { visible: ["B2", "B3", "B4"], nir: ["B5"], swir: ["B6", "B7"], thermal: ["B10"] },
      resolutionMeters: 30,
      revisitDays: 16,
      isHyperspectral: false,
      notes: "Secondary/fallback source when Sentinel-2 is unavailable for an AOI."
    },
    {
      name: "ASTER",
      displayName: "ASTER",
      provider: "USGS / NASA / METI",
      bands: { vnir: ["1", "2", "3N", "3B"], swir: ["4", "5", "6", "7", "8", "9"], tir: ["10", "11", "12", "13", "14"] },
      resolutionMeters: 15,
      revisitDays: 16,
      isHyperspectral: false,
      notes: "Used only when a scene actually exists for the AOI - availability varies widely."
    },
    {
      name: "ENMAP",
      displayName: "EnMAP",
      provider: "DLR",
      bands: { hyperspectral: "224 bands, 420-2450 nm" },
      resolutionMeters: 30,
      revisitDays: 27,
      isHyperspectral: true,
      notes: "Tasked/limited coverage - checked per-AOI, never assumed available."
    },
    {
      name: "NASA_EMIT",
      displayName: "NASA EMIT",
      provider: "NASA JPL",
      bands: { hyperspectral: "285 bands, 380-2500 nm" },
      resolutionMeters: 60,
      revisitDays: 0, // opportunistic ISS coverage, not a fixed revisit cycle
      isHyperspectral: true,
      notes: "ISS-hosted instrument with opportunistic, non-uniform global coverage."
    }
  ];

  for (const source of satelliteSources) {
    await prisma.satelliteSource.upsert({
      where: { name: source.name },
      update: source,
      create: source
    });
  }

  // --- Connector health rows, all honestly NOT_CONFIGURED until an admin
  // fills in real credentials via the (Phase 5+) Data Sources settings page.
  const connectorKeys = [
    { key: "copernicus_sentinel2", displayName: "Copernicus Data Space Ecosystem (Sentinel-2)" },
    { key: "sentinel_hub", displayName: "Sentinel Hub (Sentinel-2 alternative)" },
    { key: "usgs_landsat", displayName: "USGS EarthExplorer / M2M (Landsat 8/9, ASTER)" },
    { key: "nasa_earthdata_emit", displayName: "NASA Earthdata (EMIT)" },
    { key: "enmap_gst", displayName: "EnMAP (DLR GST)" }
  ];

  for (const connector of connectorKeys) {
    await prisma.apiSource.upsert({
      where: { key: connector.key },
      update: {},
      create: { key: connector.key, displayName: connector.displayName, status: "NOT_CONFIGURED" }
    });
  }

  console.log(`Seeded ${satelliteSources.length} satellite sources and ${connectorKeys.length} connector rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
