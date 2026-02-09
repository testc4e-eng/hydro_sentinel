import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HydroMap } from "@/components/HydroMap";
import { KPICards } from "@/components/KPICards";
import { AlertsList } from "@/components/AlertsList";
import { TimeseriesChart } from "@/components/TimeseriesChart";
import { stations, dams, getDamStatus, getDamFillPct, getDamRecommendation, getBasinName } from "@/data/mockData";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CriticalityBadge } from "@/components/CriticalityBadge";

export default function Dashboard() {
  const [selected, setSelected] = useState<{ type: string; id: string } | null>(null);

  const selectedStation = selected?.type === "station" ? stations.find((s) => s.id === selected.id) : null;
  const selectedDam = selected?.type === "dam" ? dams.find((d) => d.id === selected.id) : null;
  const entityName = selectedStation?.name ?? selectedDam?.name ?? "";

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <KPICards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Carte des bassins</CardTitle>
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Séries temporelles — Observé vs Simulé</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <TimeseriesChart />
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {entityName}
              {selectedDam && <CriticalityBadge status={getDamStatus(selectedDam)} />}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {selectedDam && (
              <>
                <p className="text-sm"><span className="text-muted-foreground">Bassin :</span> {getBasinName(selectedDam.basin_id)}</p>
                <p className="text-sm"><span className="text-muted-foreground">Capacité :</span> {selectedDam.capacity} Mm³</p>
                <p className="text-sm"><span className="text-muted-foreground">Volume actuel :</span> {selectedDam.current_volume} Mm³</p>
                <p className="text-sm"><span className="text-muted-foreground">Remplissage :</span> {getDamFillPct(selectedDam)}%</p>
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
              <>
                <p className="text-sm"><span className="text-muted-foreground">Type :</span> {selectedStation.type}</p>
                <p className="text-sm"><span className="text-muted-foreground">Bassin :</span> {getBasinName(selectedStation.basin_id)}</p>
                <p className="text-sm"><span className="text-muted-foreground">Coordonnées :</span> {selectedStation.lat}, {selectedStation.lon}</p>
              </>
            )}
            <div>
              <h4 className="text-sm font-medium mb-2">Observé vs Simulé</h4>
              <div className="h-[220px]">
                <TimeseriesChart entityId={selected?.id} />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
