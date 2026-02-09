import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { basins, stations, dams, getDamStatus } from "@/data/mockData";

interface Props {
  onSelectEntity?: (type: string, id: string) => void;
}

const statusColors = { safe: "#22c55e", warning: "#f59e0b", critical: "#ef4444" };

export function HydroMap({ onSelectEntity }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8 as const,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [-6.5, 32.5],
      zoom: 5.5,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      // Basins
      map.addSource("basins", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: basins.map((b) => ({
            type: "Feature" as const,
            properties: { id: b.id, name: b.name, color: b.color },
            geometry: b.geometry,
          })),
        },
      });
      map.addLayer({ id: "basins-fill", type: "fill", source: "basins", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.12 } });
      map.addLayer({ id: "basins-line", type: "line", source: "basins", paint: { "line-color": ["get", "color"], "line-width": 2, "line-opacity": 0.6 } });

      // Stations
      map.addSource("stations", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: stations.map((s) => ({
            type: "Feature" as const,
            properties: { id: s.id, name: s.name, type: s.type },
            geometry: { type: "Point" as const, coordinates: [s.lon, s.lat] },
          })),
        },
      });
      map.addLayer({
        id: "stations-circles", type: "circle", source: "stations",
        paint: { "circle-radius": 6, "circle-color": "#3b82f6", "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" },
      });

      // Dams
      map.addSource("dams", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: dams.map((d) => ({
            type: "Feature" as const,
            properties: { id: d.id, name: d.name, color: statusColors[getDamStatus(d)] },
            geometry: { type: "Point" as const, coordinates: [d.lon, d.lat] },
          })),
        },
      });
      map.addLayer({
        id: "dams-circles", type: "circle", source: "dams",
        paint: { "circle-radius": 9, "circle-color": ["get", "color"], "circle-stroke-width": 2.5, "circle-stroke-color": "#ffffff" },
      });

      // Click handlers
      const handleClick = (layerId: string, entityType: string) => {
        map.on("click", layerId, (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (id) onSelectEntity?.(entityType, id);
        });
        map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
      };
      handleClick("stations-circles", "station");
      handleClick("dams-circles", "dam");

      // Hover popups
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
      map.on("mouseenter", "stations-circles", (e) => {
        const p = e.features?.[0]?.properties;
        if (p) popup.setLngLat(e.lngLat).setHTML(`<strong>${p.name}</strong><br/><small>${p.type}</small>`).addTo(map);
      });
      map.on("mouseleave", "stations-circles", () => popup.remove());

      const popup2 = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
      map.on("mouseenter", "dams-circles", (e) => {
        const p = e.features?.[0]?.properties;
        if (p) popup2.setLngLat(e.lngLat).setHTML(`<strong>🏗 ${p.name}</strong>`).addTo(map);
      });
      map.on("mouseleave", "dams-circles", () => popup2.remove());
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [onSelectEntity]);

  return <div ref={containerRef} className="w-full h-full rounded-lg" />;
}
