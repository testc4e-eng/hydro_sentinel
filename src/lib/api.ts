/**
 * API client — Hydro-Météo Sebou
 * Fetches from backend when VITE_API_BASE_URL is set, otherwise falls back to mock data.
 */

import {
  basins, stations, dams, getAlerts, generateTimeseries, generateMultiSourceSeries,
  getDamStatus, getDamFillPct, mockVariables, mockSources, mockRuns,
  type Basin, type Station, type Dam, type Alert, type Variable, type Source, type Run,
} from "@/data/mockData";

// Config
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = import.meta.env.VITE_API_PREFIX || "/api/v1";

export const apiBase = API_BASE ? `${API_BASE}${API_PREFIX}` : "";

// ── Extra types ────────────────────────────────────────────────────────

export type { Variable, Source, Run, Basin, Station, Dam, Alert };

export interface TimeseriesPoint {
  date: string;
  value: number;
}

export interface CompareResult {
  station_id: string;
  variable_code: string;
  series: Record<string, TimeseriesPoint[]>; // keyed by source_code
}

export interface Ingestion {
  id: string;
  timestamp: string;
  status: "ok" | "error";
  message: string;
  file_name?: string;
}

export interface HealthStatus {
  data_mode: string;
  db_status: "connected" | "disconnected" | "n/a";
  backend_url: string;
  last_run_time: string | null;
}

export interface KpiResult {
  basin_id?: string;
  precip_cumul_24h: number;
  precip_cumul_72h: number;
  debit_moyen: number;
  volume_total: number;
  nb_alertes: number;
  derniere_ingestion: string | null;
}

// ── Generic fetcher ────────────────────────────────────────────────────

async function apiFetch<T>(path: string, fallback: () => T): Promise<{ data: T; fromApi: boolean }> {
  if (!apiBase) return { data: fallback(), fromApi: false };
  try {
    const res = await fetch(`${apiBase}${path}`);
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    return { data: data as T, fromApi: true };
  } catch {
    return { data: fallback(), fromApi: false };
  }
}

function qs(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return "";
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ── Mock helpers ───────────────────────────────────────────────────────

function mockStations(params?: { type?: string; basin_id?: string }): Station[] {
  let s = stations;
  if (params?.type) s = s.filter((st) => st.type === params.type);
  if (params?.basin_id) s = s.filter((st) => st.basin_id === params.basin_id);
  return s;
}

function mockKpis(): KpiResult {
  return {
    precip_cumul_24h: 18.4,
    precip_cumul_72h: 52.7,
    debit_moyen: 145,
    volume_total: Math.round(dams.reduce((s, d) => s + d.current_volume, 0)),
    nb_alertes: getAlerts().filter((a) => a.status !== "safe").length,
    derniere_ingestion: new Date(Date.now() - 1800000).toISOString(),
  };
}

function mockCompare(stationId: string, variableCode?: string, sources?: string): CompareResult {
  const srcList = sources ? sources.split(",") : ["OBS", "AROME", "ECMWF"];
  return {
    station_id: stationId,
    variable_code: variableCode || "precip_mm",
    series: generateMultiSourceSeries(stationId, variableCode || "precip_mm", srcList),
  };
}

function mockIngestions(): Ingestion[] {
  const now = new Date();
  return [
    { id: "ing-1", timestamp: new Date(now.getTime() - 1800000).toISOString(), status: "ok", message: "Import CSV réussi", file_name: "obs_precip.csv" },
    { id: "ing-2", timestamp: new Date(now.getTime() - 86400000).toISOString(), status: "error", message: "Format invalide", file_name: "bad.csv" },
  ];
}

function mockHealth(): HealthStatus {
  return {
    data_mode: "mock",
    db_status: "n/a",
    backend_url: apiBase || "(non configuré)",
    last_run_time: new Date(Date.now() - 3600000).toISOString(),
  };
}

// ── Public API ─────────────────────────────────────────────────────────

export const api = {
  // Ref data
  getVariables: () => apiFetch<Variable[]>("/variables", () => mockVariables),
  getSources: () => apiFetch<Source[]>("/sources", () => mockSources),
  getRuns: (params?: { source_code?: string; limit?: number }) =>
    apiFetch<Run[]>(`/runs${qs(params)}`, () => mockRuns(params?.source_code)),

  // Geo
  getBasins: () => apiFetch<Basin[]>("/basins", () => basins),
  getStations: (params?: { type?: string; q?: string; active?: number; basin_id?: string }) =>
    apiFetch<Station[]>(`/stations${qs(params as any)}`, () => mockStations(params)),
  getDams: () => apiFetch<Dam[]>("/dams", () => dams),

  // Timeseries
  getTimeseries: (params: { station_id: string; variable_code?: string; source_code?: string; run_id?: string; from?: string; to?: string; agg?: string }) =>
    apiFetch<TimeseriesPoint[]>(`/timeseries${qs(params as any)}`, () =>
      generateTimeseries(14, 45, 15, params.station_id.charCodeAt(params.station_id.length - 1))
    ),

  getCompare: (params: { station_id: string; variable_code?: string; from?: string; to?: string; sources?: string; run_id?: string }) =>
    apiFetch<CompareResult>(`/compare${qs(params as any)}`, () =>
      mockCompare(params.station_id, params.variable_code, params.sources)
    ),

  getLatest: (params?: { variable_code?: string; source_code?: string; run_id?: string; basin_id?: string }) =>
    apiFetch<TimeseriesPoint[]>(`/latest${qs(params as any)}`, () => generateTimeseries(1, 30, 10, 0)),

  // KPIs / Alerts
  getKpis: (params?: { basin_id?: string; window?: string }) =>
    apiFetch<KpiResult>(`/kpis${qs(params as any)}`, mockKpis),
  getAlerts: (params?: { level?: string; active?: number }) =>
    apiFetch<Alert[]>(`/alerts${qs(params as any)}`, getAlerts),

  // Admin
  getIngestions: () => apiFetch<Ingestion[]>("/ingestions", mockIngestions),
  getHealth: () => apiFetch<HealthStatus>("/health", mockHealth),
};
