import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RecapBarrageChart, type RecapSeriesConfig } from "@/components/analysis/charts/RecapBarrageChart";
import { RecapTable } from "@/components/analysis/RecapTable";
import { CompactFilterBar, defaultCompactFilters, type CompactFilters } from "@/components/CompactFilterBar";
import { useDams, useSources } from "@/hooks/useApi";
import { CriticalityBadge } from "@/components/CriticalityBadge";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

type AxisSide = "left" | "right";
type SeriesType = "line" | "bar";

interface VariableDef {
  code: string;
  label: string;
  unit: string;
}

interface SeriesSlot {
  id: string;
  variableCode: string;
  sourceCode: string;
  axis: AxisSide;
  type: SeriesType;
  color: string;
}

interface SlotFetchResult {
  slot: SeriesSlot;
  rows: any[];
  usedSource: string;
}

interface CoverageInfo {
  mode: "common" | "union" | "requested" | "full" | "none";
  from?: string;
  to?: string;
}

const OBS_CODE = "OBS";
const DEFAULT_SOURCE_CODE = "SIM";
const SIM_CANDIDATE_CODES = ["SIM", "HEC_HMS"];

const VARIABLE_OPTIONS: VariableDef[] = [
  { code: "lacher_m3s", label: "Debit de lacher", unit: "m3/s" },
  { code: "inflow_m3s", label: "Apport", unit: "m3/s" },
  { code: "volume_hm3", label: "Volume de la retenue", unit: "Mm3" },
  { code: "flow_m3s", label: "Debit", unit: "m3/s" },
];

const DEFAULT_SERIES: SeriesSlot[] = [
  {
    id: "s1",
    variableCode: "lacher_m3s",
    sourceCode: DEFAULT_SOURCE_CODE,
    axis: "right",
    type: "bar",
    color: "#6b7280",
  },
  {
    id: "s2",
    variableCode: "inflow_m3s",
    sourceCode: DEFAULT_SOURCE_CODE,
    axis: "right",
    type: "line",
    color: "#3b82f6",
  },
  {
    id: "s3",
    variableCode: "volume_hm3",
    sourceCode: DEFAULT_SOURCE_CODE,
    axis: "left",
    type: "line",
    color: "#ea580c",
  },
  {
    id: "s4",
    variableCode: "flow_m3s",
    sourceCode: DEFAULT_SOURCE_CODE,
    axis: "right",
    type: "line",
    color: "#22c55e",
  },
];

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getVariableDef(code: string) {
  return VARIABLE_OPTIONS.find((v) => v.code === code);
}

function dayKey(timeValue: any): string {
  return String(timeValue).slice(0, 10);
}

function isoToDay(isoValue?: string): string | undefined {
  if (!isoValue) return undefined;
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function dayToIsoStart(day?: string): string | undefined {
  if (!day) return undefined;
  return `${day}T00:00:00.000Z`;
}

function dayToIsoEnd(day?: string): string | undefined {
  if (!day) return undefined;
  return `${day}T23:59:59.999Z`;
}

export default function RecapBarrage() {
  const [seriesSlots, setSeriesSlots] = useState<SeriesSlot[]>(DEFAULT_SERIES);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [coverageInfo, setCoverageInfo] = useState<CoverageInfo>({ mode: "none" });
  const [seriesDiag, setSeriesDiag] = useState<Record<string, { points: number; usedSource: string }>>({});
  const [continuityEnabled, setContinuityEnabled] = useState(false);
  const [continuityOrder, setContinuityOrder] = useState<string[]>([DEFAULT_SOURCE_CODE]);

  const { data: damsResult } = useDams();
  const { data: sourcesResult } = useSources();
  const [selectedDamId, setSelectedDamId] = useState<string>("");
  const [filters, setFilters] = useState<CompactFilters>({
    ...defaultCompactFilters,
    period: "14d",
  });

  const rawSources = sourcesResult?.data?.data ?? [];
  const availableSourceCodes = useMemo(() => new Set(rawSources.map((s: any) => String(s.code))), [rawSources]);

  const simulatedSourceCode = useMemo(() => {
    const found = rawSources.find((s: any) => SIM_CANDIDATE_CODES.includes(String(s.code)));
    return found?.code ?? "SIM";
  }, [rawSources]);

  const sourceOptions = useMemo(() => {
    const result = [{ code: simulatedSourceCode, label: "Simule" }];
    if (!result.some((s) => s.code === OBS_CODE)) {
      result.push({ code: OBS_CODE, label: "Observe" });
    }
    return result;
  }, [simulatedSourceCode]);

  const sourceLabelByCode = useMemo(() => {
    const map: Record<string, string> = {};
    sourceOptions.forEach((s) => {
      map[s.code] = s.label;
    });
    map["ABHS_RES"] = "Observe";
    map["HEC_HMS"] = "Simule";
    return map;
  }, [sourceOptions]);
  const continuityAvailable = sourceOptions.length > 1;
  const continuityActive = continuityAvailable && continuityEnabled;

  const availableStations = (damsResult?.data ?? []).filter((s: any) => String(s.type).toLowerCase() === "barrage");

  useEffect(() => {
    if (!selectedDamId && availableStations.length > 0) {
      const defaultSt = availableStations.find((s: any) => String(s.name).includes("Wahda")) || availableStations[0];
      setSelectedDamId(defaultSt.id);
    }
  }, [availableStations, selectedDamId]);

  useEffect(() => {
    setSeriesSlots((prev) => {
      let changed = false;
      const next = prev.map((slot) => {
        const valid = sourceOptions.some((s) => s.code === slot.sourceCode);
        if (valid) return slot;
        changed = true;
        return { ...slot, sourceCode: sourceOptions[0]?.code ?? DEFAULT_SOURCE_CODE };
      });
      return changed ? next : prev;
    });
  }, [sourceOptions]);

  useEffect(() => {
    const availableCodes = sourceOptions.map((source) => source.code);
    if (availableCodes.length < 2) {
      setContinuityEnabled(false);
    }

    setContinuityOrder((previousOrder) => {
      const kept = previousOrder.filter((code) => availableCodes.includes(code));
      const missing = availableCodes.filter((code) => !kept.includes(code));
      return [...kept, ...missing];
    });
  }, [sourceOptions]);

  const dam = availableStations.find((d: any) => d.id === selectedDamId);

  const activeSlots = useMemo(() => seriesSlots.filter((slot) => slot.variableCode !== "none"), [seriesSlots]);
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();

    switch (filters.period) {
      case "24h":
        start.setHours(end.getHours() - 24);
        break;
      case "72h":
        start.setHours(end.getHours() - 72);
        break;
      case "7d":
        start.setDate(end.getDate() - 7);
        break;
      case "14d":
        start.setDate(end.getDate() - 14);
        break;
      case "30d":
        start.setDate(end.getDate() - 30);
        break;
      case "custom": {
        const parsedStart = filters.customStart ? new Date(filters.customStart) : null;
        const parsedEnd = filters.customEnd ? new Date(filters.customEnd) : null;
        if (parsedStart && !Number.isNaN(parsedStart.getTime())) {
          start.setTime(parsedStart.getTime());
        } else {
          start.setDate(end.getDate() - 7);
        }
        if (parsedEnd && !Number.isNaN(parsedEnd.getTime())) {
          end.setTime(parsedEnd.getTime());
        }
        break;
      }
      default:
        start.setDate(end.getDate() - 7);
    }

    return { start: start.toISOString(), end: end.toISOString() };
  }, [filters.customEnd, filters.customStart, filters.period]);

  const chartSeries = useMemo<RecapSeriesConfig[]>(
    () =>
      activeSlots
        .map((slot) => {
          const def = getVariableDef(slot.variableCode);
          if (!def) return null;
          return {
            key: slot.id,
            axis: slot.axis,
            type: slot.type,
            color: slot.color,
            unit: def.unit,
            label: continuityActive
              ? `${def.label} (Continuite)`
              : `${def.label} (${sourceLabelByCode[slot.sourceCode] ?? slot.sourceCode})`,
          };
        })
        .filter(Boolean) as RecapSeriesConfig[],
    [activeSlots, continuityActive, sourceLabelByCode],
  );

  const slotSignature = useMemo(
    () =>
      JSON.stringify(
        activeSlots.map((s) => ({
          id: s.id,
          variableCode: s.variableCode,
          sourceCode: s.sourceCode,
          axis: s.axis,
          type: s.type,
        })),
      ),
    [activeSlots],
  );

  const buildSourceCandidates = (slot: SeriesSlot, sourceOverride?: string) => {
    const selected = sourceOverride ?? slot.sourceCode;
    const allAvailable = availableSourceCodes.size > 0;

    const keepAvailable = (codes: string[]) => {
      const dedup = uniq(codes);
      if (!allAvailable) return dedup;
      const filtered = dedup.filter((c) => availableSourceCodes.has(c));
      return filtered.length > 0 ? filtered : dedup;
    };

    const isObsMode = selected === OBS_CODE;
    const isSimMode = selected === simulatedSourceCode || SIM_CANDIDATE_CODES.includes(selected);

    if (isObsMode) {
      if (slot.variableCode === "lacher_m3s") {
        return keepAvailable(["ABHS_RES", OBS_CODE]);
      }
      return keepAvailable([OBS_CODE, "ABHS_RES"]);
    }

    if (isSimMode) {
      return keepAvailable([selected, simulatedSourceCode, ...SIM_CANDIDATE_CODES]);
    }

    return keepAvailable([selected]);
  };

  const fetchSlotRows = async (
    slot: SeriesSlot,
    effectiveRange: { start?: string; end?: string },
  ): Promise<SlotFetchResult> => {
    const requestRows = async (sourceCode: string) => {
      const response = await api.get("/measurements/timeseries", {
        params: {
          station_id: selectedDamId,
          variable_code: slot.variableCode,
          source_code: sourceCode,
          start: effectiveRange.start,
          end: effectiveRange.end,
        },
      });
      return Array.isArray(response.data) ? response.data : [];
    };

    if (continuityActive && continuityOrder.length > 1) {
      const basePriority = continuityOrder.filter((sourceCode) =>
        sourceOptions.some((source) => source.code === sourceCode),
      );
      const prioritizedCandidates = uniq(
        basePriority.flatMap((sourceCode) => buildSourceCandidates(slot, sourceCode)),
      );
      const mergedByTime = new Map<string, any>();

      for (const sourceCode of prioritizedCandidates) {
        const rows = await requestRows(sourceCode);
        rows.forEach((row: any) => {
          const time = row?.time;
          if (!time || mergedByTime.has(time)) return;
          mergedByTime.set(time, row);
        });
      }

      const mergedRows = Array.from(mergedByTime.values()).sort((a, b) =>
        String(a.time).localeCompare(String(b.time)),
      );
      const continuityLabel = `Continuite (${basePriority
        .map((code) => sourceLabelByCode[code] ?? code)
        .join(" > ")})`;

      return { slot, rows: mergedRows, usedSource: continuityLabel };
    }

    const candidates = buildSourceCandidates(slot);
    for (const sourceCode of candidates) {
      const rows = await requestRows(sourceCode);
      if (rows.length > 0) {
        return { slot, rows, usedSource: sourceCode };
      }
    }

    return { slot, rows: [], usedSource: candidates[0] ?? slot.sourceCode };
  };

  useEffect(() => {
    if (!selectedDamId || activeSlots.length === 0) {
      setChartData([]);
      setSeriesDiag({});
      setCoverageInfo({ mode: "none" });
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        let effectiveRange = { start: dateRange.start, end: dateRange.end };
        let rangeMode: CoverageInfo["mode"] = "requested";
        try {
          const periodResponse = await api.get("/recap/barrage", {
            params: {
              barrage_id: selectedDamId,
              full_period: true,
              source: "SIM",
            },
          });
          const period = periodResponse?.data?.periode ?? {};
          const fullStart = dayToIsoStart(period?.debut);
          const fullEnd = dayToIsoEnd(period?.fin);
          if (fullStart && fullEnd) {
            effectiveRange = { start: fullStart, end: fullEnd };
            rangeMode = "full";
          }
        } catch {
          rangeMode = "requested";
        }

        const responses = await Promise.all(activeSlots.map((slot) => fetchSlotRows(slot, effectiveRange)));

        const diag: Record<string, { points: number; usedSource: string }> = {};
        responses.forEach((r) => {
          diag[r.slot.id] = { points: r.rows.length, usedSource: r.usedSource };
        });

        const requestedStart = isoToDay(effectiveRange.start);
        const requestedEnd = isoToDay(effectiveRange.end);
        const nonEmpty = responses.filter((r) => r.rows.length > 0);

        if (nonEmpty.length === 0) {
          if (!cancelled) {
            setSeriesDiag(diag);
            setCoverageInfo(
              requestedStart && requestedEnd
                ? { mode: rangeMode, from: requestedStart, to: requestedEnd }
                : { mode: "none" },
            );
            setChartData([]);
          }
          return;
        }

        const fallbackRangeDays = nonEmpty
          .flatMap((r) => r.rows.map((pt: any) => dayKey(pt.time)).filter(Boolean))
          .sort();
        const coverageStart = requestedStart ?? fallbackRangeDays[0] ?? "";
        const coverageEnd = requestedEnd ?? fallbackRangeDays[fallbackRangeDays.length - 1] ?? "";
        const coverageMode: CoverageInfo["mode"] = requestedStart && requestedEnd ? rangeMode : "union";

        const dayMap = new Map<string, any>();

        responses.forEach(({ slot, rows }) => {
          rows.forEach((pt: any) => {
            if (pt?.value === null || pt?.value === undefined || !pt?.time) return;
            const day = dayKey(pt.time);
            if (!day || day < coverageStart || day > coverageEnd) return;

            const value = Number(pt.value);
            if (Number.isNaN(value)) return;

            if (!dayMap.has(day)) {
              dayMap.set(day, { date: day, _agg: {} as any });
            }

            const row = dayMap.get(day);
            if (!row._agg[slot.id]) {
              row._agg[slot.id] = { sum: 0, count: 0, last: null as number | null, lastTime: "" };
            }

            const agg = row._agg[slot.id];
            agg.sum += value;
            agg.count += 1;

            const t = String(pt.time);
            if (!agg.lastTime || t > agg.lastTime) {
              agg.last = value;
              agg.lastTime = t;
            }
          });
        });

        const merged = Array.from(dayMap.values())
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((row) => {
            const out: any = { date: row.date };
            activeSlots.forEach((slot) => {
              const def = getVariableDef(slot.variableCode);
              const agg = row._agg[slot.id];
              if (!def || !agg || agg.count === 0) {
                out[slot.id] = null;
                return;
              }

              const isVolume = def.code === "volume_hm3";
              const computed = isVolume ? agg.last : agg.sum / agg.count;
              out[slot.id] = Number.isFinite(computed) ? Number(computed.toFixed(2)) : null;
            });
            return out;
          });

        if (!cancelled) {
          setSeriesDiag(diag);
          setCoverageInfo({ mode: coverageMode, from: coverageStart, to: coverageEnd });
          setChartData(merged);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch recap data", error);
          setErrorMessage("Impossible de charger les donnees du recapitulatif.");
          setSeriesDiag({});
          setCoverageInfo({ mode: "none" });
          setChartData([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [continuityActive, continuityOrder, dateRange.end, dateRange.start, selectedDamId, slotSignature, sourceOptions]);

  const updateSlot = (slotId: string, patch: Partial<SeriesSlot>) => {
    setSeriesSlots((prev) => prev.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot)));
  };
  const handleContinuityOrderChange = (index: number, sourceCode: string) => {
    setContinuityOrder((previousOrder) => {
      const fromIndex = previousOrder.indexOf(sourceCode);
      if (fromIndex === -1 || fromIndex === index) return previousOrder;

      const next = [...previousOrder];
      [next[index], next[fromIndex]] = [next[fromIndex], next[index]];
      return next;
    });
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Recapitulatif barrage</h2>
        <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">Auto couverture</Badge>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Barrage :</span>
          <Select value={selectedDamId} onValueChange={setSelectedDamId}>
            <SelectTrigger className="w-[240px] h-8 text-xs">
              <SelectValue placeholder="Choisir un barrage..." />
            </SelectTrigger>
            <SelectContent>
              {availableStations.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dam && <CriticalityBadge status="safe" />}
        </div>

        <CompactFilterBar filters={filters} onChange={setFilters} hideSources />
      </div>

      <RecapTable
        barrageId={selectedDamId}
        barrageName={dam?.name ?? "-"}
      />

      {continuityAvailable && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 p-2">
          <Label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox
              checked={continuityEnabled}
              onCheckedChange={(checked) => setContinuityEnabled(Boolean(checked))}
            />
            Mode continuité
          </Label>

          {continuityActive && continuityOrder.length > 1 && (
            <>
              <span className="text-xs text-muted-foreground ml-2">Priorité :</span>
              {continuityOrder.map((sourceCode, index) => (
                <Select
                  key={`recap-continuity-${index}`}
                  value={sourceCode}
                  onValueChange={(nextSourceCode) => handleContinuityOrderChange(index, nextSourceCode)}
                >
                  <SelectTrigger className="h-7 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {continuityOrder.map((candidateSourceCode) => (
                      <SelectItem key={`recap-continuity-candidate-${index}-${candidateSourceCode}`} value={candidateSourceCode}>
                        P{index + 1} - {sourceLabelByCode[candidateSourceCode] ?? candidateSourceCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </>
          )}
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="p-3 space-y-3">
          <div className="text-sm font-medium">Configuration du graphique (4 series maximum)</div>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
            {seriesSlots.map((slot, idx) => (
              <div key={slot.id} className="border rounded-md p-2 space-y-2 bg-muted/20">
                <div className="text-xs font-semibold flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slot.color }} />
                  Serie {idx + 1}
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">Variable</span>
                  <Select value={slot.variableCode} onValueChange={(value) => updateSlot(slot.id, { variableCode: value })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Choisir une variable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {VARIABLE_OPTIONS.map((v) => (
                        <SelectItem key={v.code} value={v.code}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Source</span>
                    <Select
                      value={slot.sourceCode}
                      onValueChange={(value) => updateSlot(slot.id, { sourceCode: value })}
                      disabled={slot.variableCode === "none"}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceOptions.map((s) => (
                          <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Type</span>
                    <Select
                      value={slot.type}
                      onValueChange={(value: SeriesType) => updateSlot(slot.id, { type: value })}
                      disabled={slot.variableCode === "none"}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="line">Courbe</SelectItem>
                        <SelectItem value="bar">Barres</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Axe</span>
                    <Select
                      value={slot.axis}
                      onValueChange={(value: AxisSide) => updateSlot(slot.id, { axis: value })}
                      disabled={slot.variableCode === "none"}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Gauche</SelectItem>
                        <SelectItem value="right">Droite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {activeSlots.length > 0 && (
            <div className="text-xs text-muted-foreground border rounded-md p-2 bg-background space-y-0.5">
              <div>
                Plage utilisee: {coverageInfo.mode === "common"
                  ? "commune"
                  : coverageInfo.mode === "union"
                    ? "union"
                    : coverageInfo.mode === "full"
                      ? "periode complete disponible (SIM)"
                    : coverageInfo.mode === "requested"
                      ? "periode demandee"
                      : "n/a"}
                {coverageInfo.from && coverageInfo.to ? ` (${coverageInfo.from} -> ${coverageInfo.to})` : ""}
              </div>
              {activeSlots.map((slot) => {
                const def = getVariableDef(slot.variableCode);
                const diag = seriesDiag[slot.id];
                const points = diag?.points ?? 0;
                const usedSource = diag?.usedSource ?? slot.sourceCode;
                const label = def?.label ?? slot.variableCode;
                return (
                  <div key={`diag-${slot.id}`}>
                    {label}: {points} points, source utilisee {sourceLabelByCode[usedSource] ?? usedSource}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div className="h-20 border rounded-lg flex items-center justify-center text-sm text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des series...
        </div>
      )}

      {errorMessage && (
        <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-3">
          {errorMessage}
        </div>
      )}

      {!loading && activeSlots.length === 0 && (
        <div className="h-24 border rounded-lg flex items-center justify-center text-sm text-muted-foreground">
          Activez au moins une variable dans la configuration du graphique.
        </div>
      )}

      {!loading && activeSlots.length > 0 && chartData.length === 0 && !errorMessage && (
        <div className="h-24 border rounded-lg flex items-center justify-center text-sm text-muted-foreground">
          Aucune donnee trouvee pour la configuration actuelle.
        </div>
      )}

      {dam && !loading && chartData.length > 0 && activeSlots.length > 0 && (
        <RecapBarrageChart data={chartData} damName={dam.name} series={chartSeries} vn={3522.2} />
      )}
    </div>
  );
}
