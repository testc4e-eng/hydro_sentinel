import { Card, CardContent } from "@/components/ui/card";
import { Droplets, AlertTriangle, Activity, Database } from "lucide-react";
import { stations, dams, getDamFillPct, getAlerts } from "@/data/mockData";

const kpis = [
  { label: "Stations", value: String(stations.length), icon: Activity, desc: "actives", accent: false },
  { label: "Alertes", value: String(getAlerts().filter((a) => a.status !== "safe").length), icon: AlertTriangle, desc: "en cours", accent: true },
  { label: "Remplissage moy.", value: Math.round(dams.reduce((s, d) => s + getDamFillPct(d), 0) / dams.length) + "%", icon: Droplets, desc: "barrages", accent: false },
  { label: "Volume stocké", value: Math.round(dams.reduce((s, d) => s + d.current_volume, 0)) + " Mm³", icon: Database, desc: "total", accent: false },
];

export function KPICards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((k) => (
        <Card key={k.label} className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${k.accent ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"}`}>
              <k.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label} · {k.desc}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
