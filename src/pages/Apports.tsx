import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MultiSourceChart } from "@/components/MultiSourceChart";
import { FilterBar, defaultFilters, type Filters } from "@/components/FilterBar";
import { dams, getDamFillPct, getDamStatus, getDamRecommendation, generateMultiSourceSeries, getBasinName } from "@/data/mockData";
import { CriticalityBadge } from "@/components/CriticalityBadge";

export default function Apports() {
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters, variable: "apport_hm3" });
  const [selectedDam, setSelectedDam] = useState<string>(dams[0]?.station_id || "");

  const dam = dams.find((d) => d.station_id === selectedDam);

  const series = useMemo(
    () => generateMultiSourceSeries(selectedDam, "apport_hm3", filters.sources),
    [selectedDam, filters.sources]
  );

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Apports</h2>
        <Badge variant="secondary" className="text-xs">Par barrage</Badge>
      </div>

      <FilterBar filters={filters} onChange={setFilters} hideVariable contextVariable="apport_hm3" />

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Remplissage</p>
              <p className="text-lg font-bold">{getDamFillPct(dam)}%</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Volume</p>
              <p className="text-lg font-bold">{dam.current_volume} hm³</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Capacité</p>
              <p className="text-lg font-bold">{dam.capacity} hm³</p>
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
          <CardTitle className="text-base">Apports — {dam?.name || ""}</CardTitle>
        </CardHeader>
        <CardContent>
          <MultiSourceChart
            series={series}
            variable="Apport"
            unit="hm³"
            chartType="line"
            height="400px"
          />
        </CardContent>
      </Card>

      {dam && (
        <Card className="bg-muted/50 border-0">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-1">Recommandation</p>
            <p className="text-sm">{getDamRecommendation(dam)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
