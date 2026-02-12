import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HydroMap } from "@/components/HydroMap";
import { KPICards } from "@/components/KPICards";
import { AlertsList } from "@/components/AlertsList";
import { MultiSourceChart } from "@/components/MultiSourceChart";
import { FilterBar, defaultFilters, type Filters } from "@/components/FilterBar";
import { stations, dams, getDamStatus, getDamFillPct, getDamRecommendation, getBasinName, generateMultiSourceSeries } from "@/data/mockData";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CriticalityBadge } from "@/components/CriticalityBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const [selected, setSelected] = useState<{ type: string; id: string } | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const selectedStation = selected?.type === "station" ? stations.find((s) => s.id === selected.id) : null;
  const selectedDam = selected?.type === "dam" ? dams.find((d) => d.id === selected.id) : null;
  const entityName = selectedStation?.name ?? selectedDam?.name ?? "";

  const detailSeries = useMemo(() => {
    if (!selected) return {};
    const id = selected.id;
    const variable = selectedDam ? "apport_hm3" : filters.variable || "precip_mm";
    return generateMultiSourceSeries(id, variable, filters.sources);
  }, [selected, filters.sources, filters.variable, selectedDam]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <FilterBar filters={filters} onChange={setFilters} />

      <KPICards basinId={filters.basin_id || undefined} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Carte des bassins — Sebou</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[420px]">
              <HydroMap onSelectEntity={(type, id) => setSelected({ type, id })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alertes</CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[420px]">
            <AlertsList />
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {entityName}
              {selectedDam && <CriticalityBadge status={getDamStatus(selectedDam)} />}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {selectedDam && (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Bassin</span><span>{getBasinName(selectedDam.basin_id)}</span>
                  <span className="text-muted-foreground">Capacité</span><span>{selectedDam.capacity} hm³</span>
                  <span className="text-muted-foreground">Volume</span><span>{selectedDam.current_volume} hm³</span>
                  <span className="text-muted-foreground">Remplissage</span><span>{getDamFillPct(selectedDam)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${getDamFillPct(selectedDam)}%`,
                      backgroundColor:
                        getDamStatus(selectedDam) === "safe" ? "hsl(var(--safe))" :
                        getDamStatus(selectedDam) === "warning" ? "hsl(var(--warning))" : "hsl(var(--critical))",
                    }}
                  />
                </div>
                <Card className="bg-muted/50 border-0">
                  <CardContent className="p-3">
                    <p className="text-sm font-medium mb-1">Recommandation</p>
                    <p className="text-sm">{getDamRecommendation(selectedDam)}</p>
                  </CardContent>
                </Card>
              </>
            )}
            {selectedStation && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Type</span><span>{selectedStation.type}</span>
                <span className="text-muted-foreground">Bassin</span><span>{getBasinName(selectedStation.basin_id)}</span>
                <span className="text-muted-foreground">Coordonnées</span><span>{selectedStation.lat}, {selectedStation.lon}</span>
              </div>
            )}

            <Tabs defaultValue="graph">
              <TabsList className="w-full">
                <TabsTrigger value="graph" className="flex-1 text-xs">Graph</TabsTrigger>
                <TabsTrigger value="infos" className="flex-1 text-xs">Infos</TabsTrigger>
              </TabsList>
              <TabsContent value="graph">
                <div className="h-[280px]">
                  <MultiSourceChart
                    series={detailSeries}
                    variable={selectedDam ? "Apport" : "Précipitation"}
                    unit={selectedDam ? "hm³" : "mm"}
                    height="280px"
                    showDataZoom={false}
                  />
                </div>
              </TabsContent>
              <TabsContent value="infos">
                <div className="text-sm text-muted-foreground space-y-2 p-2">
                  <p>Sources sélectionnées : {filters.sources.join(", ")}</p>
                  <p>Période : {filters.period}</p>
                  <p>Agrégation : {filters.aggregation}</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
