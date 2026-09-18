-- Run this ONCE, AFTER the first `npx prisma migrate dev` has created the
-- tables. Prisma cannot generate GiST indexes on geometry columns itself,
-- so every spatially-queried geometry column gets one here.

CREATE INDEX IF NOT EXISTS study_areas_geometry_gist
  ON study_areas USING GIST (geometry);

CREATE INDEX IF NOT EXISTS satellite_scenes_footprint_gist
  ON satellite_scenes USING GIST (footprint);

CREATE INDEX IF NOT EXISTS geological_layers_geometry_gist
  ON geological_layers USING GIST (geometry);

CREATE INDEX IF NOT EXISTS lineaments_geometry_gist
  ON lineaments USING GIST (geometry);

CREATE INDEX IF NOT EXISTS prospectivity_zones_geometry_gist
  ON prospectivity_zones USING GIST (geometry);
