import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Loader2, Download, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SourceAvailability {
  record_count: number;
  first_record: string | null;
  last_record: string | null;
}

interface VariableAvailability {
  total_records?: number;
  sources: Record<string, SourceAvailability>;
}

interface GroupAvailability {
  count: number;
  variables: Record<string, VariableAvailability>;
}

interface EntityAvailability {
  total_records: number;
  variable_count: number;
  source_count: number;
  first_record: string | null;
  last_record: string | null;
  variables: Record<string, VariableAvailability>;
}

interface StationEntityAvailability extends EntityAvailability {
  station_id: string;
  station_code: string | null;
  station_name: string;
  station_type: string;
  basin_id: string | null;
  basin_name: string | null;
}

interface BasinEntityAvailability extends EntityAvailability {
  basin_id: string;
  basin_code: string | null;
  basin_name: string;
  level: number | null;
}

interface VariableTimeStat {
  variable_code: string;
  record_count: number;
  entity_count: number;
  first_record: string | null;
  last_record: string | null;
  min_step_seconds: number | null;
  median_step_seconds: number | null;
  max_step_seconds: number | null;
  interval_count: number;
  distinct_steps: number;
}

interface DataAvailabilityReport {
  stations: Record<string, GroupAvailability>;
  basins: Record<string, GroupAvailability>;
  station_entities?: StationEntityAvailability[];
  basin_entities?: BasinEntityAvailability[];
  summary: {
    total_stations: number;
    total_basins: number;
    total_variables: number;
    total_sources: number;
    total_records: number;
    stations_with_data?: number;
    basins_with_data?: number;
    available_variables: string[];
    available_sources: string[];
    variable_time_stats?: VariableTimeStat[];
  };
}

function joinUrl(base: string, prefix: string) {
  const b = base.replace(/\/+$/, "");
  const p = (prefix || "").startsWith("/") ? prefix : `/${prefix || ""}`;
  return `${b}${p}`;
}

function formatDate(value: string | null): string {
  if (!value) return "Aucune";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return "Aucune serie";
  return `${formatDate(start)} -> ${formatDate(end)}`;
}

function formatCount(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString("fr-FR");
}

function formatStep(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "-";

  if (seconds % 86400 === 0) {
    const days = seconds / 86400;
    return `${days} j`;
  }
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return `${hours} h`;
  }
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} min`;
  }
  return `${seconds} s`;
}

type StationCategory = "barrage" | "station" | "other";
type StationDataFilter = "all" | "with" | "without";

function getStationCategory(stationType: string): StationCategory {
  const normalized = (stationType || "").toLowerCase();
  if (normalized.includes("barrage")) return "barrage";
  if (normalized.includes("station")) return "station";
  return "other";
}

function getCategoryLabel(category: StationCategory): string {
  if (category === "barrage") return "Barrages";
  if (category === "station") return "Stations";
  return "Autres";
}

function getStatusLabel(totalRecords: number): string {
  return totalRecords > 0 ? "Avec donnees" : "Sans donnees";
}

interface DeleteSourcePayload {
  entityType: "station" | "basin";
  entityId: string;
  entityName: string;
  variableCode: string;
  sourceCode: string;
  firstRecord?: string | null;
  lastRecord?: string | null;
}

function TimeseriesDetailsTable({
  variables,
  entityType,
  entityId,
  entityName,
  onDeleteSource,
  deletingKey,
}: {
  variables: Record<string, VariableAvailability>;
  entityType?: "station" | "basin";
  entityId?: string;
  entityName?: string;
  onDeleteSource?: (payload: DeleteSourcePayload) => Promise<void>;
  deletingKey?: string | null;
}) {
  const rows = useMemo(() => {
    return Object.entries(variables)
      .sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([variableCode, variableData]) => {
        const sources = Object.entries(variableData.sources).sort(([left], [right]) => left.localeCompare(right));
        return sources.map(([sourceCode, sourceData]) => ({
          variableCode,
          sourceCode,
          recordCount: sourceData.record_count,
          firstRecord: sourceData.first_record,
          lastRecord: sourceData.last_record,
        }));
      });
  }, [variables]);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune serie temporelle pour cette entite.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Variable</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Enregistrements</TableHead>
          <TableHead>Periode</TableHead>
          {onDeleteSource && entityId && entityType ? <TableHead className="text-right">Action</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.variableCode}:${row.sourceCode}`}>
            <TableCell className="font-medium">{row.variableCode}</TableCell>
            <TableCell>{row.sourceCode}</TableCell>
            <TableCell>{formatCount(row.recordCount)}</TableCell>
            <TableCell>{formatPeriod(row.firstRecord, row.lastRecord)}</TableCell>
            {onDeleteSource && entityId && entityType ? (
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-8"
                  disabled={deletingKey === `${entityType}:${entityId}:${row.variableCode}:${row.sourceCode}`}
                  onClick={() =>
                    onDeleteSource({
                      entityType,
                      entityId,
                      entityName: entityName || entityId,
                      variableCode: row.variableCode,
                      sourceCode: row.sourceCode,
                      firstRecord: row.firstRecord,
                      lastRecord: row.lastRecord,
                    })
                  }
                >
                  {deletingKey === `${entityType}:${entityId}:${row.variableCode}:${row.sourceCode}` ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1 h-3 w-3" />
                  )}
                  Supprimer
                </Button>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function DataAvailabilityScanner() {
  const SCAN_TIMEOUT_MS = 15000;
  const [loading, setLoading] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [report, setReport] = useState<DataAvailabilityReport | null>(null);
  const [stationFilter, setStationFilter] = useState("");
  const [basinFilter, setBasinFilter] = useState("");
  const [basinShape, setBasinShape] = useState<"ABH" | "DGM">("ABH");
  const [dgmBasinEntities, setDgmBasinEntities] = useState<BasinEntityAvailability[]>([]);
  const [stationTypeFilter, setStationTypeFilter] = useState<StationCategory | "all">("all");
  const [stationDataFilter, setStationDataFilter] = useState<StationDataFilter>("all");
  const { toast } = useToast();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const apiPrefix = import.meta.env.VITE_API_PREFIX || "/api/v1";

  const apiRoot = useMemo(() => joinUrl(apiBaseUrl, apiPrefix), [apiBaseUrl, apiPrefix]);

  const endpoint = useMemo(() => {
    return `${apiRoot}/admin/data-availability?include_time_stats=false`;
  }, [apiRoot]);

  const stationEntities = useMemo(() => report?.station_entities ?? [], [report]);
  const basinEntities = useMemo(() => report?.basin_entities ?? [], [report]);
  const normalizeText = (value: unknown): string =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  useEffect(() => {
    let cancelled = false;
    const loadDgmBasins = async () => {
      try {
        const response = await fetch(`/data/basins_dgm.geojson?v=${Date.now()}`);
        if (!response.ok) {
          if (!cancelled) setDgmBasinEntities([]);
          return;
        }
        const geojson = await response.json();
        const features = Array.isArray(geojson?.features) ? geojson.features : [];

        const mapped = features.map((feature: any, index: number) => {
          const props = feature?.properties ?? {};
          const rawName =
            props.name ??
            props.nom ??
            props.NOM ??
            props.Name ??
            props.Name1 ??
            props.BASSIN ??
            `Bassin DGM ${index + 1}`;
          const rawCode = props.code ?? props.CODE ?? props.Code ?? props.id ?? props.ID ?? null;
          const codeNorm = normalizeText(rawCode);
          const nameNorm = normalizeText(rawName);
          const matchedAbh = basinEntities.find((abh) => {
            const abhCode = normalizeText(abh.basin_code);
            const abhName = normalizeText(abh.basin_name);
            return (codeNorm && abhCode && codeNorm === abhCode) || (nameNorm && abhName && nameNorm === abhName);
          });

          return {
            basin_id: matchedAbh?.basin_id || `dgm-${index + 1}`,
            basin_code: rawCode ? String(rawCode) : null,
            basin_name: String(rawName),
            level: matchedAbh?.level ?? null,
            total_records: matchedAbh?.total_records ?? 0,
            variable_count: matchedAbh?.variable_count ?? 0,
            source_count: matchedAbh?.source_count ?? 0,
            first_record: matchedAbh?.first_record ?? null,
            last_record: matchedAbh?.last_record ?? null,
            variables: matchedAbh?.variables ?? {},
          } as BasinEntityAvailability;
        });

        if (!cancelled) setDgmBasinEntities(mapped);
      } catch {
        if (!cancelled) setDgmBasinEntities([]);
      }
    };
    loadDgmBasins();
    return () => {
      cancelled = true;
    };
  }, [basinEntities]);

  const basinEntitiesByShape = useMemo(
    () => (basinShape === "ABH" ? basinEntities : dgmBasinEntities),
    [basinEntities, basinShape, dgmBasinEntities],
  );

  const variableTimeStats = useMemo(() => report?.summary.variable_time_stats ?? [], [report]);

  const stationsWithData = useMemo(() => {
    if (!report) return 0;
    if (typeof report.summary.stations_with_data === "number") {
      return report.summary.stations_with_data;
    }
    return stationEntities.filter((entity) => entity.total_records > 0).length;
  }, [report, stationEntities]);

  const basinsWithData = useMemo(() => {
    if (!report) return 0;
    if (typeof report.summary.basins_with_data === "number") {
      return report.summary.basins_with_data;
    }
    return basinEntities.filter((entity) => entity.total_records > 0).length;
  }, [report, basinEntities]);

  const filteredStationEntities = useMemo(() => {
    const q = stationFilter.trim().toLowerCase();
    return stationEntities.filter((entity) => {
      if (stationTypeFilter !== "all" && getStationCategory(entity.station_type) !== stationTypeFilter) {
        return false;
      }

      if (stationDataFilter === "with" && entity.total_records <= 0) return false;
      if (stationDataFilter === "without" && entity.total_records > 0) return false;

      if (!q) return true;

      return [entity.station_name, entity.station_code, entity.station_type, entity.basin_name]
        .filter(Boolean)
        .some((value) => (value ?? "").toLowerCase().includes(q));
    });
  }, [stationEntities, stationFilter, stationTypeFilter, stationDataFilter]);

  const stationCoverageByCategory = useMemo(() => {
    const initial = {
      barrage: { total: 0, withData: 0, withoutData: 0 },
      station: { total: 0, withData: 0, withoutData: 0 },
      other: { total: 0, withData: 0, withoutData: 0 },
    };

    return stationEntities.reduce((acc, entity) => {
      const category = getStationCategory(entity.station_type);
      const hasData = entity.total_records > 0;
      acc[category].total += 1;
      if (hasData) {
        acc[category].withData += 1;
      } else {
        acc[category].withoutData += 1;
      }
      return acc;
    }, initial);
  }, [stationEntities]);

  const filteredBasinEntities = useMemo(() => {
    const q = basinFilter.trim().toLowerCase();
    if (!q) return basinEntitiesByShape;

    return basinEntitiesByShape.filter((entity) =>
      [entity.basin_name, entity.basin_code, entity.level?.toString()]
        .filter(Boolean)
        .some((value) => (value ?? "").toLowerCase().includes(q)),
    );
  }, [basinEntitiesByShape, basinFilter]);

  const scanData = async () => {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
    try {
      const res = await fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} - ${txt || res.statusText}`);
      }

      const data = (await res.json()) as DataAvailabilityReport;
      setReport(data);

      toast({
        title: "Scan termine",
        description: `${formatCount(data.summary?.total_records)} enregistrements analyses`,
      });
    } catch (e: any) {
      const errorMessage =
        e?.name === "AbortError"
          ? `Timeout: le scan a depasse ${SCAN_TIMEOUT_MS / 1000}s.`
          : (e?.message || "Impossible de scanner les donnees");
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const deleteSourceSeries = async ({
    entityType,
    entityId,
    entityName,
    variableCode,
    sourceCode,
    firstRecord,
    lastRecord,
  }: DeleteSourcePayload) => {
    const scope = entityType === "station" ? "station" : "bassin";
    const confirmed = window.confirm(
      `Supprimer les donnees ${scope} pour ${entityName} - ${variableCode}/${sourceCode}${firstRecord && lastRecord ? ` (${formatPeriod(firstRecord, lastRecord)})` : ""} ?`,
    );
    if (!confirmed) return;

    const key = `${entityType}:${entityId}:${variableCode}:${sourceCode}`;
    setDeletingKey(key);

    try {
      const basePath = entityType === "station"
        ? `${apiRoot}/admin/data-availability/stations/${encodeURIComponent(entityId)}/variables/${encodeURIComponent(variableCode)}/sources/${encodeURIComponent(sourceCode)}`
        : `${apiRoot}/admin/data-availability/basins/${encodeURIComponent(entityId)}/variables/${encodeURIComponent(variableCode)}/sources/${encodeURIComponent(sourceCode)}`;
      const qs = new URLSearchParams();
      if (entityType === "station") {
        if (firstRecord) qs.set("start_time", firstRecord);
        if (lastRecord) qs.set("end_time", lastRecord);
      }
      const deleteEndpoint = qs.toString() ? `${basePath}?${qs.toString()}` : basePath;
      const res = await fetch(deleteEndpoint, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} - ${txt || res.statusText}`);
      }

      const payload = (await res.json().catch(() => null)) as { deleted_count?: number } | null;
      const deletedCount = payload?.deleted_count ?? 0;

      toast({
        title: "Suppression reussie",
        description: `${formatCount(deletedCount)} enregistrements supprimes pour ${entityName} (${variableCode}/${sourceCode}).`,
      });

      await scanData();
    } catch (e: any) {
      toast({
        title: "Erreur de suppression",
        description: e?.message || "Impossible de supprimer cette source.",
        variant: "destructive",
      });
    } finally {
      setDeletingKey(null);
    }
  };

  const exportReport = () => {
    if (!report) return;

    const dataStr = JSON.stringify(report, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `data-availability-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();

    URL.revokeObjectURL(url);

    toast({ title: "Export reussi", description: "Le rapport a ete telecharge" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scanner de disponibilite des donnees</CardTitle>
          <CardDescription>Analysez les entites et les variables disponibles dans la base de donnees.</CardDescription>

          <div className="text-xs text-muted-foreground">
            Backend: <code>{apiBaseUrl}</code> <br />
            Prefix: <code>{apiPrefix}</code> <br />
            Endpoint: <code>{endpoint}</code>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={scanData} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scan en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Lancer le scan
                </>
              )}
            </Button>

            {report && (
              <Button onClick={exportReport} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exporter (JSON)
              </Button>
            )}
          </div>

          {report && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-7">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Stations</CardDescription>
                    <CardTitle className="text-3xl">{formatCount(report.summary.total_stations)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Bassins</CardDescription>
                    <CardTitle className="text-3xl">{formatCount(report.summary.total_basins)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Variables</CardDescription>
                    <CardTitle className="text-3xl">{formatCount(report.summary.total_variables)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Sources</CardDescription>
                    <CardTitle className="text-3xl">{formatCount(report.summary.total_sources)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Enregistrements</CardDescription>
                    <CardTitle className="text-3xl">{formatCount(report.summary.total_records)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Stations avec donnees</CardDescription>
                    <CardTitle className="text-3xl">{formatCount(stationsWithData)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Bassins avec donnees</CardDescription>
                    <CardTitle className="text-3xl">{formatCount(basinsWithData)}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Variables disponibles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {report.summary.available_variables.map((v) => (
                        <Badge key={v} variant="secondary">
                          {v}
                        </Badge>
                      ))}
                      {report.summary.available_variables.length === 0 && (
                        <span className="text-sm text-muted-foreground">Aucune (base vide)</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sources disponibles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {report.summary.available_sources.map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                      {report.summary.available_sources.length === 0 && (
                        <span className="text-sm text-muted-foreground">Aucune (base vide)</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Couverture temporelle par variable</CardTitle>
                  <CardDescription>Date min, date max et pas de temps des series par variable.</CardDescription>
                </CardHeader>
                <CardContent>
                  {variableTimeStats.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune statistique temporelle disponible.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Variable</TableHead>
                          <TableHead>Enregistrements</TableHead>
                          <TableHead>Entites</TableHead>
                          <TableHead>Date min</TableHead>
                          <TableHead>Date max</TableHead>
                          <TableHead>Pas min</TableHead>
                          <TableHead>Pas median</TableHead>
                          <TableHead>Pas max</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {variableTimeStats.map((stat) => (
                          <TableRow key={stat.variable_code}>
                            <TableCell className="font-medium">{stat.variable_code}</TableCell>
                            <TableCell>{formatCount(stat.record_count)}</TableCell>
                            <TableCell>{formatCount(stat.entity_count)}</TableCell>
                            <TableCell>{formatDate(stat.first_record)}</TableCell>
                            <TableCell>{formatDate(stat.last_record)}</TableCell>
                            <TableCell>{formatStep(stat.min_step_seconds)}</TableCell>
                            <TableCell>{formatStep(stat.median_step_seconds)}</TableCell>
                            <TableCell>{formatStep(stat.max_step_seconds)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Stations par type</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type de station</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Variables</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(report.stations).map(([type, data]) => (
                        <TableRow key={type}>
                          <TableCell className="font-medium">{type}</TableCell>
                          <TableCell>{formatCount(data.count)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Object.keys(data.variables).map((variable) => (
                                <Badge key={variable} variant="outline" className="text-xs">
                                  {variable}
                                </Badge>
                              ))}
                              {Object.keys(data.variables).length === 0 && (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detail des series temporelles par entite</CardTitle>
                  <CardDescription>
                    Visualisez la couverture des donnees par station et par bassin, avec le detail variable/source.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="stations" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="stations">Stations ({formatCount(stationEntities.length)})</TabsTrigger>
                      <TabsTrigger value="basins">Bassins ({formatCount(basinEntities.length)})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="stations" className="space-y-3">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Stations et barrages: etat des donnees</CardTitle>
                          <CardDescription>
                            Cette vue montre clairement quelles entites ont deja des donnees et lesquelles sont encore vides.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Avec donnees</TableHead>
                                <TableHead>Sans donnees</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(["barrage", "station", "other"] as StationCategory[]).map((category) => (
                                <TableRow key={category}>
                                  <TableCell className="font-medium">{getCategoryLabel(category)}</TableCell>
                                  <TableCell>{formatCount(stationCoverageByCategory[category].total)}</TableCell>
                                  <TableCell>
                                    <Badge>{formatCount(stationCoverageByCategory[category].withData)}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">
                                      {formatCount(stationCoverageByCategory[category].withoutData)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant={stationTypeFilter === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStationTypeFilter("all")}
                        >
                          Tous types
                        </Button>
                        <Button
                          variant={stationTypeFilter === "barrage" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStationTypeFilter("barrage")}
                        >
                          Barrages
                        </Button>
                        <Button
                          variant={stationTypeFilter === "station" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStationTypeFilter("station")}
                        >
                          Stations
                        </Button>
                        <Button
                          variant={stationTypeFilter === "other" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStationTypeFilter("other")}
                        >
                          Autres
                        </Button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant={stationDataFilter === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStationDataFilter("all")}
                        >
                          Tous statuts
                        </Button>
                        <Button
                          variant={stationDataFilter === "with" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStationDataFilter("with")}
                        >
                          Avec donnees
                        </Button>
                        <Button
                          variant={stationDataFilter === "without" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStationDataFilter("without")}
                        >
                          Sans donnees
                        </Button>
                      </div>

                      <Input
                        placeholder="Filtrer par nom, code, type ou bassin"
                        value={stationFilter}
                        onChange={(event) => setStationFilter(event.target.value)}
                      />

                      <div className="rounded-md border px-4">
                        {filteredStationEntities.length === 0 ? (
                          <p className="py-4 text-sm text-muted-foreground">Aucune station ne correspond au filtre.</p>
                        ) : (
                          <Accordion type="multiple" className="w-full">
                            {filteredStationEntities.map((station) => (
                              <AccordionItem key={station.station_id} value={station.station_id}>
                                <AccordionTrigger className="hover:no-underline">
                                  <div className="flex w-full flex-col gap-2 pr-4 text-left md:flex-row md:items-center md:justify-between">
                                    <div>
                                      <div className="font-medium">{station.station_name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {station.station_code ? `${station.station_code} - ` : ""}
                                        {station.station_type}
                                        {station.basin_name ? ` - ${station.basin_name}` : ""}
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      <Badge variant={station.total_records > 0 ? "default" : "secondary"}>
                                        {getStatusLabel(station.total_records)}
                                      </Badge>
                                      <Badge variant={station.total_records > 0 ? "default" : "secondary"}>
                                        {formatCount(station.total_records)} points
                                      </Badge>
                                      <Badge variant="outline">{formatCount(station.variable_count)} vars</Badge>
                                      <Badge variant="outline">{formatCount(station.source_count)} sources</Badge>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-3">
                                  <p className="text-xs text-muted-foreground">
                                    Periode: {formatPeriod(station.first_record, station.last_record)}
                                  </p>
                                  <TimeseriesDetailsTable
                                    variables={station.variables}
                                    entityType="station"
                                    entityId={station.station_id}
                                    entityName={station.station_name}
                                    onDeleteSource={deleteSourceSeries}
                                    deletingKey={deletingKey}
                                  />
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="basins" className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Shape :</span>
                        <Button
                          type="button"
                          size="sm"
                          variant={basinShape === "ABH" ? "default" : "outline"}
                          onClick={() => setBasinShape("ABH")}
                        >
                          ABH
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={basinShape === "DGM" ? "default" : "outline"}
                          onClick={() => setBasinShape("DGM")}
                        >
                          DGM
                        </Button>
                      </div>
                      <Input
                        placeholder="Filtrer par nom, code ou niveau"
                        value={basinFilter}
                        onChange={(event) => setBasinFilter(event.target.value)}
                      />

                      <div className="rounded-md border px-4">
                        {filteredBasinEntities.length === 0 ? (
                          <p className="py-4 text-sm text-muted-foreground">Aucun bassin ne correspond au filtre.</p>
                        ) : (
                          <Accordion type="multiple" className="w-full">
                            {filteredBasinEntities.map((basin) => (
                              <AccordionItem key={basin.basin_id} value={basin.basin_id}>
                                <AccordionTrigger className="hover:no-underline">
                                  <div className="flex w-full flex-col gap-2 pr-4 text-left md:flex-row md:items-center md:justify-between">
                                    <div>
                                      <div className="font-medium">{basin.basin_name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {basin.basin_code ? `${basin.basin_code} - ` : ""}
                                        Niveau {basin.level ?? "-"}
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      <Badge variant={basin.total_records > 0 ? "default" : "secondary"}>
                                        {formatCount(basin.total_records)} points
                                      </Badge>
                                      <Badge variant="outline">{formatCount(basin.variable_count)} vars</Badge>
                                      <Badge variant="outline">{formatCount(basin.source_count)} sources</Badge>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-3">
                                  <p className="text-xs text-muted-foreground">
                                    Periode: {formatPeriod(basin.first_record, basin.last_record)}
                                  </p>
                                  <TimeseriesDetailsTable
                                    variables={basin.variables}
                                    entityType="basin"
                                    entityId={basin.basin_id}
                                    entityName={basin.basin_name}
                                    onDeleteSource={deleteSourceSeries}
                                    deletingKey={deletingKey}
                                  />
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
