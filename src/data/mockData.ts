// ── Types ──────────────────────────────────────────────────────────────

export interface Basin {
  id: string;
  code: number;
  name: string;
  level: number;
  parent_basin_id: string | null;
  geometry: { type: "Polygon"; coordinates: number[][][] };
  color: string;
}

export interface Station {
  id: string;
  code: string;
  name: string;
  basin_id: string;
  lat: number;
  lon: number;
  type: "station" | "barrage" | "result_point";
  active: boolean;
}

export interface Dam {
  id: string;
  name: string;
  station_id: string; // links to station of type barrage
  basin_id: string;
  lat: number;
  lon: number;
  capacity: number;
  current_volume: number;
}

export interface Variable {
  code: string;
  label: string;
  unit: string;
  is_cumulative: boolean;
}

export interface Source {
  code: string;
  label: string;
  type: "observed" | "simulated";
  horizon?: string;
}

export interface Run {
  id: string;
  source_code: string;
  run_time: string;
  label: string;
  horizon: string;
  status: string;
}

export interface TimeseriesPoint {
  date: string;
  value: number;
}

export interface Alert {
  id: string;
  entity_type: "station" | "dam" | "basin";
  entity_id: string;
  entity_name: string;
  status: "safe" | "warning" | "critical";
  message: string;
  reason?: string;
}

// ── Thresholds ─────────────────────────────────────────────────────────

export const thresholds = { safe: 60, warning: 30 };

// ── Mock reference data ────────────────────────────────────────────────

export const mockVariables: Variable[] = [
  { code: "precip_mm", label: "Précipitation", unit: "mm", is_cumulative: true },
  { code: "debit_m3s", label: "Débit", unit: "m³/s", is_cumulative: false },
  { code: "volume_hm3", label: "Volume", unit: "hm³", is_cumulative: false },
  { code: "apport_hm3", label: "Apport", unit: "hm³", is_cumulative: true },
  { code: "lacher_m3s", label: "Lâcher", unit: "m³/s", is_cumulative: false },
];

export const mockSources: Source[] = [
  { code: "OBS", label: "Observé", type: "observed" },
  { code: "AROME", label: "AROME (4j)", type: "simulated", horizon: "96h" },
  { code: "ECMWF", label: "ECMWF (12j)", type: "simulated", horizon: "288h" },
  { code: "HEC_HMS", label: "HEC-HMS", type: "simulated", horizon: "72h" },
  { code: "ABHS_RES", label: "ABHS Réservoir", type: "simulated" },
];

export function mockRuns(source_code?: string): Run[] {
  const now = new Date();
  const all: Run[] = [
    { id: "run-obs-latest", source_code: "OBS", run_time: new Date(now.getTime() - 1800000).toISOString(), label: "OBS temps réel", horizon: "-", status: "ok" },
    { id: "run-arome-00z", source_code: "AROME", run_time: new Date(now.setHours(0, 0, 0, 0)).toISOString(), label: "AROME 00Z", horizon: "96h", status: "ok" },
    { id: "run-arome-12z", source_code: "AROME", run_time: new Date(new Date().setHours(12, 0, 0, 0) - 86400000).toISOString(), label: "AROME 12Z J-1", horizon: "96h", status: "ok" },
    { id: "run-ecmwf-00z", source_code: "ECMWF", run_time: new Date(now).toISOString(), label: "ECMWF 00Z", horizon: "288h", status: "ok" },
    { id: "run-ecmwf-12z", source_code: "ECMWF", run_time: new Date(Date.now() - 86400000).toISOString(), label: "ECMWF 12Z J-1", horizon: "288h", status: "ok" },
    { id: "run-hec-1", source_code: "HEC_HMS", run_time: new Date(Date.now() - 3600000).toISOString(), label: "HEC-HMS auto", horizon: "72h", status: "ok" },
  ];
  return source_code ? all.filter((r) => r.source_code === source_code) : all;
}

// ── Basins (Sebou focus) ───────────────────────────────────────────────

export const basins: Basin[] = [
  {
    id: "basin-sebou", code: 1, name: "Sebou", level: 1, parent_basin_id: null, color: "#06b6d4",
    geometry: { type: "Polygon", coordinates: [[[-5.8, 33.4], [-3.8, 33.4], [-3.8, 34.9], [-5.8, 34.9], [-5.8, 33.4]]] },
  },
  {
    id: "basin-oergha", code: 2, name: "Ouergha", level: 2, parent_basin_id: "basin-sebou", color: "#3b82f6",
    geometry: { type: "Polygon", coordinates: [[[-5.6, 34.0], [-4.5, 34.0], [-4.5, 34.8], [-5.6, 34.8], [-5.6, 34.0]]] },
  },
  {
    id: "basin-haut-sebou", code: 3, name: "Haut Sebou", level: 2, parent_basin_id: "basin-sebou", color: "#8b5cf6",
    geometry: { type: "Polygon", coordinates: [[[-5.0, 33.4], [-3.9, 33.4], [-3.9, 34.1], [-5.0, 34.1], [-5.0, 33.4]]] },
  },
  {
    id: "basin-beht", code: 4, name: "Beht", level: 2, parent_basin_id: "basin-sebou", color: "#10b981",
    geometry: { type: "Polygon", coordinates: [[[-6.2, 33.2], [-5.4, 33.2], [-5.4, 33.9], [-6.2, 33.9], [-6.2, 33.2]]] },
  },
];

// ── Stations ───────────────────────────────────────────────────────────

export const stations: Station[] = [
  { id: "st-1", code: "S001", name: "Azrou", basin_id: "basin-haut-sebou", lat: 33.44, lon: -5.22, type: "station", active: true },
  { id: "st-2", code: "S002", name: "Fès Saiss", basin_id: "basin-sebou", lat: 34.03, lon: -5.00, type: "station", active: true },
  { id: "st-3", code: "S003", name: "Ain Louali", basin_id: "basin-oergha", lat: 34.35, lon: -4.50, type: "station", active: true },
  { id: "st-4", code: "S004", name: "M'Jara", basin_id: "basin-oergha", lat: 34.55, lon: -5.10, type: "station", active: true },
  { id: "st-5", code: "S005", name: "Pont du Sebou", basin_id: "basin-sebou", lat: 34.25, lon: -4.90, type: "station", active: true },
  { id: "st-6", code: "S006", name: "Dar El Arsa", basin_id: "basin-oergha", lat: 34.40, lon: -4.80, type: "station", active: true },
  { id: "st-7", code: "S007", name: "Bab Ouender", basin_id: "basin-haut-sebou", lat: 33.90, lon: -4.30, type: "station", active: true },
  { id: "st-8", code: "S008", name: "Sidi Kacem", basin_id: "basin-beht", lat: 34.22, lon: -5.71, type: "station", active: true },
  // Barrages as stations
  { id: "st-dam-1", code: "D001", name: "Al Wahda", basin_id: "basin-oergha", lat: 34.65, lon: -5.45, type: "barrage", active: true },
  { id: "st-dam-2", code: "D002", name: "Idriss 1er", basin_id: "basin-sebou", lat: 34.08, lon: -4.62, type: "barrage", active: true },
  { id: "st-dam-3", code: "D003", name: "Allal El Fassi", basin_id: "basin-haut-sebou", lat: 33.70, lon: -4.95, type: "barrage", active: true },
];

// ── Dams ───────────────────────────────────────────────────────────────

export const dams: Dam[] = [
  { id: "dam-1", name: "Al Wahda", station_id: "st-dam-1", basin_id: "basin-oergha", lat: 34.65, lon: -5.45, capacity: 3800, current_volume: 2660 },
  { id: "dam-2", name: "Idriss 1er", station_id: "st-dam-2", basin_id: "basin-sebou", lat: 34.08, lon: -4.62, capacity: 1200, current_volume: 420 },
  { id: "dam-3", name: "Allal El Fassi", station_id: "st-dam-3", basin_id: "basin-haut-sebou", lat: 33.70, lon: -4.95, capacity: 81, current_volume: 62 },
];

// ── Helpers ────────────────────────────────────────────────────────────

export function getDamStatus(dam: Dam): "safe" | "warning" | "critical" {
  const pct = (dam.current_volume / dam.capacity) * 100;
  if (pct >= thresholds.safe) return "safe";
  if (pct >= thresholds.warning) return "warning";
  return "critical";
}

export function getDamFillPct(dam: Dam): number {
  return Math.round((dam.current_volume / dam.capacity) * 100);
}

export function getDamRecommendation(dam: Dam): string {
  const pct = getDamFillPct(dam);
  if (pct > 90) return "⚠️ Prévoir lâcher préventif — remplissage très élevé avec apports prévus importants.";
  if (pct > 75) return "Surveiller l'évolution — envisager régulation si apports 72h restent élevés.";
  if (pct < 30) return "🔴 Remplissage critique — limiter les lâchers, prioriser la rétention.";
  if (pct < 50) return "Remplissage modéré — maintenir débit régulé standard.";
  return "✅ Situation normale — aucune action requise.";
}

export function getBasinName(basinId: string): string {
  return basins.find((b) => b.id === basinId)?.name ?? basinId;
}

// ── Timeseries generator (multi-source) ────────────────────────────────

export function generateTimeseries(
  days = 30, baseValue = 50, variance = 20, seed = 0
): TimeseriesPoint[] {
  const data: TimeseriesPoint[] = [];
  const now = new Date();
  for (let i = days * 24; i >= 0; i -= 6) {
    const date = new Date(now.getTime() - i * 3600000);
    const val = baseValue + Math.sin((i + seed) / 24) * variance + Math.sin((i + seed) * 0.7) * variance * 0.3;
    data.push({ date: date.toISOString(), value: Math.max(0, Math.round(val * 10) / 10) });
  }
  return data;
}

/** Generate mock multi-source series for overlay charts */
export function generateMultiSourceSeries(
  stationId: string,
  variableCode: string,
  sourceCodes: string[] = ["OBS", "AROME", "ECMWF"]
): Record<string, TimeseriesPoint[]> {
  const seed = stationId.charCodeAt(stationId.length - 1) || 0;
  const varSeed = variableCode.charCodeAt(0) || 0;
  const result: Record<string, TimeseriesPoint[]> = {};

  const horizonDays: Record<string, number> = {
    OBS: 14,
    AROME: 4,
    ECMWF: 12,
    HEC_HMS: 3,
    ABHS_RES: 7,
  };

  sourceCodes.forEach((src, i) => {
    const days = horizonDays[src] || 7;
    const base = variableCode === "precip_mm" ? 8 : variableCode === "debit_m3s" ? 45 : 30;
    const v = variableCode === "precip_mm" ? 12 : 18;
    result[src] = generateTimeseries(days, base + i * 3, v, seed + varSeed + i * 7);
  });

  return result;
}

// ── Alerts ──────────────────────────────────────────────────────────────

export function getAlerts(): Alert[] {
  const damAlerts: Alert[] = dams.map((dam) => {
    const status = getDamStatus(dam);
    const pct = getDamFillPct(dam);
    let message = "";
    let reason = "";
    if (status === "critical") {
      message = `Remplissage critique (${pct}%)`;
      reason = "fill_pct < 30%";
    } else if (status === "warning") {
      message = `Remplissage modéré (${pct}%)`;
      reason = "30% ≤ fill_pct < 60%";
    } else {
      message = `Remplissage normal (${pct}%)`;
      reason = "fill_pct ≥ 60%";
    }
    return { id: `alert-${dam.id}`, entity_type: "dam" as const, entity_id: dam.id, entity_name: dam.name, status, message, reason };
  });

  const stationAlerts: Alert[] = stations
    .filter((s) => s.type === "station")
    .slice(0, 3)
    .map((st, i) => ({
      id: `alert-${st.id}`,
      entity_type: "station" as const,
      entity_id: st.id,
      entity_name: st.name,
      status: (i === 0 ? "critical" : "warning") as "critical" | "warning",
      message: i === 0 ? "Cumul pluie 72h > seuil alerte" : "Débit anormalement élevé",
      reason: i === 0 ? "precip_cumul_72h > 80mm" : "debit > Q90",
    }));

  return [...damAlerts, ...stationAlerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, safe: 2 };
    return order[a.status] - order[b.status];
  });
}
