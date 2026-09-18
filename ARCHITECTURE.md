# Architecture notes (supplement to README.md §3)

## Why analysis jobs can't just run in a Next.js API route

Next.js API routes (and most serverless hosts) kill a request after a short
timeout (seconds, not minutes). The pipeline in the product spec — parse
location → check data availability → acquire satellite scenes → cloud mask
→ spectral processing → geological analysis → terrain analysis → lineament
extraction → evidence fusion → prospectivity modeling → generate map →
generate report — can easily take minutes and involves large raster files
that should never touch a web server's memory directly.

**The pattern this schema is built for (Phase 5+):**

1. A web request creates an `analysis_jobs` row with `status: PENDING` and
   returns immediately with the job id.
2. A separate long-running worker process (not part of this Next.js app —
   a small Node service, or a queue consumer) picks up the job from the
   `REDIS_URL` queue, and updates `analysis_jobs.status` /
   `progressPercent` as it moves through each real pipeline stage. This is
   what makes the progress bar in spec §31 "real, not an animation" — the
   UI just polls or subscribes to the job row.
3. Large intermediate rasters (downloaded scenes, computed spectral index
   layers) go to object storage (`S3_*` in `.env.example`), never into
   Postgres directly — only their URLs and summary statistics are stored
   in `spectral_features`, `terrain_features`, etc.
4. If a stage fails (a connector is down, no cloud-free scene exists), the
   job moves to `PARTIAL` or `FAILED` with `errorMessage` /
   `partialReasons` populated — never silently produces a result as if
   nothing went wrong (spec §32, §33).

## Tile-based processing for large AOIs

Spec §30 asks for large AOIs to be split into tiles rather than processed
as one giant raster. The `study_areas.geometry` column already stores the
AOI as a proper PostGIS polygon, which is what a tiling step would query
against (`ST_Intersects` / `ST_Subdivide`) — this isn't implemented yet,
but the schema doesn't need to change to add it.

## Row-level data isolation

`src/lib/authz.ts`'s `requireOwnedProject()` is the single choke point for
"a user sees only their own projects" (spec §29). Every table that hangs
off `projects` (study areas, analysis jobs, reports, exports) is reached
*through* a project, so checking ownership once at the project level is
sufficient — there's no need to duplicate an ownership check on every
child table as long as every new route continues to go through
`requireOwnedProject()` first. If Postgres-level Row-Level Security is
added later for defense-in-depth, `ownerId` on `projects` is the column to
key every policy off.
