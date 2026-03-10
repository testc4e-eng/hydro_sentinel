import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SingleVariableSelector, type VariableSourceSelection } from "@/components/analysis/SingleVariableSelector";
import { EnhancedMultiSourceChart } from "@/components/analysis/EnhancedMultiSourceChart";
import { ViewModeToggle, type ViewMode } from "@/components/analysis/ViewModeToggle";
import { DataTable } from "@/components/analysis/DataTable";
import { CompactFilterBar, defaultCompactFilters, type CompactFilters } from "@/components/CompactFilterBar";
import { useDams, useSources } from "@/hooks/useApi";
import { CriticalityBadge } from "@/components/CriticalityBadge";
import { exportToCSV } from "@/lib/exportUtils";
import { BarChart3, LineChart } from "lucide-react";
import { api } from "@/lib/api";

const OBS_CODE = "OBS";
const SIM_CANDIDATE_CODES = ["SIM", "HEC_HMS"];

export default function Volume() {
  const { data: sourcesResult } = useSources();
  const rawSources = Array.isArray((sourcesResult as any)?.data?.data)
    ? (sourcesResult as any).data.data
    : Array.isArray(sourcesResult)
      ? sourcesResult
      : [];

  const simulatedSourceCode = useMemo(() => {
    const found = rawSources.find((s: any) => SIM_CANDIDATE_CODES.includes(s.code));
    return found?.code ?? "SIM";
  }, [rawSources]);

  const allowedSourceCodes = useMemo(() => [OBS_CODE, simulatedSourceCode], [simulatedSourceCode]);
  const sourceLabelOverrides = useMemo(
    () => ({
      [OBS_CODE]: "Observations",
      [simulatedSourceCode]: "Simulé",
    }),
    [simulatedSourceCode],
  );

  const [filters, setFilters] = useState<CompactFilters>({
    ...defaultCompactFilters,
    period: "14d",
    sources: [OBS_CODE],
  });
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [continuityEnabled, setContinuityEnabled] = useState(false);
  const [continuityOrder, setContinuityOrder] = useState<string[]>([OBS_CODE, simulatedSourceCode]);
  const [chartData, setChartData] = useState<any[]>([]);
  const { data: damsResult } = useDams();
  const [selectedDamId, setSelectedDamId] = useState<string>("");
  const [stationsWithObsVolume, setStationsWithObsVolume] = useState<Set<string>>(new Set());

  const [variableSelection, setVariableSelection] = useState<VariableSourceSelection>({
    variableCode: "volume_hm3",
    variableLabel: "Volume",
    unit: "Mm³",
    sources: [OBS_CODE],
  });

  const handleExport = () => {
    const dam = availableStations.find((d: any) => d.id === selectedDamId);
    const filename = `volume_${dam?.name || "data"}_${new Date().toISOString().split("T")[0]}`;
    exportToCSV(chartData, filename, variableSelection.variableLabel);
  };

  useEffect(() => {
    api
      .get("/map/points-kpi")
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        const ids = rows
          .filter((r: any) => r.volume_hm3_latest !== null && r.volume_hm3_latest !== undefined)
          .map((r: any) => String(r.station_id));
        setStationsWithObsVolume(new Set(ids));
      })
      .catch((err) => console.error("Failed to load volume coverage", err));
  }, []);

  const availableStations = useMemo(() => {
    const list = (damsResult?.data ?? []).filter((s: any) => s.type.toLowerCase() === "barrage");
    return [...list].sort((a: any, b: any) => {
      const aHas = stationsWithObsVolume.has(String(a.id));
      const bHas = stationsWithObsVolume.has(String(b.id));
      if (aHas !== bHas) return aHas ? -1 : 1;
      return String(a.name).localeCompare(String(b.name));
    });
  }, [damsResult, stationsWithObsVolume]);

  useEffect(() => {
    if (!selectedDamId && availableStations.length > 0) {
      const defaultSt = availableStations.find((s: any) => s.name.includes("Wahda")) || availableStations[0];
      setSelectedDamId(defaultSt.id);
    }
  }, [availableStations, selectedDamId]);

  const dam = availableStations.find((d: any) => d.id === selectedDamId);
  const selectedHasObsVolume = selectedDamId ? stationsWithObsVolume.has(selectedDamId) : true;

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

  const availableVariables = [{ code: "volume_hm3", label: "Volume", unit: "Mm³" }];
  const continuityDefaultOrder = useMemo(() => [OBS_CODE, simulatedSourceCode], [simulatedSourceCode]);
  const getDamStatus = (_d: any): "safe" | "warning" | "critical" => "safe";

  const availableSources = useMemo(
    () =>
      rawSources
        .filter((s: any) => allowedSourceCodes.includes(s.code))
        .map((s: any) => ({ code: s.code, label: sourceLabelOverrides[s.code] ?? s.label })),
    [allowedSourceCodes, rawSources, sourceLabelOverrides],
  );
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
      const fromDefault = continuityDefaultOrder.filter(
        (source) => selectedSources.includes(source) && !kept.includes(source),
      );
      const others = selectedSources.filter(
        (source) => !continuityDefaultOrder.includes(source) && !kept.includes(source),
      );
      return [...kept, ...fromDefault, ...others];
    });
  }, [continuityDefaultOrder, variableSelection.sources]);

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

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Volume</h2>
        <Badge variant="secondary" className="text-xs">Par barrage</Badge>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Barrage :</span>
          <Select value={selectedDamId} onValueChange={setSelectedDamId}>
            <SelectTrigger className="w-[240px] h-8 text-xs">
              <SelectValue placeholder="Choisir un barrage..." />
            </SelectTrigger>
            <SelectContent>
              {availableStations.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}{!stationsWithObsVolume.has(String(d.id)) ? " (sans donnees OBS)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dam && <CriticalityBadge status={getDamStatus(dam)} />}
          {!selectedHasObsVolume && (
            <Badge variant="outline" className="text-xs">
              Ce barrage n'a pas de volume OBS
            </Badge>
          )}
        </div>

        <CompactFilterBar
          filters={filters}
          onChange={setFilters}
          allowedSourceCodes={allowedSourceCodes}
          sourceLabelOverrides={sourceLabelOverrides}
        />
      </div>

      <SingleVariableSelector
        onSelectionChange={setVariableSelection}
        availableVariables={availableVariables}
        availableSources={availableSources}
        defaultVariable="volume_hm3"
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {variableSelection.variableLabel} - {dam?.name || "..."}
            </CardTitle>
            <div className="flex items-center gap-2">
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
                    title="Bâtonnets"
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
                    Mode continuité
                  </Label>
                )}
              </div>
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
                  <span className="text-xs text-muted-foreground">Priorité :</span>
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
                stationId={selectedDamId}
                variableCode={variableSelection.variableCode}
                variableLabel={variableSelection.variableLabel}
                unit={variableSelection.unit}
                sources={variableSelection.sources}
                startDate={dateRange.start}
                endDate={dateRange.end}
                chartType={chartType}
                continuityEnabled={continuityActive}
                continuityPriority={continuityOrder}
                onDataLoaded={setChartData}
              />
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
    </div>
  );
}
