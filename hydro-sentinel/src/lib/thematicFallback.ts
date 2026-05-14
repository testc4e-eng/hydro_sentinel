import type {
  ProcessingStep,
  ThematicMapCatalog,
  ThematicMapProduct,
  ThematicMapProductSummary,
  ThematicMapType,
} from "@/types/thematicMaps";

interface FallbackDataset {
  map_type: ThematicMapType;
  title: string;
  description: string;
  processing_chain: ProcessingStep[];
  products: ThematicMapProduct[];
}

type Coordinate = [number, number];

function roundCoord(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function seededNoise(seed: number): number {
  const raw = Math.sin(seed * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

function makeSquareCell(center: Coordinate, sizeDeg: number): Coordinate[] {
  const [lon, lat] = center;
  const half = sizeDeg / 2;
  const p1: Coordinate = [roundCoord(lon - half), roundCoord(lat - half)];
  const p2: Coordinate = [roundCoord(lon + half), roundCoord(lat - half)];
  const p3: Coordinate = [roundCoord(lon + half), roundCoord(lat + half)];
  const p4: Coordinate = [roundCoord(lon - half), roundCoord(lat + half)];
  return [p1, p2, p3, p4, p1];
}

function buildPatchMaskGeojson(
  className: string,
  route: Coordinate[],
  options: { stepDeg: number; radiusCells: number; keepBase: number; seed: number },
): Record<string, unknown> {
  const features: Record<string, unknown>[] = [];

  for (let c = 0; c < route.length; c += 1) {
    const [baseLon, baseLat] = route[c];
    for (let dx = -options.radiusCells; dx <= options.radiusCells; dx += 1) {
      for (let dy = -options.radiusCells; dy <= options.radiusCells; dy += 1) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > options.radiusCells + 0.35) continue;

        const proximity = 1 - distance / (options.radiusCells + 0.4);
        const keepThreshold = options.keepBase + (1 - proximity) * 0.35;

        const n = seededNoise(options.seed + c * 97 + dx * 37 + dy * 53);
        if (n < keepThreshold) continue;

        const lonJitter = (seededNoise(options.seed + c * 131 + dx * 17 + dy * 19) - 0.5) * options.stepDeg * 0.35;
        const latJitter = (seededNoise(options.seed + c * 173 + dx * 23 + dy * 29) - 0.5) * options.stepDeg * 0.35;

        const center: Coordinate = [
          roundCoord(baseLon + dx * options.stepDeg + lonJitter),
          roundCoord(baseLat + dy * options.stepDeg + latJitter),
        ];

        features.push({
          type: "Feature",
          properties: { class: className },
          geometry: {
            type: "Polygon",
            coordinates: [makeSquareCell(center, options.stepDeg * 0.8)],
          },
        });
      }
    }
  }

  return { type: "FeatureCollection", features };
}

function buildAoiGeojson(minLon: number, minLat: number, maxLon: number, maxLat: number): Record<string, unknown> {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { class: "aoi" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [minLon, minLat],
              [maxLon, minLat],
              [maxLon, maxLat],
              [minLon, maxLat],
              [minLon, minLat],
            ],
          ],
        },
      },
    ],
  };
}

const floodMaskMainGeojson = buildPatchMaskGeojson(
  "water",
  [
    [-5.82, 34.75],
    [-5.77, 34.71],
    [-5.72, 34.67],
    [-5.66, 34.63],
    [-5.6, 34.59],
    [-5.54, 34.55],
    [-5.48, 34.5],
    [-5.42, 34.45],
    [-5.35, 34.39],
    [-5.28, 34.34],
    [-5.21, 34.29],
    [-5.13, 34.24],
    [-5.04, 34.19],
    [-4.95, 34.15],
    [-4.86, 34.12],
  ],
  { stepDeg: 0.014, radiusCells: 2, keepBase: 0.44, seed: 101 },
);

const floodMaskSecondaryGeojson = buildPatchMaskGeojson(
  "water",
  [
    [-5.79, 34.7],
    [-5.72, 34.66],
    [-5.66, 34.62],
    [-5.59, 34.58],
    [-5.53, 34.53],
    [-5.46, 34.48],
    [-5.39, 34.43],
    [-5.31, 34.37],
    [-5.23, 34.31],
    [-5.14, 34.26],
    [-5.05, 34.22],
  ],
  { stepDeg: 0.014, radiusCells: 2, keepBase: 0.5, seed: 131 },
);

const floodAoiGeojson = buildAoiGeojson(-5.98, 34.03, -4.83, 34.92);

const snowMaskMainGeojson = buildPatchMaskGeojson(
  "snow",
  [
    [-5.31, 34.03],
    [-5.23, 34.01],
    [-5.16, 33.98],
    [-5.08, 33.95],
    [-5.0, 33.92],
    [-4.91, 33.89],
    [-4.82, 33.86],
    [-4.73, 33.84],
    [-4.94, 34.13],
    [-4.86, 34.1],
    [-4.78, 34.06],
    [-4.7, 34.01],
  ],
  { stepDeg: 0.013, radiusCells: 2, keepBase: 0.46, seed: 211 },
);

const snowMaskSecondaryGeojson = buildPatchMaskGeojson(
  "snow",
  [
    [-5.28, 33.97],
    [-5.2, 33.94],
    [-5.12, 33.91],
    [-5.03, 33.87],
    [-4.95, 33.84],
    [-4.87, 33.81],
    [-4.79, 33.78],
    [-4.71, 33.75],
  ],
  { stepDeg: 0.013, radiusCells: 2, keepBase: 0.52, seed: 241 },
);

const snowAoiGeojson = buildAoiGeojson(-5.46, 33.66, -4.56, 34.19);
const precipAoiGeojson = buildAoiGeojson(-6.65, 33.1, -3.55, 35.95);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildPrecipPointGeojson(seed: number, peakMm: number): Record<string, unknown> {
  const basePoints: Coordinate[] = [
    [-6.2, 34.7],
    [-6.0, 34.62],
    [-5.85, 34.56],
    [-5.72, 34.52],
    [-5.58, 34.48],
    [-5.42, 34.42],
    [-5.24, 34.36],
    [-5.04, 34.3],
    [-4.85, 34.22],
    [-4.66, 34.14],
    [-4.46, 34.04],
    [-4.28, 33.96],
    [-4.1, 33.9],
    [-5.92, 34.38],
    [-5.73, 34.3],
    [-5.54, 34.22],
    [-5.36, 34.16],
    [-5.18, 34.08],
    [-5.0, 34.0],
    [-4.82, 33.92],
    [-4.64, 33.84],
  ];

  return {
    type: "FeatureCollection",
    features: basePoints.map((point, idx) => {
      const lonNudge = (seededNoise(seed * 131 + idx * 17) - 0.5) * 0.11;
      const latNudge = (seededNoise(seed * 157 + idx * 23) - 0.5) * 0.09;
      const noise = seededNoise(seed * 199 + idx * 29);
      const intensity = clamp(peakMm * (0.16 + noise * 0.95), 0.1, 170);
      return {
        type: "Feature",
        properties: {
          intensity: Math.round(intensity * 10) / 10,
        },
        geometry: {
          type: "Point",
          coordinates: [roundCoord(point[0] + lonNudge), roundCoord(point[1] + latNudge)],
        },
      };
    }),
  };
}

const processingChainBase: ProcessingStep[] = [
  {
    id: "acquisition",
    label: "Acquisition images satellites",
    description: "Import des scenes Sentinel/Landsat sur la zone d'etude.",
  },
  {
    id: "preprocessing",
    label: "Pretraitement",
    description: "Correction geometrique, correction radiometrique, masque nuages.",
  },
  {
    id: "classification",
    label: "Extraction de l'information",
    description: "Classification binaire de la classe cible et de sa classe opposee.",
  },
  {
    id: "raster_generation",
    label: "Generation raster",
    description: "Creation du raster thematique georeference.",
  },
  {
    id: "mask_generation",
    label: "Generation masque binaire",
    description: "Creation du masque binaire positif/negatif.",
  },
  {
    id: "map_rendering",
    label: "Affichage cartographique",
    description: "Publication des couches raster et masques dans l'interface.",
  },
  {
    id: "surface_stats",
    label: "Calcul statistiques de surface",
    description: "Calcul automatique des surfaces m2, km2, ha et pourcentages.",
  },
];

const precipTimeline = [
  { date: "2026-03-26", cum: 45.8, mean: 12.1, peak: 52.3, dominant: "Forte pluie localisee" },
  { date: "2026-03-27", cum: 31.6, mean: 8.7, peak: 38.4, dominant: "Pluie moderee" },
  { date: "2026-03-28", cum: 68.9, mean: 17.2, peak: 73.0, dominant: "Episode intense" },
  { date: "2026-03-29", cum: 55.2, mean: 14.3, peak: 61.1, dominant: "Episode soutenu" },
  { date: "2026-03-30", cum: 42.7, mean: 11.2, peak: 47.9, dominant: "Pluie moderee" },
  { date: "2026-03-31", cum: 26.4, mean: 7.4, peak: 31.5, dominant: "Faible a moderee" },
  { date: "2026-04-01", cum: 52.1, mean: 13.4, peak: 57.8, dominant: "Pluie soutenue" },
  { date: "2026-04-02", cum: 49.3, mean: 12.9, peak: 55.2, dominant: "Pluie soutenue" },
  { date: "2026-04-03", cum: 38.7, mean: 10.3, peak: 42.6, dominant: "Pluie moderee" },
  { date: "2026-04-04", cum: 24.8, mean: 6.8, peak: 29.3, dominant: "Faible a moderee" },
  { date: "2026-04-05", cum: 18.7, mean: 5.1, peak: 22.4, dominant: "Faible pluie" },
  { date: "2026-04-06", cum: 34.6, mean: 9.4, peak: 39.2, dominant: "Pluie moderee" },
  { date: "2026-04-07", cum: 39.1, mean: 10.0, peak: 43.7, dominant: "Pluie moderee" },
  { date: "2026-04-08", cum: 28.9, mean: 7.6, peak: 33.0, dominant: "Faible a moderee" },
  { date: "2026-04-09", cum: 20.1, mean: 5.8, peak: 24.9, dominant: "Faible pluie" },
  { date: "2026-04-10", cum: 12.6, mean: 3.5, peak: 17.2, dominant: "Tres faible pluie" },
];

const precipTotalAreaKm2 = 40026.67;
const precipProducts: ThematicMapProduct[] = precipTimeline.map((item, index) => {
  const parsed = new Date(`${item.date}T00:00:00Z`);
  const displayDate = parsed.toLocaleDateString("fr-FR");
  const eventName = `Precipitation detectee le ${displayDate} : ${item.peak.toFixed(1)} mm`;
  const positiveKm2 = 14600 + index * 240;
  const positivePct = clamp((positiveKm2 / precipTotalAreaKm2) * 100, 1.5, 95);
  const negativeKm2 = Math.max(precipTotalAreaKm2 - positiveKm2, 0);

  return {
    id: `precip-demo-${item.date}`,
    event_name: eventName,
    acquisition_start: `${item.date}T00:00:00Z`,
    acquisition_end: `${item.date}T23:00:00Z`,
    published_at: `${item.date}T23:20:00Z`,
    satellite: "ECMWF",
    status: "ready",
    bbox: [-6.65, 33.1, -3.55, 35.95],
    statistics: {
      positive_class_label: "Zone pluie > 0.1 mm",
      negative_class_label: "Zone pluie < 0.1 mm",
      positive_class: {
        m2: positiveKm2 * 1_000_000,
        km2: positiveKm2,
        hectares: positiveKm2 * 100,
        percentage: positivePct,
      },
      negative_class: {
        m2: negativeKm2 * 1_000_000,
        km2: negativeKm2,
        hectares: negativeKm2 * 100,
        percentage: Math.max(0, 100 - positivePct),
      },
      total_area_m2: precipTotalAreaKm2 * 1_000_000,
    },
    layers: [
      {
        id: `precip-intensity-${item.date}`,
        name: "Raster precipitation 24h (ECMWF)",
        kind: "vector",
        source_type: "geojson",
        visible: true,
        opacity: 0.72,
        asset_path: `/thematic/precipitation/geojson/ecmwf_24h_${item.date}.geojson`,
        alternate_asset_path: `/thematic/precipitation/geojson/ecmwf_24h_${item.date}_cells.geojson`,
        legend: [
          { label: "Classe 1", color: "#1b8f2b" },
          { label: "Classe 2", color: "#2fa134" },
          { label: "Classe 3", color: "#58bb2d" },
          { label: "Classe 4", color: "#84cf2f" },
          { label: "Classe 5", color: "#b5dd2f" },
          { label: "Classe 6", color: "#e0e536" },
          { label: "Classe 7", color: "#f4d331" },
          { label: "Classe 8", color: "#f7b42c" },
          { label: "Classe 9", color: "#f78626" },
          { label: "Classe 10", color: "#f05522" },
        ],
      },
      {
        id: `precip-aoi-${item.date}`,
        name: "Zone d'analyse (AOI)",
        kind: "reference",
        source_type: "geojson",
        visible: true,
        opacity: 0,
        paint: { fillColor: "#000000", outlineColor: "#ef4444" },
        legend: [{ label: "Cadre AOI", color: "#ef4444" }],
        geojson: precipAoiGeojson,
      },
    ],
    meta: {
      precip_mean_mm: item.mean,
      precip_cum_mm: item.cum,
      dominant_level: item.dominant,
      source: "ECMWF",
      resolution: "0.1 deg - 24h",
      color_scale_min_mm: 0.1,
      color_scale_max_mm: 170,
      tiff_file: `/thematic/precipitation/ecmwf_24h_${item.date}.tif`,
    },
  };
});

const fallbackDatasets: Record<ThematicMapType, FallbackDataset> = {
  flood: {
    map_type: "flood",
    title: "Carte inondation",
    description: "Donnees de demonstration - zones inondees/non inondees, historique et statistiques.",
    processing_chain: processingChainBase,
    products: [
      {
        id: "flood-demo-2026-03-06",
        event_name: "Crue Sebou mars 2026",
        acquisition_start: "2026-03-05T10:12:00Z",
        acquisition_end: "2026-03-06T10:12:00Z",
        published_at: "2026-03-06T14:30:00Z",
        satellite: "Sentinel-1A",
        status: "ready",
        bbox: [-6.2, 33.9, -4.2, 35.2],
        statistics: {
          positive_class_label: "Eau",
          negative_class_label: "Non eau",
          positive_class: {
            m2: 48600000,
            km2: 48.6,
            hectares: 4860,
            percentage: 27,
          },
          negative_class: {
            m2: 131400000,
            km2: 131.4,
            hectares: 13140,
            percentage: 73,
          },
          total_area_m2: 180000000,
        },
        layers: [
          {
            id: "flood-mask-water-demo",
            name: "Masque eau",
            kind: "binary_mask",
            source_type: "geojson",
            visible: true,
            opacity: 0.7,
            paint: { fillColor: "#2563eb", outlineColor: "#1e40af" },
            legend: [{ label: "Zones inondees", color: "#2563eb" }],
            geojson: floodMaskMainGeojson,
          },
          {
            id: "flood-aoi-demo",
            name: "Zone d'analyse (AOI)",
            kind: "reference",
            source_type: "geojson",
            visible: true,
            opacity: 0,
            paint: { fillColor: "#000000", outlineColor: "#ef4444" },
            legend: [{ label: "Cadre AOI", color: "#ef4444" }],
            geojson: floodAoiGeojson,
          },
          {
            id: "flood-raster-demo",
            name: "Raster inondation",
            kind: "raster",
            source_type: "xyz",
            visible: false,
            opacity: 0.35,
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            legend: [{ label: "Raster resultat", color: "#60a5fa" }],
          },
          {
            id: "flood-rain-intensity-demo",
            name: "Pluie 24h (demo)",
            kind: "vector",
            source_type: "geojson",
            visible: false,
            opacity: 0.62,
            legend: [{ label: "Intensite pluie", color: "#38bdf8" }],
            geojson: {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: { intensity: 16 },
                  geometry: { type: "Point", coordinates: [-5.84, 34.79] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 24 },
                  geometry: { type: "Point", coordinates: [-5.72, 34.77] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 31 },
                  geometry: { type: "Point", coordinates: [-5.61, 34.71] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 27 },
                  geometry: { type: "Point", coordinates: [-5.5, 34.66] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 22 },
                  geometry: { type: "Point", coordinates: [-5.38, 34.58] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 18 },
                  geometry: { type: "Point", coordinates: [-5.26, 34.52] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 16 },
                  geometry: { type: "Point", coordinates: [-5.15, 34.44] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 14 },
                  geometry: { type: "Point", coordinates: [-5.04, 34.36] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 12 },
                  geometry: { type: "Point", coordinates: [-4.93, 34.28] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 10 },
                  geometry: { type: "Point", coordinates: [-4.85, 34.2] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 20 },
                  geometry: { type: "Point", coordinates: [-5.31, 34.3] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 26 },
                  geometry: { type: "Point", coordinates: [-5.45, 34.39] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 29 },
                  geometry: { type: "Point", coordinates: [-5.58, 34.47] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 25 },
                  geometry: { type: "Point", coordinates: [-5.69, 34.56] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 8 },
                  geometry: { type: "Point", coordinates: [-4.76, 34.15] },
                },
              ],
            },
          },
        ],
      },
      {
        id: "flood-demo-2026-02-20",
        event_name: "Episode pluvieux fevrier 2026",
        acquisition_start: "2026-02-19T10:15:00Z",
        acquisition_end: "2026-02-20T10:15:00Z",
        published_at: "2026-02-20T16:00:00Z",
        satellite: "Sentinel-1A",
        status: "ready",
        bbox: [-6.2, 33.9, -4.2, 35.2],
        statistics: {
          positive_class_label: "Eau",
          negative_class_label: "Non eau",
          positive_class: {
            m2: 30240000,
            km2: 30.24,
            hectares: 3024,
            percentage: 18,
          },
          negative_class: {
            m2: 137760000,
            km2: 137.76,
            hectares: 13776,
            percentage: 82,
          },
          total_area_m2: 168000000,
        },
        layers: [
          {
            id: "flood-mask-water-demo-2",
            name: "Masque eau",
            kind: "binary_mask",
            source_type: "geojson",
            visible: true,
            opacity: 0.62,
            paint: { fillColor: "#1d4ed8", outlineColor: "#1e3a8a" },
            legend: [{ label: "Zones inondees", color: "#1d4ed8" }],
            geojson: floodMaskSecondaryGeojson,
          },
          {
            id: "flood-aoi-demo-2",
            name: "Zone d'analyse (AOI)",
            kind: "reference",
            source_type: "geojson",
            visible: true,
            opacity: 0,
            paint: { fillColor: "#000000", outlineColor: "#ef4444" },
            legend: [{ label: "Cadre AOI", color: "#ef4444" }],
            geojson: floodAoiGeojson,
          },
          {
            id: "flood-raster-demo-2",
            name: "Raster inondation",
            kind: "raster",
            source_type: "xyz",
            visible: false,
            opacity: 0.35,
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            legend: [{ label: "Raster resultat", color: "#3b82f6" }],
          },
        ],
      },
    ],
  },
  snow: {
    map_type: "snow",
    title: "Carte couverture de neige",
    description: "Donnees de demonstration - zones enneigees/non enneigees, historique et statistiques.",
    processing_chain: processingChainBase,
    products: [
      {
        id: "snow-demo-2026-02-26",
        event_name: "Episode neigeux fevrier 2026",
        acquisition_start: "2026-02-25T09:30:00Z",
        acquisition_end: "2026-02-26T09:30:00Z",
        published_at: "2026-02-26T12:15:00Z",
        satellite: "Sentinel-2A",
        status: "ready",
        bbox: [-5.8, 33.4, -4.1, 34.4],
        statistics: {
          positive_class_label: "Neige",
          negative_class_label: "Non neige",
          positive_class: {
            m2: 104000000,
            km2: 104,
            hectares: 10400,
            percentage: 40,
          },
          negative_class: {
            m2: 156000000,
            km2: 156,
            hectares: 15600,
            percentage: 60,
          },
          total_area_m2: 260000000,
        },
        layers: [
          {
            id: "snow-mask-demo",
            name: "Masque neige",
            kind: "binary_mask",
            source_type: "geojson",
            visible: true,
            opacity: 0.72,
            paint: { fillColor: "#f8fafc", outlineColor: "#94a3b8" },
            legend: [{ label: "Zones enneigees", color: "#f8fafc" }],
            geojson: snowMaskMainGeojson,
          },
          {
            id: "snow-aoi-demo",
            name: "Zone d'analyse (AOI)",
            kind: "reference",
            source_type: "geojson",
            visible: true,
            opacity: 0,
            paint: { fillColor: "#000000", outlineColor: "#ef4444" },
            legend: [{ label: "Cadre AOI", color: "#ef4444" }],
            geojson: snowAoiGeojson,
          },
          {
            id: "snow-raster-demo",
            name: "Raster couverture neigeuse",
            kind: "raster",
            source_type: "xyz",
            visible: false,
            opacity: 0.35,
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            legend: [{ label: "Raster resultat", color: "#e2e8f0" }],
          },
          {
            id: "snow-intensity-demo",
            name: "Intensite neige (demo)",
            kind: "vector",
            source_type: "geojson",
            visible: false,
            opacity: 0.68,
            legend: [{ label: "Intensite neige", color: "#bae6fd" }],
            geojson: {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: { intensity: 12 },
                  geometry: { type: "Point", coordinates: [-5.62, 34.2] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 16 },
                  geometry: { type: "Point", coordinates: [-5.48, 34.1] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 21 },
                  geometry: { type: "Point", coordinates: [-5.34, 34.02] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 28 },
                  geometry: { type: "Point", coordinates: [-5.18, 33.96] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 24 },
                  geometry: { type: "Point", coordinates: [-5.04, 33.9] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 18 },
                  geometry: { type: "Point", coordinates: [-4.9, 33.84] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 13 },
                  geometry: { type: "Point", coordinates: [-4.74, 33.78] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 11 },
                  geometry: { type: "Point", coordinates: [-4.58, 33.72] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 15 },
                  geometry: { type: "Point", coordinates: [-4.44, 33.68] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 19 },
                  geometry: { type: "Point", coordinates: [-4.32, 33.73] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 23 },
                  geometry: { type: "Point", coordinates: [-4.22, 33.82] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 27 },
                  geometry: { type: "Point", coordinates: [-4.14, 33.94] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 22 },
                  geometry: { type: "Point", coordinates: [-4.28, 34.08] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 17 },
                  geometry: { type: "Point", coordinates: [-4.46, 34.18] },
                },
                {
                  type: "Feature",
                  properties: { intensity: 14 },
                  geometry: { type: "Point", coordinates: [-4.66, 34.24] },
                },
              ],
            },
          },
        ],
      },
      {
        id: "snow-demo-2026-01-30",
        event_name: "Episode neigeux janvier 2026",
        acquisition_start: "2026-01-29T09:30:00Z",
        acquisition_end: "2026-01-30T09:30:00Z",
        published_at: "2026-01-30T12:10:00Z",
        satellite: "Sentinel-2A",
        status: "ready",
        bbox: [-5.8, 33.4, -4.1, 34.4],
        statistics: {
          positive_class_label: "Neige",
          negative_class_label: "Non neige",
          positive_class: {
            m2: 60000000,
            km2: 60,
            hectares: 6000,
            percentage: 25,
          },
          negative_class: {
            m2: 180000000,
            km2: 180,
            hectares: 18000,
            percentage: 75,
          },
          total_area_m2: 240000000,
        },
        layers: [
          {
            id: "snow-mask-demo-2",
            name: "Masque neige",
            kind: "binary_mask",
            source_type: "geojson",
            visible: true,
            opacity: 0.66,
            paint: { fillColor: "#f1f5f9", outlineColor: "#64748b" },
            legend: [{ label: "Zones enneigees", color: "#f1f5f9" }],
            geojson: snowMaskSecondaryGeojson,
          },
          {
            id: "snow-aoi-demo-2",
            name: "Zone d'analyse (AOI)",
            kind: "reference",
            source_type: "geojson",
            visible: true,
            opacity: 0,
            paint: { fillColor: "#000000", outlineColor: "#ef4444" },
            legend: [{ label: "Cadre AOI", color: "#ef4444" }],
            geojson: snowAoiGeojson,
          },
          {
            id: "snow-raster-demo-2",
            name: "Raster couverture neigeuse",
            kind: "raster",
            source_type: "xyz",
            visible: false,
            opacity: 0.35,
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            legend: [{ label: "Raster resultat", color: "#cbd5e1" }],
          },
        ],
      },
    ],
  },
  precip: {
    map_type: "precip",
    title: "Carte Precipitation",
    description: "Donnees de demonstration precipitation 24h ECMWF (historique glissant).",
    processing_chain: [
      {
        id: "acquisition-model",
        label: "Acquisition modeles meteo",
        description: "Recuperation des sorties ECMWF 24h pour la zone Sebou.",
      },
      {
        id: "harmonisation",
        label: "Harmonisation raster",
        description: "Normalisation de la grille et controle qualite des champs de pluie.",
      },
      {
        id: "colorization",
        label: "Colorisation intensite",
        description: "Application d'une palette pluie (vert -> jaune -> orange -> rouge -> violet).",
      },
      {
        id: "aoi-mask",
        label: "Masquage AOI",
        description: "Decoupage sur la zone d'analyse et publication cartographique.",
      },
      {
        id: "stats",
        label: "Calcul des indicateurs",
        description: "Calcul pluie moyenne/cumulee et surfaces impactees (km2/ha).",
      },
    ],
    products: precipProducts,
  },
};

function parseDate(value?: string): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function toSummary(product: ThematicMapProduct): ThematicMapProductSummary {
  return {
    id: product.id,
    event_name: product.event_name,
    acquisition_start: product.acquisition_start,
    acquisition_end: product.acquisition_end,
    published_at: product.published_at,
    satellite: product.satellite,
    status: product.status,
    statistics: product.statistics,
  };
}

function filterProducts(
  products: ThematicMapProduct[],
  params?: { event?: string; date_from?: string; date_to?: string },
): ThematicMapProduct[] {
  const event = params?.event?.trim().toLowerCase();
  const from = parseDate(params?.date_from);
  const to = parseDate(params?.date_to);

  return products
    .filter((product) => (event ? product.event_name.toLowerCase().includes(event) : true))
    .filter((product) => {
      const acquisitionStart = parseDate(product.acquisition_start);
      const acquisitionEnd = parseDate(product.acquisition_end);
      if (acquisitionStart === null || acquisitionEnd === null) return true;
      if (from !== null && acquisitionEnd < from) return false;
      if (to !== null && acquisitionStart > to) return false;
      return true;
    })
    .sort((a, b) => (parseDate(b.acquisition_end) ?? 0) - (parseDate(a.acquisition_end) ?? 0));
}

export function getFallbackCatalog(
  mapType: ThematicMapType,
  params?: { event?: string; date_from?: string; date_to?: string },
): ThematicMapCatalog {
  const dataset = fallbackDatasets[mapType];
  const products = filterProducts(dataset.products, params);
  const summaries = products.map(toSummary);

  return {
    map_type: dataset.map_type,
    title: dataset.title,
    description: dataset.description,
    processing_chain: dataset.processing_chain,
    latest_product_id: summaries[0]?.id ?? null,
    products: summaries,
  };
}

export function getFallbackHistory(
  mapType: ThematicMapType,
  params?: { event?: string; date_from?: string; date_to?: string },
): ThematicMapProductSummary[] {
  return filterProducts(fallbackDatasets[mapType].products, params).map(toSummary);
}

export function getFallbackProduct(mapType: ThematicMapType, productId: string): ThematicMapProduct {
  const dataset = fallbackDatasets[mapType];
  const product = dataset.products.find((item) => item.id === productId);
  if (!product) {
    throw new Error(`Fallback product not found: ${mapType}/${productId}`);
  }
  return product;
}
