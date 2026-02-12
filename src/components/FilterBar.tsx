import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVariables, useSources, useRuns, useStations } from "@/hooks/useApi";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export interface Filters {
  variable: string;
  source: string;
  run: string;
  entityType: string;
  period: string;
  aggregation: string;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

export const defaultFilters: Filters = {
  variable: "",
  source: "",
  run: "",
  entityType: "",
  period: "7d",
  aggregation: "raw",
};

const ALL = "__all__";
const toVal = (v: string) => (v === ALL ? "" : v);
const fromVal = (v: string) => (v === "" ? ALL : v);

function LoadingSelect() {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground h-9 px-3 border rounded-md bg-card">
      <Loader2 className="h-3 w-3 animate-spin" /> Chargement…
    </div>
  );
}

export function FilterBar({ filters, onChange }: Props) {
  const { data: varsResult, isLoading: varsLoading } = useVariables();
  const { data: sourcesResult, isLoading: sourcesLoading } = useSources();
  const { data: runsResult, isLoading: runsLoading } = useRuns(filters.source || undefined);
  const { data: stationsResult } = useStations();

  const variables = varsResult?.data ?? [];
  const sources = sourcesResult?.data ?? [];
  const runs = runsResult?.data ?? [];
  const fromApi = varsResult?.fromApi || sourcesResult?.fromApi;

  const set = (key: keyof Filters, val: string) => onChange({ ...filters, [key]: toVal(val) });

  const entityTypes = [
    { value: ALL, label: "Toutes entités" },
    { value: "hydrométrique", label: "Stations hydro." },
    { value: "pluviométrique", label: "Stations pluvio." },
    { value: "dam", label: "Barrages" },
  ];

  const periods = [
    { value: "24h", label: "24 h" },
    { value: "72h", label: "72 h" },
    { value: "7d", label: "7 jours" },
    { value: "30d", label: "30 jours" },
    { value: "custom", label: "Personnalisé" },
  ];

  const aggregations = [
    { value: "raw", label: "Brut" },
    { value: "hour", label: "Horaire" },
    { value: "day", label: "Journalier" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-card rounded-lg border">
      {fromApi === false && (
        <Badge variant="outline" className="text-warning border-warning/30 text-[10px]">Mode mock</Badge>
      )}

      {/* Variable */}
      <div className="min-w-[140px]">
        {varsLoading ? <LoadingSelect /> : (
          <Select value={fromVal(filters.variable)} onValueChange={(v) => set("variable", v)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Variable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes variables</SelectItem>
              {variables.map((v) => (
                <SelectItem key={v.code} value={v.code}>{v.label} ({v.unit})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Source */}
      <div className="min-w-[160px]">
        {sourcesLoading ? <LoadingSelect /> : (
          <Select value={fromVal(filters.source)} onValueChange={(v) => { const real = toVal(v); onChange({ ...filters, source: real, run: "" }); }}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes sources</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Run */}
      <div className="min-w-[140px]">
        {runsLoading ? <LoadingSelect /> : (
          <Select value={fromVal(filters.run)} onValueChange={(v) => set("run", v)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Run" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous runs</SelectItem>
              {runs.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {new Date(r.run_time).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Entity type */}
      <div className="min-w-[150px]">
        <Select value={fromVal(filters.entityType)} onValueChange={(v) => set("entityType", v)}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Entité" />
          </SelectTrigger>
          <SelectContent>
            {entityTypes.map((e) => (
              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Period */}
      <div className="min-w-[110px]">
        <Select value={filters.period} onValueChange={(v) => set("period", v)}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Aggregation */}
      <div className="min-w-[110px]">
        <Select value={filters.aggregation} onValueChange={(v) => set("aggregation", v)}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Agrégation" />
          </SelectTrigger>
          <SelectContent>
            {aggregations.map((a) => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
