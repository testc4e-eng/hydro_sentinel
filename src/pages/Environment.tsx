import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHealth } from "@/hooks/useApi";
import { Loader2, CheckCircle2, XCircle, Server, Database, Clock, Globe } from "lucide-react";

export default function Environment() {
  const { data: result, isLoading, error } = useHealth();
  const health = result?.data;
  const fromApi = result?.fromApi ?? false;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Connexion / Environnement</h2>
        {fromApi ? (
          <Badge className="bg-safe text-safe-foreground">API connectée</Badge>
        ) : (
          <Badge variant="outline" className="text-warning border-warning/30">Mode mock</Badge>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Vérification de la connexion…
        </div>
      )}

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="p-4 text-sm text-destructive">
            Erreur lors de la vérification : {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" /> Mode de données
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">DATA_MODE</span>
                  <Badge variant="secondary" className="font-mono text-xs">{health.data_mode}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Source des données</span>
                  <span className="text-sm font-medium">{fromApi ? "API Backend" : "Données mock locales"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> Backend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">URL de base</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{health.backend_url}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Préfixe API</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                    {import.meta.env.VITE_API_PREFIX || "/api/v1"}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" /> Base de données
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">État DB</span>
                <div className="flex items-center gap-1.5">
                  {health.db_status === "connected" ? (
                    <><CheckCircle2 className="h-4 w-4 text-safe" /><span className="text-sm text-safe">Connectée</span></>
                  ) : health.db_status === "disconnected" ? (
                    <><XCircle className="h-4 w-4 text-critical" /><span className="text-sm text-critical">Déconnectée</span></>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A (mode mock)</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Dernier run
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">run_time</span>
                <span className="text-sm font-medium">
                  {health.last_run_time
                    ? new Date(health.last_run_time).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
                    : "Aucun"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Variables d'environnement frontend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">VITE_API_BASE_URL</span>
              <span>=</span>
              <span>{import.meta.env.VITE_API_BASE_URL || "(non défini)"}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">VITE_API_PREFIX</span>
              <span>=</span>
              <span>{import.meta.env.VITE_API_PREFIX || "/api/v1 (défaut)"}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Pour connecter le backend, définissez <code className="bg-muted px-1 rounded">VITE_API_BASE_URL</code> (ex: <code className="bg-muted px-1 rounded">http://localhost:8000</code>).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
