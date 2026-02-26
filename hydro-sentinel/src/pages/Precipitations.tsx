import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SingleVariableSelector, type VariableSourceSelection } from "@/components/analysis/SingleVariableSelector";
import { EnhancedMultiSourceChart } from "@/components/analysis/EnhancedMultiSourceChart";
import { ViewModeToggle, type ViewMode } from "@/components/analysis/ViewModeToggle";
import { DataTable } from "@/components/analysis/DataTable";
import { CompactFilterBar, defaultCompactFilters, type CompactFilters } from "@/components/CompactFilterBar";
import { useStations, useSources, useBasins } from "@/hooks/useApi";
import { exportToCSV } from "@/lib/exportUtils";
import { BarChart3, LineChart } from "lucide-react";

const ALLOWED_PRECIP_SOURCE_CODES = ["OBS", "AROME", "ECMWF"];
const PRECIP_SOURCE_LABELS: Record<string, string> = {
  OBS: "Observations",
  AROME: "Prévisions AROME",
  ECMWF: "Prévisions ECMWF",
};

export default function Precipitations() {
  const location = useLocation();
  const isBasinView = location.pathname.includes("/bassin");

  // Default period: 14d (interpreted as -7/+7)
  const [filters, setFilters] = useState<CompactFilters>({ ...defaultCompactFilters, period: "14d" });
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [chartData, setChartData] = useState<any[]>([]);
  const { data: stResult } = useStations({});
  const { data: basinsResult } = useBasins();
  const { data: sourcesResult } = useSources();
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [selectedBasinId, setSelectedBasinId] = useState<string>("");

  const [variableSelection, setVariableSelection] = useState<VariableSourceSelection>({
    variableCode: "precip_mm",
    variableLabel: "Précipitations",
    unit: "mm",
    sources: ["OBS", "AROME", "ECMWF"],
  });

  const handleExport = () => {
    const st = availableStations.find((s) => s.id === selectedStationId);
    const filename = `precipitations_${st?.name || "data"}_${new Date().toISOString().split("T")[0]}`;
    exportToCSV(chartData, filename, variableSelection.variableLabel);
  };

  const availableStations = useMemo(() => {
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

  useEffect(() => {
    if (availableStations.length === 0) return;
    const exists = availableStations.some((s) => s.id === selectedStationId);
    if (!selectedStationId || !exists) {
      setSelectedStationId(availableStations[0].id);
    }
  }, [availableStations, selectedStationId]);

  const availableBasins = basinsResult?.data ?? [];
  useEffect(() => {
    if (!isBasinView || availableBasins.length === 0) return;
    const exists = availableBasins.some((b: any) => b.id === selectedBasinId);
    if (!selectedBasinId || !exists) {
      setSelectedBasinId(availableBasins[0].id);
    }
  }, [isBasinView, availableBasins, selectedBasinId]);

  const st = availableStations.find((s) => s.id === selectedStationId);
  const basin = availableBasins.find((b: any) => b.id === selectedBasinId);
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
      default:
        start.setDate(end.getDate() - 7);
    }

    return { start: start.toISOString(), end: end.toISOString() };
  }, [filters.period]);

  const availableVariables = [{ code: "precip_mm", label: "Précipitations", unit: "mm" }];

  const availableSources = useMemo(() => {
    const sourceList = sourcesResult?.data?.data ?? [];
    return sourceList
      .filter((s: any) => ALLOWED_PRECIP_SOURCE_CODES.includes(s.code))
      .map((s: any) => ({
        code: s.code,
        label: PRECIP_SOURCE_LABELS[s.code] ?? s.label,
      }));
  }, [sourcesResult]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Précipitations</h2>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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
          allowedSourceCodes={ALLOWED_PRECIP_SOURCE_CODES}
          sourceLabelOverrides={PRECIP_SOURCE_LABELS}
        />
      </div>

      <SingleVariableSelector
        onSelectionChange={setVariableSelection}
        availableVariables={availableVariables}
        availableSources={availableSources}
        defaultVariable="precip_mm"
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {variableSelection.variableLabel} - {currentEntityName || "..."}
            </CardTitle>
            <div className="flex items-center gap-2">
              {viewMode === "graph" && !isBasinView && (
                <div className="flex items-center border rounded-md p-0.5 bg-muted/50 mr-2">
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
            <EnhancedMultiSourceChart
              stationId={isBasinView ? selectedBasinId : selectedStationId}
              variableCode={variableSelection.variableCode}
              variableLabel={variableSelection.variableLabel}
              unit={variableSelection.unit}
              sources={variableSelection.sources}
              startDate={dateRange.start}
              endDate={dateRange.end}
              chartType={chartType}
              entityType={isBasinView ? "bassins" : "stations"}
              onDataLoaded={setChartData}
            />
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
