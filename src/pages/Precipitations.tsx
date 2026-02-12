import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MultiSourceChart } from "@/components/MultiSourceChart";
import { FilterBar, defaultFilters, type Filters } from "@/components/FilterBar";
import { stations, generateMultiSourceSeries, type Station } from "@/data/mockData";
import { useStations } from "@/hooks/useApi";

const ALL = "__all__";

export default function Precipitations() {
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters, variable: "precip_mm" });
  const [selectedStation, setSelectedStation] = useState<string>(stations[0]?.id || "");
  const { data: stResult } = useStations({ basin_id: filters.basin_id || undefined });
  const availableStations = stResult?.data ?? stations;

  const series = useMemo(
    () => generateMultiSourceSeries(selectedStation, "precip_mm", filters.sources),
    [selectedStation, filters.sources]
  );

  const st = availableStations.find((s) => s.id === selectedStation);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Précipitations</h2>
        <Badge variant="secondary" className="text-xs">Par station</Badge>
      </div>

      <FilterBar filters={filters} onChange={setFilters} hideVariable contextVariable="precip_mm" />

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Station :</span>
        <Select value={selectedStation} onValueChange={setSelectedStation}>
          <SelectTrigger className="w-[240px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableStations.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name} ({s.type})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Précipitations — {st?.name || ""}
            <span className="text-xs text-muted-foreground ml-2">
              OBS + AROME (4j) + ECMWF (12j)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MultiSourceChart
            series={series}
            variable="Précipitation"
            unit="mm"
            chartType="bar"
            height="400px"
          />
        </CardContent>
      </Card>
    </div>
  );
}
