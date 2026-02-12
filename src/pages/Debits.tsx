import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MultiSourceChart } from "@/components/MultiSourceChart";
import { FilterBar, defaultFilters, type Filters } from "@/components/FilterBar";
import { stations, generateMultiSourceSeries } from "@/data/mockData";
import { useStations } from "@/hooks/useApi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function Debits() {
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters, variable: "debit_m3s", sources: ["HEC_HMS"] });
  const [selectedStation, setSelectedStation] = useState<string>(stations.filter(s => s.type === "station")[0]?.id || "");
  const { data: stResult } = useStations({ type: "station", basin_id: filters.basin_id || undefined });
  const availableStations = stResult?.data ?? stations.filter(s => s.type === "station");

  const activeSources = filters.sources.filter(s => s !== "OBS"); // OBS débit pas encore dispo
  const series = useMemo(
    () => generateMultiSourceSeries(selectedStation, "debit_m3s", activeSources.length > 0 ? activeSources : ["HEC_HMS"]),
    [selectedStation, activeSources]
  );

  const st = availableStations.find((s) => s.id === selectedStation);
  const obsRequested = filters.sources.includes("OBS");

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Débits</h2>
        <Badge variant="secondary" className="text-xs">Par station</Badge>
      </div>

      <FilterBar filters={filters} onChange={setFilters} hideVariable contextVariable="debit_m3s" />

      {obsRequested && (
        <Alert className="border-warning/30 bg-warning/5">
          <Info className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            <strong>OBS Débit</strong> — Données observées non encore disponibles.
            <Badge variant="outline" className="ml-2 text-[10px] text-warning border-warning/30">Bientôt disponible</Badge>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Station :</span>
        <Select value={selectedStation} onValueChange={setSelectedStation}>
          <SelectTrigger className="w-[240px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableStations.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Débit — {st?.name || ""}
            <span className="text-xs text-muted-foreground ml-2">HEC-HMS (SIM)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MultiSourceChart
            series={series}
            variable="Débit"
            unit="m³/s"
            chartType="line"
            height="400px"
          />
        </CardContent>
      </Card>
    </div>
  );
}
