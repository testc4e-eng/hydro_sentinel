export type ThematicMapType = "flood" | "snow" | "precip";

export interface SurfaceStat {
  m2: number;
  km2: number;
  hectares: number;
  percentage: number;
}

export interface MapStatistics {
  positive_class_label: string;
  negative_class_label: string;
  positive_class: SurfaceStat;
  negative_class: SurfaceStat;
  total_area_m2: number;
}

export interface LegendItem {
  label: string;
  color: string;
}

export interface MapLayer {
  id: string;
  name: string;
  kind: "raster" | "binary_mask" | "reference" | "vector";
  source_type: "xyz" | "geojson";
  visible: boolean;
  opacity: number;
  asset_path?: string;
  alternate_asset_path?: string;
  tiles?: string[];
  geojson?: Record<string, unknown>;
  paint?: Record<string, string | number | boolean>;
  legend?: LegendItem[];
  minzoom?: number;
  maxzoom?: number;
}

export interface ProcessingStep {
  id: string;
  label: string;
  description: string;
}

export interface ThematicMapProduct {
  id: string;
  event_name: string;
  acquisition_start: string;
  acquisition_end: string;
  published_at: string;
  satellite: string;
  status: string;
  bbox: [number, number, number, number];
  statistics: MapStatistics;
  layers: MapLayer[];
  meta?: {
    precip_mean_mm?: number;
    precip_cum_mm?: number;
    dominant_level?: string;
    source?: string;
    resolution?: string;
    color_scale_min_mm?: number;
    color_scale_max_mm?: number;
    tiff_file?: string;
  };
}

export interface ThematicMapProductSummary {
  id: string;
  event_name: string;
  acquisition_start: string;
  acquisition_end: string;
  published_at: string;
  satellite: string;
  status: string;
  statistics: MapStatistics;
}

export interface ThematicMapCatalog {
  map_type: ThematicMapType;
  title: string;
  description: string;
  processing_chain: ProcessingStep[];
  latest_product_id?: string | null;
  products: ThematicMapProductSummary[];
}
