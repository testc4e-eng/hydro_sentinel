export type AlertStatus = "ALERTE" | "VIGILANCE" | "OK";
export type ThresholdMode = "percentage" | "absolute";
export type ForecastSource = "SIMULE" | "OBSERVE";

export interface ThresholdConfig {
  mode: ThresholdMode;
  percentage: number;
  absoluteMm3: number;
}

export interface DamDefinition {
  id: string;
  nom: string;
  bassin: string;
  capacite: number;
}

export interface DamForecastPoint {
  tIndex: number;
  date: string;
  creuxPrevu: number;
}

export interface DamForecast {
  dam: DamDefinition;
  source: ForecastSource;
  series: DamForecastPoint[];
}

export interface DamEvaluation {
  dam: DamDefinition;
  source: ForecastSource;
  seuilAlerteMm3: number;
  seuilVigilanceMm3: number;
  minCreuxMm3: number;
  minDate: string;
  minTIndex: number;
  tauxMinPct: number;
  statut: AlertStatus;
  series: DamForecastPoint[];
}

export interface DamEvaluationSummary {
  total: number;
  alertes: number;
  vigilances: number;
  ok: number;
}

export const DEFAULT_THRESHOLD_CONFIG: ThresholdConfig = {
  mode: "percentage",
  percentage: 50,
  absoluteMm3: 300,
};

export const DAMS_UNDER_SURVEILLANCE: DamDefinition[] = [
  { id: "wahda", nom: "Bge Al Wahda", bassin: "Sebou", capacite: 3523 },
  { id: "idriss", nom: "Barrage Idriss 1er", bassin: "Haut Sebou", capacite: 1125 },
  { id: "ouljet", nom: "Bge Ouljet Soltane", bassin: "Sebou", capacite: 508 },
];

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function seededSeries(capacity: number, baseRate: number, wave: number, phase = 0): number[] {
  const values: number[] = [];
  for (let t = 0; t <= 14; t += 1) {
    const trend = baseRate - t * 0.0125;
    const periodic = Math.sin((t + phase) / 2.1) * wave;
    const raw = capacity * Math.max(0.06, trend + periodic);
    values.push(Number(raw.toFixed(1)));
  }
  return values;
}

export function buildMockForecasts(referenceDate = new Date()): DamForecast[] {
  const baseDate = new Date(referenceDate);
  baseDate.setHours(0, 0, 0, 0);

  const mockByDam: Record<string, number[]> = {
    wahda: seededSeries(3523, 0.42, 0.035, 0.2),
    idriss: seededSeries(1125, 0.39, 0.05, 0.7),
    ouljet: seededSeries(508, 0.33, 0.06, 1.1),
  };

  return DAMS_UNDER_SURVEILLANCE.map((dam) => {
    const values = mockByDam[dam.id] ?? seededSeries(dam.capacite, 0.4, 0.03, 0);
    const series = values.map((creuxPrevu, tIndex) => {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + tIndex);
      return { tIndex, date: toIsoDay(d), creuxPrevu };
    });
    return {
      dam,
      source: "SIMULE" as const,
      series,
    };
  });
}

export function computeThresholdMm3(dam: DamDefinition, config: ThresholdConfig): number {
  if (config.mode === "absolute") {
    return Math.max(0, Number(config.absoluteMm3) || 0);
  }
  const pct = Math.max(0, Math.min(100, Number(config.percentage) || 0));
  return (pct / 100) * dam.capacite;
}

export function computeStatus(minCreux: number, seuilAlerteMm3: number): AlertStatus {
  if (minCreux <= seuilAlerteMm3) return "ALERTE";
  if (minCreux <= seuilAlerteMm3 * 1.4) return "VIGILANCE";
  return "OK";
}

export function evaluateForecast(forecast: DamForecast, config: ThresholdConfig): DamEvaluation {
  const seuilAlerteMm3 = computeThresholdMm3(forecast.dam, config);
  const seuilVigilanceMm3 = seuilAlerteMm3 * 1.4;

  const sortedSeries = [...forecast.series].sort((a, b) => a.tIndex - b.tIndex);
  const fallback = sortedSeries[0] ?? { tIndex: 0, date: toIsoDay(new Date()), creuxPrevu: 0 };

  const minPoint = sortedSeries.reduce(
    (acc, point) => (point.creuxPrevu < acc.creuxPrevu ? point : acc),
    fallback,
  );

  return {
    dam: forecast.dam,
    source: forecast.source,
    seuilAlerteMm3,
    seuilVigilanceMm3,
    minCreuxMm3: minPoint.creuxPrevu,
    minDate: minPoint.date,
    minTIndex: minPoint.tIndex,
    tauxMinPct: forecast.dam.capacite > 0 ? (minPoint.creuxPrevu / forecast.dam.capacite) * 100 : 0,
    statut: computeStatus(minPoint.creuxPrevu, seuilAlerteMm3),
    series: sortedSeries,
  };
}

export function evaluateAllForecasts(
  forecasts: DamForecast[],
  config: ThresholdConfig,
): { rows: DamEvaluation[]; summary: DamEvaluationSummary } {
  const rows = forecasts.map((f) => evaluateForecast(f, config));
  const summary = rows.reduce(
    (acc, row) => {
      if (row.statut === "ALERTE") acc.alertes += 1;
      else if (row.statut === "VIGILANCE") acc.vigilances += 1;
      else acc.ok += 1;
      return acc;
    },
    { total: rows.length, alertes: 0, vigilances: 0, ok: 0 } as DamEvaluationSummary,
  );

  return { rows, summary };
}

export function buildDamForecastsForNow(): DamForecast[] {
  return buildMockForecasts(new Date());
}
