import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SingleVariableSelector, type VariableSourceSelection } from "@/components/analysis/SingleVariableSelector";
import { EnhancedMultiSourceChart } from "@/components/analysis/EnhancedMultiSourceChart";
import { ViewModeToggle, type ViewMode } from "@/components/analysis/ViewModeToggle";
import { DataTable } from "@/components/analysis/DataTable";
import { CompactFilterBar, defaultCompactFilters, type CompactFilters } from "@/components/CompactFilterBar";
import { useStations, useSources, useBasins, useDams } from "@/hooks/useApi";
import { exportToCSV } from "@/lib/exportUtils";
import { api } from "@/lib/api";
import { mapDgmBasinsFromScan, type BasinEntityAvailability, type StationEntityAvailability } from "@/lib/dgmBasinAlignment";
import { BarChart3, LayoutGrid, LineChart } from "lucide-react";
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import * as XLSX from "xlsx";

const ALLOWED_PRECIP_SOURCE_CODES = ["OBS", "AROME", "ECMWF"];
const DEFAULT_CONTINUITY_ORDER = ["OBS", "AROME", "ECMWF"];
const PRECIP_SOURCE_LABELS: Record<string, string> = {
  OBS: "Observations",
  AROME: "Previsions AROME",
  ECMWF: "Previsions ECMWF",
};

type CumulView = "tableau" | "graphique";

type BasinCumulRow = {
  id: string;
  label: string;
  bassinVersant?: string;
  cumul: number;
  moyenne: number;
  min: number;
  max: number;
  nbStations?: number;
};

type BasinOption = {
  id: string;
  name: string;
  code?: string | null;
  queryBasinId: string;
};

const format1 = (value: number) => value.toFixed(1);
const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-FR");
};

export default function Precipitations() {
  const location = useLocation();
  const isBasinView = location.pathname.includes("/bassin");

  const [filters, setFilters] = useState<CompactFilters>({ ...defaultCompactFilters, period: "14d" });
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [cumulView, setCumulView] = useState<CumulView>("tableau");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [continuityEnabled, setContinuityEnabled] = useState(false);
  const [continuityOrder, setContinuityOrder] = useState<string[]>(DEFAULT_CONTINUITY_ORDER);
  const [chartData, setChartData] = useState<any[]>([]);
  const [cumulRows, setCumulRows] = useState<BasinCumulRow[]>([]);
  const [cumulLoading, setCumulLoading] = useState(false);
  const cumulGraphRef = useRef<HTMLDivElement | null>(null);

  const { data: stResult } = useStations({});
  const { data: basinsResult } = useBasins();
  const { data: damsResult } = useDams();
  const { data: sourcesResult } = useSources();
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [selectedBasinId, setSelectedBasinId] = useState<string>("");
  const [selectedShape, setSelectedShape] = useState<"DGM" | "ABH">("ABH");
  const [dgmBasinOptions, setDgmBasinOptions] = useState<BasinOption[]>([]);

  const [variableSelection, setVariableSelection] = useState<VariableSourceSelection>({
    variableCode: "precip_mm",
    variableLabel: "Precipitations",
    unit: "mm",
    sources: ["OBS", "AROME", "ECMWF"],
  });

  const allStations = useMemo(() => {
    const list = stResult?.data ?? [];
    const richDataNames = ["Wahda", "Sebou", "Soltane", "Sahla", "Asfallou", "Bouhouda", "Galaz", "Ratba", "Tissa"];
    return [...list].sort((a, b) => {
      const aHasData = richDataNames.some((name) => a.name.includes(name));
      const bHasData = richDataNames.some((name) => b.name.includes(name));
      if (aHasData && !bHasData) return -1;
      if (!aHasData && bHasData) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [stResult]);

  const availableStations = allStations;

  const allBasins = basinsResult?.data ?? [];
  const abhBasinOptions = useMemo<BasinOption[]>(
    () =>
      allBasins.map((b: any) => ({
        id: String(b.id),
        name: String(b.name),
        code: b.code ?? null,
        queryBasinId: String(b.id),
      })),
    [allBasins],
  );

  const availableBasins = useMemo<BasinOption[]>(() => {
    if (!isBasinView) return abhBasinOptions;
    if (selectedShape === "DGM") return dgmBasinOptions;
    return abhBasinOptions;
  }, [isBasinView, selectedShape, abhBasinOptions, dgmBasinOptions]);
  const availableDams = useMemo(
    () => ((damsResult?.data ?? []) as any[]).filter((s: any) => String(s?.type || "").toLowerCase() === "barrage"),
    [damsResult],
  );

  useEffect(() => {
    if (availableStations.length === 0) {
      if (selectedStationId) setSelectedStationId("");
      return;
    }
    const exists = availableStations.some((s) => s.id === selectedStationId);
    if (!selectedStationId || !exists) {
      setSelectedStationId(availableStations[0].id);
    }
  }, [availableStations, selectedStationId]);

  useEffect(() => {
    if (!isBasinView) return;
    if (availableBasins.length === 0) {
      if (selectedBasinId) setSelectedBasinId("");
      return;
    }
    const exists = availableBasins.some((b: any) => b.id === selectedBasinId);
    if (!selectedBasinId || !exists) {
      setSelectedBasinId(availableBasins[0].id);
    }
  }, [isBasinView, availableBasins, selectedBasinId]);

  useEffect(() => {
    let cancelled = false;
    const loadDgmBasinsForPrecip = async () => {
      try {
        const [reportRes, geojsonRes] = await Promise.all([
          api.get("/admin/data-availability", { params: { include_time_stats: false } }),
          fetch(`/data/basins_dgm.geojson?v=${Date.now()}`),
        ]);
        if (!geojsonRes.ok) {
          if (!cancelled) setDgmBasinOptions([]);
          return;
        }
        const report = reportRes?.data ?? {};
        const basinEntities = (Array.isArray(report?.basin_entities) ? report.basin_entities : []) as BasinEntityAvailability[];
        const stationEntities = (Array.isArray(report?.station_entities) ? report.station_entities : []) as StationEntityAvailability[];
        const geojson = await geojsonRes.json();
        const features = Array.isArray(geojson?.features) ? geojson.features : [];

        const mapped = mapDgmBasinsFromScan(features, basinEntities, stationEntities)
          .filter((row) => !!row.basin_id)
          .map((row) => ({
            id: row.option_id,
            name: row.basin_name,
            code: row.basin_code,
            queryBasinId: row.basin_id,
          })) as BasinOption[];

        if (!cancelled) setDgmBasinOptions(mapped);
      } catch {
        if (!cancelled) setDgmBasinOptions([]);
      }
    };
    loadDgmBasinsForPrecip();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableSources = useMemo(() => {
    const sourceList = sourcesResult?.data?.data ?? [];
    return sourceList
      .filter((s: any) => ALLOWED_PRECIP_SOURCE_CODES.includes(s.code))
      .map((s: any) => ({
        code: s.code,
        label: PRECIP_SOURCE_LABELS[s.code] ?? s.label,
      }));
  }, [sourcesResult]);

  const sourceLabelByCode = useMemo(() => {
    const map: Record<string, string> = {};
    availableSources.forEach((source) => {
      map[source.code] = source.label;
    });
    return map;
  }, [availableSources]);

  useEffect(() => {
    const selectedSources = variableSelection.sources;
    if (selectedSources.length < 2) {
      setContinuityEnabled(false);
    }

    setContinuityOrder((previousOrder) => {
      const kept = previousOrder.filter((source) => selectedSources.includes(source));
      const fromDefault = DEFAULT_CONTINUITY_ORDER.filter(
        (source) => selectedSources.includes(source) && !kept.includes(source),
      );
      const others = selectedSources.filter(
        (source) => !DEFAULT_CONTINUITY_ORDER.includes(source) && !kept.includes(source),
      );
      return [...kept, ...fromDefault, ...others];
    });
  }, [variableSelection.sources]);

  const handleContinuityOrderChange = (index: number, sourceCode: string) => {
    setContinuityOrder((previousOrder) => {
      const fromIndex = previousOrder.indexOf(sourceCode);
      if (fromIndex === -1 || fromIndex === index) return previousOrder;

      const next = [...previousOrder];
      [next[index], next[fromIndex]] = [next[fromIndex], next[index]];
      return next;
    });
  };

  const continuityAvailable = variableSelection.sources.length > 1;
  const continuityActive = continuityAvailable && continuityEnabled;

  const handleExport = () => {
    const st = availableStations.find((s) => s.id === selectedStationId);
    const filename = `precipitations_${st?.name || "data"}_${new Date().toISOString().split("T")[0]}`;
    exportToCSV(chartData, filename, variableSelection.variableLabel);
  };

  const st = availableStations.find((s) => s.id === selectedStationId);
  const basin = availableBasins.find((b: any) => b.id === selectedBasinId);
  const selectedBasinQueryId = basin?.queryBasinId || "";
  const currentEntityName = isBasinView ? basin?.name : st?.name;

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
        start.setDate(end.getDate() - 7);
        end.setDate(end.getDate() + 7);
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

  const availableVariables = [{ code: "precip_mm", label: "Precipitations", unit: "mm" }];

  const primarySummarySource = useMemo(() => {
    if (variableSelection.sources.includes("OBS")) return "OBS";
    return variableSelection.sources[0] ?? "OBS";
  }, [variableSelection.sources]);

  const stationCountByBasinId = useMemo(() => {
    const counts: Record<string, number> = {};
    allStations.forEach((station: any) => {
      const bid = station?.bassin_id || station?.basin_id;
      if (!bid) return;
      counts[bid] = (counts[bid] || 0) + 1;
    });
    return counts;
  }, [allStations]);

  const basinNameById = useMemo(() => {
    const map: Record<string, string> = {};
    availableBasins.forEach((b: any) => {
      map[b.id] = b.name;
      if (b.queryBasinId) {
        map[b.queryBasinId] = b.name;
      }
    });
    return map;
  }, [availableBasins]);

  useEffect(() => {
    let cancelled = false;

    const continuityPriority = continuityOrder.filter((src) => variableSelection.sources.includes(src));
    const fallbackPriority = variableSelection.sources.filter((src) => !continuityPriority.includes(src));
    const sourcePriority = [...continuityPriority, ...fallbackPriority];

    const fetchEntitySeries = async (
      entityType: "stations" | "bassins",
      entityId: string,
      sourceCode: string,
    ) => {
      const response = await api.get("/measurements/timeseries", {
        params: {
          station_id: entityId,
          variable_code: variableSelection.variableCode,
          source_code: sourceCode,
          entity_type: entityType,
          start: dateRange.start,
          end: dateRange.end,
        },
      });
      return Array.isArray(response.data) ? response.data : [];
    };

    const extractValues = (points: any[]) =>
      points
        .map((point: any) => Number(point?.value))
        .filter((value: number) => Number.isFinite(value));

    const mergeContinuityValues = (seriesBySource: Record<string, any[]>) => {
      const chosenByTime = new Map<string, number>();
      sourcePriority.forEach((sourceCode) => {
        const points = seriesBySource[sourceCode] || [];
        points.forEach((point: any) => {
          const timeKey = String(point?.time || "");
          const value = Number(point?.value);
          if (!timeKey || !Number.isFinite(value)) return;
          if (!chosenByTime.has(timeKey)) {
            chosenByTime.set(timeKey, value);
          }
        });
      });
      return Array.from(chosenByTime.values());
    };

    const fetchValuesForEntity = async (
      entityType: "stations" | "bassins",
      entityId: string,
    ): Promise<number[]> => {
      if (continuityActive && sourcePriority.length > 1) {
        const seriesBySource: Record<string, any[]> = {};
        await Promise.all(
          sourcePriority.map(async (sourceCode) => {
            seriesBySource[sourceCode] = await fetchEntitySeries(entityType, entityId, sourceCode);
          }),
        );
        return mergeContinuityValues(seriesBySource);
      }

      const points = await fetchEntitySeries(entityType, entityId, primarySummarySource);
      return extractValues(points);
    };

    const computeStatsForStations = async (stationIds: string[]) => {
      if (stationIds.length === 0) return { cumul: 0, moyenne: 0, min: 0, max: 0 };

      const responses = await Promise.all(
        stationIds.map((stationId) => fetchValuesForEntity("stations", stationId)),
      );

      const values = responses.flatMap((entityValues) => entityValues);

      if (values.length === 0) return { cumul: 0, moyenne: 0, min: 0, max: 0 };

      const cumul = values.reduce((acc: number, v: number) => acc + v, 0);
      return {
        cumul,
        moyenne: cumul / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      };
    };

    const computeStatsForBasin = async (basinId: string) => {
      const values = await fetchValuesForEntity("bassins", basinId);

      if (values.length === 0) return { cumul: 0, moyenne: 0, min: 0, max: 0 };

      const cumul = values.reduce((acc: number, v: number) => acc + v, 0);
      return {
        cumul,
        moyenne: cumul / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      };
    };

    const fetchCumul = async () => {
      setCumulLoading(true);
      try {
        if (isBasinView) {
          const statsByQueryBasinId = new Map<string, { cumul: number; moyenne: number; min: number; max: number }>();
          const rows = await Promise.all(
            availableBasins.map(async (b: any) => {
              const queryBasinId = b.queryBasinId || b.id;
              if (!statsByQueryBasinId.has(queryBasinId)) {
                statsByQueryBasinId.set(queryBasinId, await computeStatsForBasin(queryBasinId));
              }
              const stats = statsByQueryBasinId.get(queryBasinId) ?? { cumul: 0, moyenne: 0, min: 0, max: 0 };
              return {
                id: b.id,
                label: b.name,
                cumul: stats.cumul,
                moyenne: stats.moyenne,
                min: stats.min,
                max: stats.max,
                nbStations: stationCountByBasinId[queryBasinId] || 0,
              } as BasinCumulRow;
            }),
          );
          if (!cancelled) setCumulRows(rows);
          return;
        }

        const rows = await Promise.all(
          availableDams.map(async (dam: any) => {
            const bid = dam?.bassin_id || dam?.basin_id;
            const linkedStations = allStations.filter((station: any) => {
              const stationType = String(station?.type || "").toLowerCase();
              const stationBasinId = station?.bassin_id || station?.basin_id;
              return (
                stationBasinId &&
                stationBasinId === bid &&
                !stationType.includes("barrage") &&
                !stationType.includes("result")
              );
            });
            const linkedStationIds = linkedStations.map((s: any) => s.id);
            const stats = await computeStatsForStations(linkedStationIds);
            console.debug("Cumul barrages debug", {
              barrage: dam?.name,
              basin_id: bid,
              linked_station_ids: linkedStationIds,
              date_debut: dateRange.start,
              date_fin: dateRange.end,
              source: primarySummarySource,
              variable: variableSelection.variableCode,
            });
            return {
              id: dam.id,
              label: dam.name,
              bassinVersant: dam?.bassin_versant || dam?.basin_name || basinNameById[bid] || "-",
              cumul: stats.cumul,
              moyenne: stats.moyenne,
              min: stats.min,
              max: stats.max,
            } as BasinCumulRow;
          }),
        );
        if (!cancelled) setCumulRows(rows);
      } catch (error) {
        if (!cancelled) setCumulRows([]);
      } finally {
        if (!cancelled) setCumulLoading(false);
      }
    };

    fetchCumul();
    return () => {
      cancelled = true;
    };
  }, [
    isBasinView,
    availableBasins,
    availableDams,
    allStations,
    basinNameById,
    dateRange.end,
    dateRange.start,
    primarySummarySource,
    continuityActive,
    continuityOrder,
    variableSelection.sources,
    stationCountByBasinId,
    variableSelection.variableCode,
  ]);

  const sortedCumulRows = useMemo(() => [...cumulRows].sort((a, b) => b.cumul - a.cumul), [cumulRows]);

  const cumulTotals = useMemo(() => {
    if (sortedCumulRows.length === 0) {
      return { cumul: 0, moyenne: 0, min: 0, max: 0, nbStations: 0 };
    }
    const cumul = sortedCumulRows.reduce((sum, row) => sum + row.cumul, 0);
    const moyenne = sortedCumulRows.reduce((sum, row) => sum + row.moyenne, 0) / sortedCumulRows.length;
    const min = Math.min(...sortedCumulRows.map((row) => row.min));
    const max = Math.max(...sortedCumulRows.map((row) => row.max));
    const nbStations = sortedCumulRows.reduce((sum, row) => sum + (row.nbStations || 0), 0);
    return { cumul, moyenne, min, max, nbStations };
  }, [sortedCumulRows]);

  const cumulTitle = `Cumul Precipitations - ${isBasinView ? "Bassins" : "Barrages"} - du ${formatDate(dateRange.start)} au ${formatDate(dateRange.end)}`;

  const exportCumulExcel = () => {
    const rows = isBasinView
      ? sortedCumulRows.map((row) => ({
          Bassin: row.label,
          "Cumul (mm)": Number(format1(row.cumul)),
          "Moyenne (mm)": Number(format1(row.moyenne)),
          "Min (mm)": Number(format1(row.min)),
          "Max (mm)": Number(format1(row.max)),
          "Nb Stations": row.nbStations || 0,
        }))
      : sortedCumulRows.map((row) => ({
          Barrage: row.label,
          "Bassin versant": row.bassinVersant || "-",
          "Cumul (mm)": Number(format1(row.cumul)),
          "Moyenne (mm)": Number(format1(row.moyenne)),
          "Min (mm)": Number(format1(row.min)),
          "Max (mm)": Number(format1(row.max)),
        }));

    rows.push(
      isBasinView
        ? {
            Bassin: "Total / Moyenne",
            "Cumul (mm)": Number(format1(cumulTotals.cumul)),
            "Moyenne (mm)": Number(format1(cumulTotals.moyenne)),
            "Min (mm)": Number(format1(cumulTotals.min)),
            "Max (mm)": Number(format1(cumulTotals.max)),
            "Nb Stations": cumulTotals.nbStations,
          }
        : {
            Barrage: "Total / Moyenne",
            "Bassin versant": "",
            "Cumul (mm)": Number(format1(cumulTotals.cumul)),
            "Moyenne (mm)": Number(format1(cumulTotals.moyenne)),
            "Min (mm)": Number(format1(cumulTotals.min)),
            "Max (mm)": Number(format1(cumulTotals.max)),
          },
    );

    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Cumul");
    XLSX.writeFile(wb, `cumul_precipitations_${isBasinView ? "bassins" : "barrages"}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportCumulGraph = () => {
    exportToCSV(
      sortedCumulRows.map((row) => ({
        nom: row.label,
        cumul_mm: Number(format1(row.cumul)),
        moyenne_mm: Number(format1(row.moyenne)),
        min_mm: Number(format1(row.min)),
        max_mm: Number(format1(row.max)),
      })),
      `cumul_graph_${isBasinView ? "bassins" : "barrages"}_${new Date().toISOString().slice(0, 10)}`,
      "cumul",
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Precipitations</h2>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isBasinView && (
            <>
              <span className="text-xs text-muted-foreground whitespace-nowrap">Shape :</span>
              <Select value={selectedShape} onValueChange={(value) => setSelectedShape(value as "DGM" | "ABH")}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Shape..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DGM">DGM</SelectItem>
                  <SelectItem value="ABH">ABH</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          <span className="text-xs text-muted-foreground whitespace-nowrap">{isBasinView ? "Bassin :" : "Station :"}</span>
          {isBasinView ? (
            <Select value={selectedBasinId} onValueChange={setSelectedBasinId}>
              <SelectTrigger className="w-[240px] h-8 text-xs">
                <SelectValue placeholder="Choisir un bassin..." />
              </SelectTrigger>
              <SelectContent>
                {availableBasins.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select value={selectedStationId} onValueChange={setSelectedStationId}>
              <SelectTrigger className="w-[240px] h-8 text-xs">
                <SelectValue placeholder="Choisir une station..." />
              </SelectTrigger>
              <SelectContent>
                {availableStations.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <CompactFilterBar
          filters={filters}
          onChange={setFilters}
          hideSources
          hidePeriod
          allowedSourceCodes={ALLOWED_PRECIP_SOURCE_CODES}
          sourceLabelOverrides={PRECIP_SOURCE_LABELS}
        />
      </div>
      {isBasinView && selectedShape === "DGM" && dgmBasinOptions.length === 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Aucun bassin DGM aligne avec le Scan des donnees (SHP + mapping) n&apos;a ete trouve.
        </div>
      )}

      <SingleVariableSelector
        onSelectionChange={setVariableSelection}
        availableVariables={availableVariables}
        availableSources={availableSources}
        defaultVariable="precip_mm"
        period={filters.period}
        onPeriodChange={(period) => setFilters((prev) => ({ ...prev, period }))}
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {variableSelection.variableLabel} - {currentEntityName || "..."}
            </CardTitle>
            <div className="flex items-center gap-2">
              {viewMode === "graph" && (
                <div className="flex items-center gap-2 mr-2">
                  <div className="flex items-center border rounded-md p-0.5 bg-muted/50">
                    <Button
                      variant={chartType === "line" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setChartType("line")}
                      title="Courbe"
                    >
                      <LineChart className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={chartType === "bar" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setChartType("bar")}
                      title="Batonnets"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </div>

                  {continuityAvailable && (
                    <Label className="flex items-center gap-2 text-xs cursor-pointer px-2 py-1 rounded hover:bg-muted/50">
                      <Checkbox
                        checked={continuityEnabled}
                        onCheckedChange={(checked) => setContinuityEnabled(Boolean(checked))}
                      />
                      Mode continuite
                    </Label>
                  )}
                </div>
              )}

              <ViewModeToggle
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onExport={handleExport}
                disabled={chartData.length === 0}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "graph" ? (
            <div className="space-y-2">
              {continuityActive && continuityOrder.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Priorite :</span>
                  {continuityOrder.map((sourceCode, index) => (
                    <Select
                      key={`continuity-priority-${index}`}
                      value={sourceCode}
                      onValueChange={(nextSourceCode) => handleContinuityOrderChange(index, nextSourceCode)}
                    >
                      <SelectTrigger className="h-7 w-[150px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {continuityOrder.map((candidateSourceCode) => (
                          <SelectItem key={`continuity-candidate-${index}-${candidateSourceCode}`} value={candidateSourceCode}>
                            P{index + 1} - {sourceLabelByCode[candidateSourceCode] || candidateSourceCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ))}
                </div>
              )}

              <EnhancedMultiSourceChart
                stationId={isBasinView ? selectedBasinQueryId : selectedStationId}
                variableCode={variableSelection.variableCode}
                variableLabel={variableSelection.variableLabel}
                unit={variableSelection.unit}
                sources={variableSelection.sources}
                startDate={dateRange.start}
                endDate={dateRange.end}
                chartType={chartType}
                entityType={isBasinView ? "bassins" : "stations"}
                continuityEnabled={continuityActive}
                continuityPriority={continuityOrder}
                onDataLoaded={setChartData}
              />
              {isBasinView && selectedShape === "DGM" && selectedBasinId && chartData.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  Aucune valeur disponible pour ce bassin DGM sur la periode et les sources selectionnees.
                </div>
              )}
            </div>
          ) : (
            <DataTable
              data={chartData}
              sources={variableSelection.sources}
              unit={variableSelection.unit}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">{cumulTitle}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
                <Button
                  variant={cumulView === "graphique" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs gap-1.5"
                  onClick={() => setCumulView("graphique")}
                >
                  <LineChart className="h-3.5 w-3.5" />
                  Graphique
                </Button>
                <Button
                  variant={cumulView === "tableau" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs gap-1.5"
                  onClick={() => setCumulView("tableau")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Tableau
                </Button>
              </div>

              {cumulView === "tableau" ? (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportCumulExcel} disabled={sortedCumulRows.length === 0}>
                  Exporter Excel
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportCumulGraph} disabled={sortedCumulRows.length === 0}>
                  Exporter graphe
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {cumulLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Chargement des cumuls...</div>
          ) : sortedCumulRows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Aucune donnee disponible pour cette periode</div>
          ) : cumulView === "tableau" ? (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#1E3A5F] text-white">
                    {isBasinView ? (
                      <>
                        <th className="px-3 py-2 text-left font-bold">Bassin</th>
                        <th className="px-3 py-2 text-right font-bold">Cumul (mm)</th>
                        <th className="px-3 py-2 text-right font-bold">Moyenne (mm)</th>
                        <th className="px-3 py-2 text-right font-bold">Min (mm)</th>
                        <th className="px-3 py-2 text-right font-bold">Max (mm)</th>
                        <th className="px-3 py-2 text-right font-bold">Nb Stations</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-2 text-left font-bold">Barrage</th>
                        <th className="px-3 py-2 text-left font-bold">Bassin versant</th>
                        <th className="px-3 py-2 text-right font-bold">Cumul (mm)</th>
                        <th className="px-3 py-2 text-right font-bold">Moyenne (mm)</th>
                        <th className="px-3 py-2 text-right font-bold">Min (mm)</th>
                        <th className="px-3 py-2 text-right font-bold">Max (mm)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedCumulRows.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-[#F5F5F5]"}>
                      <td className="px-3 py-2 text-left">{row.label}</td>
                      {!isBasinView && <td className="px-3 py-2 text-left">{row.bassinVersant || "-"}</td>}
                      <td className="px-3 py-2 text-right">{format1(row.cumul)}</td>
                      <td className="px-3 py-2 text-right">{format1(row.moyenne)}</td>
                      <td className="px-3 py-2 text-right">{format1(row.min)}</td>
                      <td className="px-3 py-2 text-right">{format1(row.max)}</td>
                      {isBasinView && <td className="px-3 py-2 text-right">{row.nbStations || 0}</td>}
                    </tr>
                  ))}

                  <tr className="bg-gray-300 font-bold">
                    <td className="px-3 py-2 text-left">Total / Moyenne</td>
                    {!isBasinView && <td className="px-3 py-2" />}
                    <td className="px-3 py-2 text-right">{format1(cumulTotals.cumul)}</td>
                    <td className="px-3 py-2 text-right">{format1(cumulTotals.moyenne)}</td>
                    <td className="px-3 py-2 text-right">{format1(cumulTotals.min)}</td>
                    <td className="px-3 py-2 text-right">{format1(cumulTotals.max)}</td>
                    {isBasinView && <td className="px-3 py-2 text-right">{cumulTotals.nbStations}</td>}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div ref={cumulGraphRef} className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={sortedCumulRows} margin={{ top: 12, right: 32, left: 16, bottom: 72 }}>
                  <defs>
                    <linearGradient id="cumulBlueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#1D4ED8" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" angle={-20} textAnchor="end" interval={0} height={70} tick={{ fontSize: 11 }} padding={{ left: 12, right: 28 }} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: "mm", angle: -90, position: "insideLeft" }} />
                  <Tooltip
                    formatter={(value: any, name: any, payload: any) => {
                      const row = payload?.payload as BasinCumulRow;
                      if (!row) return [value, name];
                      return [
                        `Cumul ${format1(row.cumul)} mm | Moy ${format1(row.moyenne)} | Min ${format1(row.min)} | Max ${format1(row.max)}`,
                        "Statistiques",
                      ];
                    }}
                  />
                  <Bar dataKey="cumul" fill="url(#cumulBlueGradient)" radius={[4, 4, 0, 0]} name="Cumul (mm)" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
