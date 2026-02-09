import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Import() {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-xl font-bold">Import de données</h2>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Prototype — L'import est simulé. En production, les fichiers seront envoyés au backend FastAPI via <code className="text-xs bg-muted px-1 rounded">POST /import</code>.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Téléverser des fichiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Glissez vos fichiers ici</p>
            <p className="text-xs text-muted-foreground mt-1">CSV, GeoJSON, Shapefile (.shp + .dbf + .shx)</p>
            <Button variant="outline" className="mt-4">Parcourir</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formats acceptés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Séries temporelles", desc: "CSV : datetime, entity_type, entity_id, variable, value", ext: ".csv" },
              { title: "Entités géographiques", desc: "GeoJSON FeatureCollection (bassins, stations, barrages)", ext: ".geojson" },
              { title: "Configuration seuils", desc: "JSON avec seuils configurables par variable et entité", ext: ".json" },
            ].map((f) => (
              <div key={f.title} className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{f.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
                <code className="text-xs mt-1 inline-block bg-card px-1.5 py-0.5 rounded">{f.ext}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
