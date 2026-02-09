import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { thresholds as defaultThresholds } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [safe, setSafe] = useState(defaultThresholds.safe);
  const [warning, setWarning] = useState(defaultThresholds.warning);
  const { toast } = useToast();

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-xl font-bold">Paramètres</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seuils de criticité (% remplissage)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm">🟢 Normal ≥</Label>
              <Input type="number" value={safe} onChange={(e) => setSafe(Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Remplissage ≥ {safe}%</p>
            </div>
            <div>
              <Label className="text-sm">🟠 Vigilance ≥</Label>
              <Input type="number" value={warning} onChange={(e) => setWarning(Number(e.target.value))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">{warning}% ≤ remplissage &lt; {safe}%</p>
            </div>
            <div>
              <Label className="text-sm">🔴 Critique &lt;</Label>
              <Input type="number" value={warning} disabled className="mt-1 opacity-60" />
              <p className="text-xs text-muted-foreground mt-1">Remplissage &lt; {warning}%</p>
            </div>
          </div>
          <Button
            onClick={() =>
              toast({ title: "Seuils sauvegardés", description: `Normal ≥ ${safe}%, Vigilance ≥ ${warning}%` })
            }
          >
            Sauvegarder
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scénarios de simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {["RCP 4.5 — Horizon 2030", "RCP 8.5 — Horizon 2030", "RCP 4.5 — Horizon 2050"].map((s) => (
              <div key={s} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">{s}</span>
                <span className="text-xs text-muted-foreground">Mock</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
