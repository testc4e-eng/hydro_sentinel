/**
 * API client with automatic fallback to mock data when backend is unavailable.
 */

import {
  basins, stations, dams, getAlerts, generateTimeseries,
  getDamStatus, getDamFillPct, type Basin, type Station, type Dam, type Alert,
} from "@/data/mockData";

// Config
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const API_PREFIX = import.meta.env.VITE_API_PREFIX || "/api/v1";

export const apiBase = API_BASE ? `${API_BASE}${API_PREFIX}` : "";

// ── Types ──────────────────────────────────────────────────────────────

export interface Variable {
  code: string;
  label: string;
  unit: string;
}

export interface Source {
  code: string;
  label: string;
  type: "observed" | "simulated";
}

export interface Run {
  id: string;
  source_code: string;
  run_time: string;
  status: string;
}

export interface TimeseriesPoint {
  date: string;
  value: number;
}

export interface ComparePoint {
  date: string;
  observed: number;
  simulated: number;
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

// ── Generic fetcher with fallback ──────────────────────────────────────

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

// ── Mock generators ────────────────────────────────────────────────────

function mockVariables(): Variable[] {
  return [
    { code: "discharge", label: "Débit", unit: "m³/s" },
    { code: "precip", label: "Précipitation", unit: "mm" },
    { code: "volume", label: "Volume", unit: "Mm³" },
    { code: "inflow", label: "Apport", unit: "m³/s" },
    { code: "outflow", label: "Lâcher", unit: "m³/s" },
  ];
}

function mockSources(): Source[] {
  return [
    { code: "obs", label: "Observé", type: "observed" },
    { code: "sim_rcp45_2030", label: "RCP 4.5 — 2030", type: "simulated" },
    { code: "sim_rcp85_2030", label: "RCP 8.5 — 2030", type: "simulated" },
    { code: "sim_rcp45_2050", label: "RCP 4.5 — 2050", type: "simulated" },
  ];
}

function mockRuns(source_code?: string): Run[] {
  const now = new Date();
  const allRuns: Run[] = [
    { id: "run-obs-1", source_code: "obs", run_time: new Date(now.getTime() - 3600000).toISOString(), status: "ok" },
    { id: "run-sim45-1", source_code: "sim_rcp45_2030", run_time: new Date(now.getTime() - 7200000).toISOString(), status: "ok" },
    { id: "run-sim85-1", source_code: "sim_rcp85_2030", run_time: new Date(now.getTime() - 10800000).toISOString(), status: "ok" },
    { id: "run-sim45-2050", source_code: "sim_rcp45_2050", run_time: new Date(now.getTime() - 14400000).toISOString(), status: "ok" },
  ];
  return source_code ? allRuns.filter((r) => r.source_code === source_code) : allRuns;
}

function mockStations(params?: { type?: string }): Station[] {
  if (params?.type) return stations.filter((s) => s.type === params.type);
  return stations;
}

function mockBasins(): Basin[] {
  return basins;
}

function mockDams(): Dam[] {
  return dams;
}

function mockAlerts(): Alert[] {
  return getAlerts();
}

function mockCompare(stationId?: string): ComparePoint[] {
  const seed = stationId ? stationId.charCodeAt(stationId.length - 1) : 0;
  const obs = generateTimeseries(30, 45, 15, seed);
  const sim = generateTimeseries(30, 48, 18, seed + 5);
  return obs.map((o, i) => ({
    date: o.date,
    observed: o.value,
    simulated: sim[i]?.value ?? 0,
  }));
}

function mockIngestions(): Ingestion[] {
  const now = new Date();
  return [
    { id: "ing-1", timestamp: new Date(now.getTime() - 1800000).toISOString(), status: "ok", message: "Import CSV réussi", file_name: "timeseries_observed.csv" },
    { id: "ing-2", timestamp: new Date(now.getTime() - 86400000).toISOString(), status: "error", message: "Format invalide", file_name: "bad_file.csv" },
    { id: "ing-3", timestamp: new Date(now.getTime() - 172800000).toISOString(), status: "ok", message: "Import GeoJSON réussi", file_name: "stations.geojson" },
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
  getVariables: () => apiFetch<Variable[]>("/variables", mockVariables),
  getSources: () => apiFetch<Source[]>("/sources", mockSources),
  getRuns: (params?: { source_code?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.source_code) qs.set("source_code", params.source_code);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return apiFetch<Run[]>(`/runs${q ? `?${q}` : ""}`, () => mockRuns(params?.source_code));
  },
  getStations: (params?: { type?: string; q?: string; active?: number }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set("type", params.type);
    if (params?.q) qs.set("q", params.q);
    if (params?.active !== undefined) qs.set("active", String(params.active));
    const q = qs.toString();
    return apiFetch<Station[]>(`/stations${q ? `?${q}` : ""}`, () => mockStations(params));
  },
  getBasins: () => apiFetch<Basin[]>("/basins", mockBasins),
  getDams: () => apiFetch<Dam[]>("/dams", mockDams),
  getAlerts: (params?: { level?: string; active?: number }) => {
    const qs = new URLSearchParams();
    if (params?.level) qs.set("level", params.level);
    if (params?.active !== undefined) qs.set("active", String(params.active));
    const q = qs.toString();
    return apiFetch<Alert[]>(`/alerts${q ? `?${q}` : ""}`, mockAlerts);
  },
  getTimeseries: (params: { station_id: string; variable_code?: string; source_code?: string; from?: string; to?: string; agg?: string }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
    return apiFetch<TimeseriesPoint[]>(`/timeseries?${qs}`, () => generateTimeseries(30, 45, 15, params.station_id.charCodeAt(params.station_id.length - 1)));
  },
  getCompare: (params: { station_id: string; variable_code?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
    return apiFetch<ComparePoint[]>(`/compare?${qs}`, () => mockCompare(params.station_id));
  },
  getIngestions: () => apiFetch<Ingestion[]>("/ingestions", mockIngestions),
  getHealth: () => apiFetch<HealthStatus>("/health", mockHealth),
};
