import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { cn } from "@/lib/utils";
import type { ThematicMapProduct, ThematicMapType } from "@/types/thematicMaps";

interface LayerState {
  visible: boolean;
  opacity: number;
}

interface ThematicMapViewerProps {
  mapType: ThematicMapType;
  product: ThematicMapProduct | null;
  className?: string;
}

type BasemapId = "satellite" | "satellite_labels" | "topo";

const BASEMAP_LABELS: Record<BasemapId, string> = {
  satellite: "Satellite",
  satellite_labels: "Satellite + etiquettes",
  topo: "Topographique",
};

const BASE_LAYER_IDS = {
  satellite: "basemap-esri-sat",
  satelliteLabels: "basemap-esri-labels",
  topo: "basemap-topo",
} as const;

const LOCAL_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    esri_satellite: {
      type: "raster",
      tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Tiles © Esri",
    },
    esri_labels: {
      type: "raster",
      tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Labels © Esri",
    },
    opentopo: {
      type: "raster",
      tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenTopoMap contributors",
    },
    fallback_land: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: "Morocco" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-13.2, 27.0],
                  [-1.0, 27.0],
                  [-1.0, 35.9],
                  [-5.3, 35.9],
                  [-6.7, 35.5],
                  [-8.2, 34.8],
                  [-9.5, 33.8],
                  [-10.8, 32.7],
                  [-12.0, 31.4],
                  [-13.2, 30.2],
                  [-13.2, 27.0],
                ],
              ],
            },
          },
        ],
      },
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#9ec9e3",
      },
    },
    {
      id: "fallback-land-fill",
      type: "fill",
      source: "fallback_land",
      paint: {
        "fill-color": "#f1f5f9",
        "fill-opacity": 1,
      },
    },
    {
      id: "fallback-land-outline",
      type: "line",
      source: "fallback_land",
      paint: {
        "line-color": "#94a3b8",
        "line-width": 1.2,
      },
    },
    {
      id: BASE_LAYER_IDS.satellite,
      type: "raster",
      source: "esri_satellite",
      paint: {
        "raster-opacity": 1,
      },
      layout: {
        visibility: "visible",
      },
    },
    {
      id: BASE_LAYER_IDS.satelliteLabels,
      type: "raster",
      source: "esri_labels",
      paint: {
        "raster-opacity": 1,
      },
      layout: {
        visibility: "visible",
      },
    },
    {
      id: BASE_LAYER_IDS.topo,
      type: "raster",
      source: "opentopo",
      paint: {
        "raster-opacity": 1,
      },
      layout: {
        visibility: "none",
      },
    },
  ],
};

const DEFAULT_CENTER: [number, number] = [-5.0, 34.0];
const DEFAULT_ZOOM = 7;
const ATTRIBUTION = "MapLibre | © Esri | © OpenStreetMap contributors | © OpenTopoMap contributors";

const sourceId = (id: string) => `tm-src-${id}`;
const layerId = (id: string) => `tm-layer-${id}`;
const outlineId = (id: string) => `tm-outline-${id}`;

function browserSupportsWebGL(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function isPointCollection(geojson: any): boolean {
  return (geojson?.features ?? []).some((f: any) => f?.geometry?.type === "Point" || f?.geometry?.type === "MultiPoint");
}

function pointPalette(mapType: ThematicMapType): any[] {
  const intensity = ["coalesce", ["get", "intensity"], 0];
  if (mapType === "flood") {
    return ["interpolate", ["linear"], intensity, 0, "#93c5fd", 10, "#38bdf8", 20, "#0ea5e9", 35, "#0369a1"];
  }
  if (mapType === "precip") {
    return [
      "interpolate",
      ["linear"],
      intensity,
      0.1,
      "#0ea53a",
      2,
      "#6ed40f",
      5,
      "#ffd000",
      15,
      "#ff7a00",
      40,
      "#ff2f2f",
      90,
      "#9b1dff",
      170,
      "#6a00ff",
    ];
  }
  return ["interpolate", ["linear"], intensity, 0, "#dbeafe", 10, "#f1f5f9", 20, "#ffffff", 35, "#e2e8f0"];
}

function pointHeatmapColor(mapType: ThematicMapType): any[] {
  if (mapType === "flood") {
    return [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(37,99,235,0)",
      0.2,
      "rgba(59,130,246,0.45)",
      0.45,
      "rgba(37,99,235,0.7)",
      0.7,
      "rgba(29,78,216,0.85)",
      1,
      "rgba(23,37,84,0.95)",
    ];
  }
  if (mapType === "precip") {
    return [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(31,157,47,0)",
      0.15,
      "rgba(108,207,43,0.55)",
      0.32,
      "rgba(216,234,48,0.72)",
      0.5,
      "rgba(255,224,51,0.83)",
      0.66,
      "rgba(255,138,26,0.9)",
      0.82,
      "rgba(255,47,47,0.94)",
      1,
      "rgba(106,0,255,0.99)",
    ];
  }

  return [
    "interpolate",
    ["linear"],
    ["heatmap-density"],
    0,
    "rgba(248,250,252,0)",
    0.2,
    "rgba(226,232,240,0.4)",
    0.45,
    "rgba(241,245,249,0.65)",
    0.7,
    "rgba(255,255,255,0.85)",
    1,
    "rgba(255,255,255,0.95)",
  ];
}

interface BoundsAccumulator {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

function ingestCoordinates(coordinates: any, acc: BoundsAccumulator): void {
  if (!Array.isArray(coordinates)) return;

  if (coordinates.length >= 2 && typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
    const lon = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
    acc.minLon = Math.min(acc.minLon, lon);
    acc.minLat = Math.min(acc.minLat, lat);
    acc.maxLon = Math.max(acc.maxLon, lon);
    acc.maxLat = Math.max(acc.maxLat, lat);
    return;
  }

  for (const child of coordinates) {
    ingestCoordinates(child, acc);
  }
}

function geoJsonBounds(geojson: any): [[number, number], [number, number]] | null {
  const features = Array.isArray(geojson?.features) ? geojson.features : [geojson];
  const acc: BoundsAccumulator = {
    minLon: Number.POSITIVE_INFINITY,
    minLat: Number.POSITIVE_INFINITY,
    maxLon: Number.NEGATIVE_INFINITY,
    maxLat: Number.NEGATIVE_INFINITY,
  };

  for (const feature of features) {
    ingestCoordinates(feature?.geometry?.coordinates, acc);
  }

  if (!Number.isFinite(acc.minLon) || !Number.isFinite(acc.minLat) || !Number.isFinite(acc.maxLon) || !Number.isFinite(acc.maxLat)) {
    return null;
  }
  return [
    [acc.minLon, acc.minLat],
    [acc.maxLon, acc.maxLat],
  ];
}

function mergeBounds(
  left: [[number, number], [number, number]] | null,
  right: [[number, number], [number, number]] | null,
): [[number, number], [number, number]] | null {
  if (!left) return right;
  if (!right) return left;
  return [
    [Math.min(left[0][0], right[0][0]), Math.min(left[0][1], right[0][1])],
    [Math.max(left[1][0], right[1][0]), Math.max(left[1][1], right[1][1])],
  ];
}

function setBaseLayerVisibility(map: maplibregl.Map, layerId: string, visible: boolean): void {
  if (!map.getLayer(layerId)) return;
  map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
}

function applyBasemap(map: maplibregl.Map, basemapId: BasemapId): void {
  const showSatellite = basemapId === "satellite" || basemapId === "satellite_labels";
  const showSatelliteLabels = basemapId === "satellite_labels";
  const showTopo = basemapId === "topo";

  setBaseLayerVisibility(map, BASE_LAYER_IDS.satellite, showSatellite);
  setBaseLayerVisibility(map, BASE_LAYER_IDS.satelliteLabels, showSatelliteLabels);
  setBaseLayerVisibility(map, BASE_LAYER_IDS.topo, showTopo);
}

export function ThematicMapViewer({ mapType, product, className }: ThematicMapViewerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const themedLayersRef = useRef<{ sourceId: string; layerId: string; outlineId: string }[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [layerStates, setLayerStates] = useState<Record<string, LayerState>>({});
  const [basemapId, setBasemapId] = useState<BasemapId>("satellite_labels");
  const [precipRenderMode, setPrecipRenderMode] = useState<"mode1" | "mode2">("mode2");
  const [styleReadyTick, setStyleReadyTick] = useState(0);

  const clearThemedLayers = (map: maplibregl.Map) => {
    for (const ids of themedLayersRef.current) {
      if (map.getLayer(ids.layerId)) map.removeLayer(ids.layerId);
      if (map.getLayer(ids.outlineId)) map.removeLayer(ids.outlineId);
      if (map.getSource(ids.sourceId)) map.removeSource(ids.sourceId);
    }
    themedLayersRef.current = [];
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    if (!browserSupportsWebGL()) {
      setMapError("MapLibre/WebGL n'est pas disponible dans ce navigateur.");
      setMapLoaded(true);
      return;
    }

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: LOCAL_STYLE,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
      });
    } catch {
      setMapError("Impossible d'initialiser la carte MapLibre.");
      setMapLoaded(true);
      return;
    }

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: ATTRIBUTION }), "bottom-right");

    let ready = false;
    const markReady = () => {
      if (ready) return;
      ready = true;
      setMapLoaded(true);
      map.resize();
    };

    const onStyleReady = () => {
      setStyleReadyTick((value) => value + 1);
      applyBasemap(map, basemapId);
      markReady();
    };

    const onError = (event: any) => {
      const message = event?.error?.message;
      if (message) setMapError(message);
    };

    map.on("load", onStyleReady);
    map.on("style.load", onStyleReady);
    map.on("error", onError);

    if (map.isStyleLoaded()) {
      onStyleReady();
    } else {
      window.requestAnimationFrame(() => {
        if (map.isStyleLoaded()) onStyleReady();
      });
    }

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => map.resize()) : null;
    observer?.observe(mapContainerRef.current);

    return () => {
      observer?.disconnect();
      map.off("load", onStyleReady);
      map.off("style.load", onStyleReady);
      map.off("error", onError);
      clearThemedLayers(map);
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.isStyleLoaded()) return;
    applyBasemap(map, basemapId);
  }, [basemapId, mapLoaded, styleReadyTick]);

  useEffect(() => {
    if (!product) {
      setLayerStates({});
      return;
    }
    const next: Record<string, LayerState> = {};
    for (const layer of product.layers) {
      next[layer.id] = { visible: layer.visible, opacity: layer.opacity };
    }
    setLayerStates(next);
  }, [product?.id]);

  useEffect(() => {
    if (mapType !== "precip") return;
    setPrecipRenderMode("mode2");
  }, [product?.id, mapType]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (!map.isStyleLoaded()) return;

    clearThemedLayers(map);
    if (!product) return;

    try {
      let focusBounds: [[number, number], [number, number]] | null = null;

      for (const layer of product.layers) {
        const sid = sourceId(layer.id);
        const lid = layerId(layer.id);
        const oid = outlineId(layer.id);
        const cfg = layerStates[layer.id] ?? { visible: layer.visible, opacity: layer.opacity };
        const visibility = cfg.visible ? "visible" : "none";
        const precipUseCells = mapType === "precip" && precipRenderMode === "mode1";
        const precipDataPath = precipUseCells ? (layer.alternate_asset_path ?? layer.asset_path) : layer.asset_path;
        const layerData: any = layer.geojson ?? precipDataPath;

        if (layer.source_type === "geojson" && layerData) {
          map.addSource(sid, { type: "geojson", data: layerData });

          if (cfg.visible && layer.kind === "binary_mask" && layer.geojson) {
            focusBounds = mergeBounds(focusBounds, geoJsonBounds(layer.geojson));
          }

          const usePrecipHeatmap = mapType === "precip" && layer.kind === "vector" && precipRenderMode === "mode2";
          if ((layer.geojson && isPointCollection(layer.geojson)) || usePrecipHeatmap) {
            map.addLayer({
              id: lid,
              type: "heatmap",
              source: sid,
              layout: { visibility },
              paint: {
                "heatmap-weight":
                  mapType === "precip"
                    ? [
                        "interpolate",
                        ["linear"],
                        ["coalesce", ["to-number", ["get", "mm"]], 0],
                        0,
                        0,
                        2,
                        0.18,
                        5,
                        0.32,
                        10,
                        0.46,
                        20,
                        0.62,
                        40,
                        0.78,
                        90,
                        0.92,
                        170,
                        1,
                      ]
                    : ["interpolate", ["linear"], ["coalesce", ["to-number", ["get", "intensity"]], 0], 0, 0.05, 35, 1],
                "heatmap-intensity": mapType === "precip" ? ["interpolate", ["linear"], ["zoom"], 5, 0.9, 8, 1.25, 11, 1.55] : ["interpolate", ["linear"], ["zoom"], 5, 0.6, 8, 1.0, 11, 1.25],
                "heatmap-radius": mapType === "precip" ? ["interpolate", ["linear"], ["zoom"], 5, 20, 8, 40, 11, 62] : ["interpolate", ["linear"], ["zoom"], 5, 12, 8, 26, 11, 40],
                "heatmap-opacity": mapType === "precip" ? Math.min(cfg.opacity + 0.16, 0.96) : Math.min(cfg.opacity + 0.08, 0.95),
                "heatmap-color": pointHeatmapColor(mapType),
              },
            });
          } else {
            if (layer.kind === "vector") {
              map.addLayer({
                id: lid,
                type: "fill",
                source: sid,
                layout: { visibility },
                paint: {
                  "fill-color":
                    mapType === "precip"
                      ? ["coalesce", ["get", "color"], "#1f9d2f"]
                      : pointPalette(mapType),
                  "fill-opacity": mapType === "precip" ? Math.min(cfg.opacity + 0.16, 0.98) : Math.min(cfg.opacity + 0.08, 0.92),
                  "fill-antialias": !(mapType === "precip" && precipRenderMode === "mode1"),
                  "fill-outline-color":
                    mapType === "precip"
                      ? ["coalesce", ["get", "color"], "#1f9d2f"]
                      : mapType === "flood"
                        ? "#0c4a6e"
                        : "#475569",
                },
              });
              if (mapType !== "precip") {
                map.addLayer({
                  id: oid,
                  type: "line",
                  source: sid,
                  layout: { visibility },
                  paint: {
                    "line-color": mapType === "flood" ? "#0c4a6e" : "#475569",
                    "line-width": 1.2,
                  },
                });
              }
            } else {
              map.addLayer({
                id: lid,
                type: "fill",
                source: sid,
                layout: { visibility },
                paint: {
                  "fill-color":
                    (layer.paint?.fillColor as string) ||
                    (mapType === "flood" ? "#1d4ed8" : mapType === "precip" ? "#22c55e" : "#ffffff"),
                  "fill-opacity": cfg.opacity,
                },
              });
              map.addLayer({
                id: oid,
                type: "line",
                source: sid,
                layout: { visibility },
                paint: {
                  "line-color": (layer.paint?.outlineColor as string) || "#1f2937",
                  "line-width": 1.4,
                },
              });
            }
          }
        }

        if (layer.source_type === "xyz" && layer.tiles?.length) {
          map.addSource(sid, { type: "raster", tiles: layer.tiles, tileSize: 256, minzoom: layer.minzoom, maxzoom: layer.maxzoom });
          map.addLayer({
            id: lid,
            type: "raster",
            source: sid,
            layout: { visibility },
            paint: { "raster-opacity": cfg.opacity },
          });
        }

        themedLayersRef.current.push({ sourceId: sid, layerId: lid, outlineId: oid });
      }

      const [minLon, minLat, maxLon, maxLat] = product.bbox;
      const targetBounds = focusBounds ?? [
        [minLon, minLat],
        [maxLon, maxLat],
      ];
      map.fitBounds(
        targetBounds as [[number, number], [number, number]],
        { padding: mapType === "flood" ? 60 : 50, duration: 600, maxZoom: mapType === "flood" ? 12.5 : 11.5 },
      );

      if (basemapId === "satellite_labels" && map.getLayer(BASE_LAYER_IDS.satelliteLabels)) {
        map.moveLayer(BASE_LAYER_IDS.satelliteLabels);
      }
      setMapError(null);
    } catch (error: any) {
      setMapError(error?.message || "Erreur d'affichage des couches.");
    }
  }, [basemapId, layerStates, mapLoaded, mapType, precipRenderMode, product, styleReadyTick]);

  const legend = useMemo(() => {
    if (!product) return [];
    return product.layers.filter((layer) => layerStates[layer.id]?.visible).flatMap((layer) => layer.legend ?? []);
  }, [layerStates, product]);

  return (
    <div className={cn("relative h-[560px] min-h-[460px] overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      <div ref={mapContainerRef} className="absolute inset-0 bg-[#9ec9e3]" />

      {!mapLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 text-sm font-medium text-foreground">
          Chargement de la carte...
        </div>
      )}

      {mapError && (
        <div className="absolute bottom-3 right-3 z-20 max-w-[360px] rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow">
          {mapError}
        </div>
      )}

      <div className="absolute left-16 top-3 z-20 rounded-md border bg-background/90 px-3 py-1.5 shadow-sm backdrop-blur-sm">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {mapType === "flood" ? "Carte inondation" : mapType === "snow" ? "Carte neige" : "Carte precipitation"}
        </div>
        <div className="text-xs font-medium">{product?.event_name ?? "Aucun produit"}</div>
      </div>

      <div className="absolute left-16 top-16 z-20 rounded-md border bg-background/95 px-3 py-2 shadow-sm">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fond de carte</div>
        <select
          value={basemapId}
          onChange={(event) => setBasemapId(event.target.value as BasemapId)}
          className="w-[210px] rounded border bg-background px-2 py-1 text-xs"
        >
          {(Object.keys(BASEMAP_LABELS) as BasemapId[]).map((key) => (
            <option key={key} value={key}>
              {BASEMAP_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      <div className="absolute right-3 top-3 z-20 max-h-[520px] w-[290px] overflow-auto rounded-lg border bg-background/95 p-3 shadow">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Couches superposables</div>
        <div className="space-y-3">
          {mapType === "precip" && (
            <div className="rounded-md border p-2">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mode d'affichage</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrecipRenderMode("mode1")}
                  className={`rounded border px-2 py-1 text-xs font-medium ${
                    precipRenderMode === "mode1" ? "border-[#0052CC] bg-[#0052CC] text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Mode 1
                </button>
                <button
                  type="button"
                  onClick={() => setPrecipRenderMode("mode2")}
                  className={`rounded border px-2 py-1 text-xs font-medium ${
                    precipRenderMode === "mode2" ? "border-[#0052CC] bg-[#0052CC] text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Mode 2
                </button>
              </div>
            </div>
          )}
          {(product?.layers ?? []).map((layer) => {
            const state = layerStates[layer.id] ?? { visible: layer.visible, opacity: layer.opacity };
            return (
              <div key={layer.id} className="space-y-2 rounded-md border p-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={state.visible}
                    onChange={(event) => {
                      const visible = event.target.checked;
                      setLayerStates((prev) => ({
                        ...prev,
                        [layer.id]: { visible, opacity: prev[layer.id]?.opacity ?? layer.opacity },
                      }));
                    }}
                  />
                  <span className="font-medium">{layer.name}</span>
                </label>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Opacite</span>
                    <span>{Math.round(state.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(state.opacity * 100)}
                    onChange={(event) => {
                      const opacity = Number(event.target.value) / 100;
                      setLayerStates((prev) => ({
                        ...prev,
                        [layer.id]: { visible: prev[layer.id]?.visible ?? layer.visible, opacity },
                      }));
                    }}
                    className="w-full"
                  />
                </div>
                <div className="text-[11px] text-muted-foreground">Type: {layer.kind} - Source: {layer.source_type}</div>
              </div>
            );
          })}
          {(product?.layers?.length ?? 0) === 0 && (
            <div className="rounded-md border p-2 text-xs text-muted-foreground">Aucun produit cartographique disponible pour ce filtre.</div>
          )}

          {mapType === "precip" && product && (
            <div className="space-y-2 rounded-md border p-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Echelle precipitations (mm)</div>
              <div className="flex items-center gap-3">
                <div
                  className="h-36 w-4 rounded"
                  style={{ background: "linear-gradient(0deg, #0ea53a 0%, #6ed40f 18%, #ffd000 40%, #ff7a00 58%, #ff2f2f 78%, #6a00ff 100%)" }}
                />
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  {[170, 120, 90, 60, 40, 30, 20, 15, 10, 5, 2, 0.5, 0.1].map((v) => (
                    <div key={v}>{v} mm</div>
                  ))}
                </div>
              </div>
              <div className="space-y-1 rounded border p-2 text-[11px]">
                <div>Date: {new Date(product.acquisition_end).toLocaleString("fr-FR")}</div>
                <div>Source: {product.meta?.source ?? "ECMWF"}</div>
                <div>Resolution: {product.meta?.resolution ?? "0.1 deg - 24h"}</div>
                <div>Raster: {product.meta?.tiff_file ?? "--"}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {legend.length > 0 && (
        <div className="absolute bottom-3 left-3 z-20 rounded-md border bg-background/95 p-3 shadow">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Legende</div>
          <div className="space-y-1">
            {legend.map((item, index) => (
              <div key={`${item.label}-${index}`} className="flex items-center gap-2 text-xs">
                <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
