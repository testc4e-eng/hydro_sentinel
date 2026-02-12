import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MultiSourceChart } from "@/components/MultiSourceChart";
import { FilterBar, defaultFilters, type Filters } from "@/components/FilterBar";
import { dams, getDamFillPct, getDamStatus, generateMultiSourceSeries, getBasinName } from "@/data/mockData";
import { CriticalityBadge } from "@/components/CriticalityBadge";

export default function Lachers() {
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters, variable: "lacher_m3s" });
  const [selectedDam, setSelectedDam] = useState<string>(dams[0]?.station_id || "");

  const dam = dams.find((d) => d.station_id === selectedDam);

  const series = useMemo(
    () => generateMultiSourceSeries(selectedDam, "lacher_m3s", filters.sources),
    [selectedDam, filters.sources]
  );

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Lâchers</h2>
        <Badge variant="secondary" className="text-xs">Par barrage</Badge>
      </div>

      <FilterBar filters={filters} onChange={setFilters} hideVariable contextVariable="lacher_m3s" />

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Barrage :</span>
        <Select value={selectedDam} onValueChange={setSelectedDam}>
          <SelectTrigger className="w-[240px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dams.map((d) => (
              <SelectItem key={d.station_id} value={d.station_id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dam && <CriticalityBadge status={getDamStatus(dam)} />}
      </div>

      {dam && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Remplissage</p>
              <p className="text-lg font-bold">{getDamFillPct(dam)}%</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Volume actuel</p>
              <p className="text-lg font-bold">{dam.current_volume} hm³</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Bassin</p>
              <p className="text-lg font-bold">{getBasinName(dam.basin_id)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lâchers — {dam?.name || ""}</CardTitle>
        </CardHeader>
        <CardContent>
          <MultiSourceChart
            series={series}
            variable="Lâcher"
            unit="m³/s"
            chartType="line"
            height="400px"
          />
        </CardContent>
      </Card>
    </div>
  );
}
