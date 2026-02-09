export interface Basin {
  id: string;
  name: string;
  geometry: { type: "Polygon"; coordinates: number[][][] };
  color: string;
}

export interface Station {
  id: string;
  name: string;
  basin_id: string;
  lat: number;
  lon: number;
  type: string;
}

export interface Dam {
  id: string;
  name: string;
  basin_id: string;
  lat: number;
  lon: number;
  capacity: number;
  current_volume: number;
}

export interface TimeseriesPoint {
  date: string;
  value: number;
}

export interface Alert {
  id: string;
  entity_type: "station" | "dam";
  entity_id: string;
  entity_name: string;
  status: "safe" | "warning" | "critical";
  message: string;
}

export const thresholds = { safe: 60, warning: 30 };

export const basins: Basin[] = [
  {
    id: "basin-1", name: "Oum Er-Rbia", color: "#3b82f6",
    geometry: { type: "Polygon", coordinates: [[[-7.8, 31.8], [-6.0, 31.8], [-6.0, 33.2], [-7.8, 33.2], [-7.8, 31.8]]] },
  },
  {
    id: "basin-2", name: "Sebou", color: "#06b6d4",
    geometry: { type: "Polygon", coordinates: [[[-5.8, 33.6], [-4.0, 33.6], [-4.0, 34.8], [-5.8, 34.8], [-5.8, 33.6]]] },
  },
  {
    id: "basin-3", name: "Tensift", color: "#8b5cf6",
    geometry: { type: "Polygon", coordinates: [[[-9.2, 30.8], [-7.6, 30.8], [-7.6, 31.9], [-9.2, 31.9], [-9.2, 30.8]]] },
  },
];

export const stations: Station[] = [
  { id: "st-1", name: "Dechra El Oued", basin_id: "basin-1", lat: 32.5, lon: -6.9, type: "hydrométrique" },
  { id: "st-2", name: "Mechra Homadi", basin_id: "basin-1", lat: 32.8, lon: -6.3, type: "hydrométrique" },
  { id: "st-3", name: "Sidi Driss", basin_id: "basin-1", lat: 32.2, lon: -7.2, type: "pluviométrique" },
  { id: "st-4", name: "Azrou", basin_id: "basin-2", lat: 33.9, lon: -5.2, type: "hydrométrique" },
  { id: "st-5", name: "Fès Saiss", basin_id: "basin-2", lat: 34.0, lon: -5.0, type: "pluviométrique" },
  { id: "st-6", name: "Ain Louali", basin_id: "basin-2", lat: 34.3, lon: -4.5, type: "hydrométrique" },
  { id: "st-7", name: "Ourika", basin_id: "basin-3", lat: 31.3, lon: -7.9, type: "hydrométrique" },
  { id: "st-8", name: "Tahanaout", basin_id: "basin-3", lat: 31.3, lon: -8.0, type: "pluviométrique" },
  { id: "st-9", name: "Imi N'Tanout", basin_id: "basin-3", lat: 31.2, lon: -8.8, type: "hydrométrique" },
  { id: "st-10", name: "Chichaoua", basin_id: "basin-3", lat: 31.5, lon: -8.5, type: "pluviométrique" },
];

export const dams: Dam[] = [
  { id: "dam-1", name: "Al Wahda", basin_id: "basin-2", lat: 34.6, lon: -5.4, capacity: 3800, current_volume: 2660 },
  { id: "dam-2", name: "Bin el Ouidane", basin_id: "basin-1", lat: 32.1, lon: -6.5, capacity: 1500, current_volume: 420 },
  { id: "dam-3", name: "Al Massira", basin_id: "basin-1", lat: 32.5, lon: -7.5, capacity: 2700, current_volume: 1890 },
];

export function getDamStatus(dam: Dam): "safe" | "warning" | "critical" {
  const pct = (dam.current_volume / dam.capacity) * 100;
  if (pct >= thresholds.safe) return "safe";
  if (pct >= thresholds.warning) return "warning";
  return "critical";
}

export function getDamFillPct(dam: Dam): number {
  return Math.round((dam.current_volume / dam.capacity) * 100);
}

export function generateTimeseries(days = 30, baseValue = 50, variance = 20, seed = 0): TimeseriesPoint[] {
  const data: TimeseriesPoint[] = [];
  const now = new Date();
  for (let i = days * 24; i >= 0; i -= 6) {
    const date = new Date(now.getTime() - i * 3600000);
    const val = baseValue + Math.sin((i + seed) / 24) * variance + Math.sin((i + seed) * 0.7) * variance * 0.3;
    data.push({ date: date.toISOString(), value: Math.max(0, Math.round(val * 10) / 10) });
  }
  return data;
}

export function getAlerts(): Alert[] {
  const damAlerts: Alert[] = dams.map((dam) => {
    const status = getDamStatus(dam);
    const pct = getDamFillPct(dam);
    let message = "";
    if (status === "critical") message = `Remplissage critique (${pct}%) — Risque de pénurie`;
    else if (status === "warning") message = `Remplissage modéré (${pct}%) — Surveillance renforcée`;
    else message = `Remplissage normal (${pct}%)`;
    return { id: `alert-${dam.id}`, entity_type: "dam", entity_id: dam.id, entity_name: dam.name, status, message };
  });

  const stationAlerts: Alert[] = stations
    .filter((_, i) => i % 3 === 0)
    .map((st) => ({
      id: `alert-${st.id}`,
      entity_type: "station" as const,
      entity_id: st.id,
      entity_name: st.name,
      status: "warning" as const,
      message: "Débit anormalement élevé détecté",
    }));

  return [...damAlerts, ...stationAlerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, safe: 2 };
    return order[a.status] - order[b.status];
  });
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
