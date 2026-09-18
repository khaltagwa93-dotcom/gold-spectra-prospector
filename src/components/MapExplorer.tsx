"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl, { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import * as turf from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useLanguage } from "@/components/LanguageProvider";
import { AOI_PRESET_AREAS_KM2 } from "@/lib/gis/aoi";

/**
 * NOTE on the base map style: this uses OpenStreetMap's public raster tiles,
 * which have NO API key requirement but ARE subject to OSM's tile usage
 * policy (https://operations.osmfoundation.org/policies/tiles/) — fine for
 * development, but production traffic should point at a proper tile
 * provider (MapTiler, Stadia Maps, or a self-hosted tileserver) configured
 * through the admin Data Sources page. See ARCHITECTURE.md.
 */
const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors"
    }
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }]
};

type ToolMode = "idle" | "point" | "circle" | "rectangle" | "polygon";

export type AoiDraft =
  | { kind: "preset_circle"; center: { lat: number; lng: number }; areaKm2: (typeof AOI_PRESET_AREAS_KM2)[number] }
  | { kind: "freeform_circle"; center: { lat: number; lng: number }; radiusMeters: number }
  | { kind: "rectangle"; corner1: { lat: number; lng: number }; corner2: { lat: number; lng: number } }
  | { kind: "polygon"; points: Array<{ lat: number; lng: number }> };

interface MapExplorerProps {
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onAoiReady: (draft: AoiDraft) => void;
}

const PREVIEW_SOURCE_ID = "aoi-preview";

export function MapExplorer({ initialCenter, initialZoom, onAoiReady }: MapExplorerProps) {
  const { strings } = useLanguage();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const clickPointRef = useRef<{ lat: number; lng: number } | null>(null);

  const [mode, setMode] = useState<ToolMode>("idle");
  const [pendingCenter, setPendingCenter] = useState<{ lat: number; lng: number } | null>(null);

  // --- Map setup --------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [initialCenter?.lng ?? 55.2708, initialCenter?.lat ?? 25.2048], // default: UAE
      zoom: initialZoom ?? 8
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: false, point: false, trash: false }
    });
    map.addControl(draw as unknown as maplibregl.IControl, "top-left");
    drawRef.current = draw;

    map.on("load", () => {
      map.addSource(PREVIEW_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      map.addLayer({
        id: `${PREVIEW_SOURCE_ID}-fill`,
        type: "fill",
        source: PREVIEW_SOURCE_ID,
        paint: { "fill-color": "#D4AF37", "fill-opacity": 0.18 }
      });
      map.addLayer({
        id: `${PREVIEW_SOURCE_ID}-line`,
        type: "line",
        source: PREVIEW_SOURCE_ID,
        paint: { "line-color": "#D4AF37", "line-width": 2 }
      });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPreview = useCallback((feature: GeoJSON.Feature | null) => {
    const source = mapRef.current?.getSource(PREVIEW_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData({
      type: "FeatureCollection",
      features: feature ? [feature] : []
    });
  }, []);

  // --- Click / drag handling per tool mode -------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function toLatLng(e: maplibregl.MapMouseEvent) {
      return { lat: e.lngLat.lat, lng: e.lngLat.lng };
    }

    function handleClick(e: maplibregl.MapMouseEvent) {
      const point = toLatLng(e);

      if (mode === "point") {
        setPendingCenter(point);
        setPreview(turf.point([point.lng, point.lat]));
        return;
      }

      if (mode === "circle" || mode === "rectangle") {
        if (!clickPointRef.current) {
          clickPointRef.current = point;
          return;
        }
        // Second click finalizes the shape.
        if (mode === "circle") {
          const radiusMeters = turf.distance(
            [clickPointRef.current.lng, clickPointRef.current.lat],
            [point.lng, point.lat],
            { units: "kilometers" }
          ) * 1000;
          onAoiReady({ kind: "freeform_circle", center: clickPointRef.current, radiusMeters });
        } else {
          onAoiReady({ kind: "rectangle", corner1: clickPointRef.current, corner2: point });
        }
        clickPointRef.current = null;
        setMode("idle");
        setPreview(null);
      }
    }

    function handleMouseMove(e: maplibregl.MapMouseEvent) {
      if (!clickPointRef.current) return;
      const point = toLatLng(e);

      if (mode === "circle") {
        const radiusKm = turf.distance(
          [clickPointRef.current.lng, clickPointRef.current.lat],
          [point.lng, point.lat],
          { units: "kilometers" }
        );
        if (radiusKm > 0) {
          setPreview(turf.circle([clickPointRef.current.lng, clickPointRef.current.lat], radiusKm, { steps: 48 }));
        }
      } else if (mode === "rectangle") {
        const minLng = Math.min(clickPointRef.current.lng, point.lng);
        const maxLng = Math.max(clickPointRef.current.lng, point.lng);
        const minLat = Math.min(clickPointRef.current.lat, point.lat);
        const maxLat = Math.max(clickPointRef.current.lat, point.lat);
        if (minLng !== maxLng && minLat !== maxLat) {
          setPreview(turf.bboxPolygon([minLng, minLat, maxLng, maxLat]));
        }
      }
    }

    map.on("click", handleClick);
    map.on("mousemove", handleMouseMove);
    return () => {
      map.off("click", handleClick);
      map.off("mousemove", handleMouseMove);
    };
  }, [mode, onAoiReady, setPreview]);

  // --- Polygon tool delegates to MapboxDraw ------------------------------
  useEffect(() => {
    const map = mapRef.current;
    const draw = drawRef.current;
    if (!map || !draw) return;

    if (mode === "polygon") {
      draw.changeMode("draw_polygon");
    }

    function handleCreate(e: { features: GeoJSON.Feature<GeoJSON.Polygon>[] }) {
      const feature = e.features[0];
      if (!feature) return;
      const points = feature.geometry.coordinates[0]?.map(([lng, lat]) => ({ lat, lng })) ?? [];
      if (points.length >= 3) {
        onAoiReady({ kind: "polygon", points });
      }
      draw.deleteAll();
      setMode("idle");
    }

    map.on("draw.create", handleCreate as unknown as (e: object) => void);
    return () => {
      map.off("draw.create", handleCreate as unknown as (e: object) => void);
    };
  }, [mode, onAoiReady]);

  function startTool(next: ToolMode) {
    clickPointRef.current = null;
    setPendingCenter(null);
    setPreview(null);
    setMode(next);
  }

  function choosePresetArea(areaKm2: (typeof AOI_PRESET_AREAS_KM2)[number]) {
    if (!pendingCenter) return;
    onAoiReady({ kind: "preset_circle", center: pendingCenter, areaKm2 });
    setPendingCenter(null);
    setMode("idle");
    setPreview(null);
  }

  return (
    <div className="relative w-full h-full min-h-[420px]">
      <div ref={containerRef} className="absolute inset-0 rounded-lg overflow-hidden border border-navy-700" />

      <div className="absolute top-3 start-3 z-10 flex flex-col gap-2 rounded-lg border border-navy-700 bg-navy-900/90 p-2 backdrop-blur">
        {(["point", "circle", "rectangle", "polygon"] as const).map((tool) => (
          <button
            key={tool}
            type="button"
            onClick={() => startTool(tool)}
            className={`rounded px-3 py-1.5 text-sm text-start transition-colors ${
              mode === tool ? "bg-gold-500 text-navy-950 font-semibold" : "text-slate-200 hover:bg-navy-800"
            }`}
          >
            {strings.tools[tool]}
          </button>
        ))}
      </div>

      {pendingCenter && (
        <div className="absolute bottom-3 start-3 z-10 rounded-lg border border-navy-700 bg-navy-900/95 p-3 backdrop-blur">
          <p className="mb-2 text-sm text-gold-400">{strings.presetAreas}</p>
          <div className="flex flex-wrap gap-2">
            {AOI_PRESET_AREAS_KM2.map((areaKm2) => (
              <button
                key={areaKm2}
                type="button"
                onClick={() => choosePresetArea(areaKm2)}
                className="rounded border border-gold-500/50 px-3 py-1 text-sm text-gold-400 hover:bg-gold-500 hover:text-navy-950"
              >
                {areaKm2} km²
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
