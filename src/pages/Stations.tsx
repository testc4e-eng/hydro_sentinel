import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { stations, getBasinName } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TimeseriesChart } from "@/components/TimeseriesChart";

export default function Stations() {
  const [selected, setSelected] = useState<string | null>(null);
  const st = stations.find((s) => s.id === selected);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-xl font-bold">Stations</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bassin</TableHead>
                <TableHead>Lat</TableHead>
                <TableHead>Lon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stations.map((s) => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(s.id)}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell><Badge variant="secondary">{s.type}</Badge></TableCell>
                  <TableCell>{getBasinName(s.basin_id)}</TableCell>
                  <TableCell className="text-muted-foreground">{s.lat}</TableCell>
                  <TableCell className="text-muted-foreground">{s.lon}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{st?.name}</SheetTitle>
          </SheetHeader>
          {st && (
            <div className="mt-4 space-y-4">
              <p className="text-sm"><span className="text-muted-foreground">Type :</span> {st.type}</p>
              <p className="text-sm"><span className="text-muted-foreground">Bassin :</span> {getBasinName(st.basin_id)}</p>
              <p className="text-sm"><span className="text-muted-foreground">Coordonnées :</span> {st.lat}, {st.lon}</p>
              <div>
                <h4 className="text-sm font-medium mb-2">Observé vs Simulé</h4>
                <div className="h-[250px]">
                  <TimeseriesChart entityId={st.id} />
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
