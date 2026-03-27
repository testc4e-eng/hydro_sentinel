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

const OBS_CODE = "OBS";
const SIM_CANDIDATE_CODES = ["SIM", "HEC_HMS"];

export default function Apports() {
  const { data: sourcesResult } = useSources();
  const rawSources = sourcesResult?.data?.data ?? [];

  const simulatedSourceCode = useMemo(() => {
    for (const candidate of SIM_CANDIDATE_CODES) {
      const found = rawSources.find((s: any) => s.code === candidate);
      if (found?.code) return found.code;
    }
    return "SIM";
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

  const [variableSelection, setVariableSelection] = useState<VariableSourceSelection>({
    variableCode: "inflow_m3s",
    variableLabel: "Apport",
    unit: "m³/s",
    sources: [OBS_CODE],
  });

  const handleExport = () => {
    const dam = availableStations.find((d: any) => d.id === selectedDamId);
    const filename = `apports_${dam?.name || "data"}_${new Date().toISOString().split("T")[0]}`;
    exportToCSV(chartData, filename, variableSelection.variableLabel);
  };

  const availableStations = (damsResult?.data ?? []).filter((s: any) => s.type.toLowerCase() === "barrage");

  useEffect(() => {
    if (!selectedDamId && availableStations.length > 0) {
      const defaultSt = availableStations.find((s: any) => s.name.includes("Wahda")) || availableStations[0];
      setSelectedDamId(defaultSt.id);
    }
  }, [availableStations, selectedDamId]);

  const dam = availableStations.find((d: any) => d.id === selectedDamId);

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

  const availableVariables = [{ code: "inflow_m3s", label: "Apport", unit: "m³/s" }];
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
        <h2 className="text-xl font-bold">Apports</h2>
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
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dam && <CriticalityBadge status={getDamStatus(dam)} />}
        </div>

        <CompactFilterBar
          filters={filters}
          onChange={setFilters}
          hideSources
          hidePeriod
          allowedSourceCodes={allowedSourceCodes}
          sourceLabelOverrides={sourceLabelOverrides}
        />
      </div>

      <SingleVariableSelector
        onSelectionChange={setVariableSelection}
        availableVariables={availableVariables}
        availableSources={availableSources}
        defaultVariable="inflow_m3s"
        period={filters.period}
        onPeriodChange={(period) => setFilters((prev) => ({ ...prev, period }))}
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
