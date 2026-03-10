import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSources } from "@/hooks/useApi";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

export interface CompactFilters {
  sources: string[];
  period: string;
  customStart?: string;
  customEnd?: string;
}

interface Props {
  filters: CompactFilters;
  onChange: (f: CompactFilters) => void;
  hideSources?: boolean;
  allowedSourceCodes?: string[];
  sourceLabelOverrides?: Record<string, string>;
}

export const defaultCompactFilters: CompactFilters = {
  sources: ["OBS"],
  period: "7d",
};

const periods = [
  { value: "24h", label: "24h" },
  { value: "72h", label: "72h" },
  { value: "7d", label: "7 jours" },
  { value: "14d", label: "14 jours" },
  { value: "30d", label: "30 jours" },
  { value: "custom", label: "Manuelle" },
];

function parseIsoDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toBoundedIso(date: Date, boundary: "start" | "end"): string {
  const bounded = new Date(date);
  if (boundary === "start") {
    bounded.setHours(0, 0, 0, 0);
  } else {
    bounded.setHours(23, 59, 59, 999);
  }
  return bounded.toISOString();
}

export function CompactFilterBar({
  filters,
  onChange,
  hideSources = false,
  allowedSourceCodes,
  sourceLabelOverrides,
}: Props) {
  const { data: sourcesResult } = useSources();
  const rawSources = sourcesResult?.data?.data ?? [];
  const sources = allowedSourceCodes?.length
    ? rawSources.filter((s: any) => allowedSourceCodes.includes(s.code))
    : rawSources;
  const customStartDate = parseIsoDate(filters.customStart);
  const customEndDate = parseIsoDate(filters.customEnd);

  const set = (key: keyof CompactFilters, value: any) => onChange({ ...filters, [key]: value });

  const toggleSource = (code: string) => {
    const current = filters.sources;
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    if (next.length > 0) onChange({ ...filters, sources: next });
  };

  const setCustomDate = (key: "customStart" | "customEnd", date?: Date) => {
    const nextFilters: CompactFilters = { ...filters, period: "custom" };
    if (!date) {
      nextFilters[key] = undefined;
      onChange(nextFilters);
      return;
    }

    if (key === "customStart") {
      const nextStart = toBoundedIso(date, "start");
      nextFilters.customStart = nextStart;
      if (nextFilters.customEnd && new Date(nextFilters.customEnd) < new Date(nextStart)) {
        nextFilters.customEnd = toBoundedIso(date, "end");
      }
    } else {
      const nextEnd = toBoundedIso(date, "end");
      nextFilters.customEnd = nextEnd;
      if (nextFilters.customStart && new Date(nextFilters.customStart) > new Date(nextEnd)) {
        nextFilters.customStart = toBoundedIso(date, "start");
      }
    }

    onChange(nextFilters);
  };

  const resetCustomRange = () => {
    onChange({
      ...filters,
      customStart: undefined,
      customEnd: undefined,
      period: "7d",
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2">
      {!hideSources && (
        <>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs text-muted-foreground">Sources :</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 min-w-[120px] justify-start gap-1 text-xs font-normal">
                  {filters.sources.length > 0 ? filters.sources.join(", ") : "Selectionner..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                {sources.map((s: any) => (
                  <label key={s.code} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted">
                    <Checkbox
                      checked={filters.sources.includes(s.code)}
                      onCheckedChange={() => toggleSource(s.code)}
                    />
                    <span>{sourceLabelOverrides?.[s.code] ?? s.label}</span>
                    {s.horizon && <span className="ml-auto text-muted-foreground">{s.horizon}</span>}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          </div>
          <div className="h-5 w-[1px] bg-border" />
        </>
      )}

      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-xs text-muted-foreground">Periode :</span>
        <Select value={filters.period} onValueChange={(value) => set("period", value)}>
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue placeholder="Periode" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((periodOption) => (
              <SelectItem key={periodOption.value} value={periodOption.value}>
                {periodOption.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filters.period === "custom" && (
        <>
          <div className="h-5 w-[1px] bg-border" />

          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs text-muted-foreground">Debut :</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 min-w-[135px] justify-start gap-1 text-xs">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Choisir"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <CalendarComponent
                  mode="single"
                  selected={customStartDate}
                  onSelect={(date) => setCustomDate("customStart", date)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs text-muted-foreground">Fin :</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 min-w-[135px] justify-start gap-1 text-xs">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Choisir"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <CalendarComponent
                  mode="single"
                  selected={customEndDate}
                  onSelect={(date) => setCustomDate("customEnd", date)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={resetCustomRange}>
            Reset
          </Button>
        </>
      )}
    </div>
  );
}
