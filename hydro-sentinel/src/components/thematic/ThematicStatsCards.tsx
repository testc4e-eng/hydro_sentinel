import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MapStatistics } from "@/types/thematicMaps";

interface ThematicStatsCardsProps {
  statistics: MapStatistics;
  compact?: boolean;
  className?: string;
}

function formatArea(value: number, unit: "m2" | "km2" | "ha"): string {
  const locale = "fr-FR";
  if (unit === "m2") {
    return `${value.toLocaleString(locale, { maximumFractionDigits: 0 })} m2`;
  }
  if (unit === "km2") {
    return `${value.toLocaleString(locale, { maximumFractionDigits: 2 })} km2`;
  }
  return `${value.toLocaleString(locale, { maximumFractionDigits: 2 })} ha`;
}

export function ThematicStatsCards({ statistics, compact = false, className }: ThematicStatsCardsProps) {
  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 md:grid-cols-2", className)}>
      <Card>
        <CardHeader className={compact ? "px-3 pb-1 pt-3" : "pb-2"}>
          <CardTitle className="text-sm">{statistics.positive_class_label}</CardTitle>
        </CardHeader>
        <CardContent className={compact ? "space-y-1 px-3 pb-3 pt-0 text-xs" : "space-y-1 text-sm"}>
          <div className="font-semibold">{formatArea(statistics.positive_class.m2, "m2")}</div>
          <div className="text-muted-foreground">{formatArea(statistics.positive_class.km2, "km2")}</div>
          <div className="text-muted-foreground">{formatArea(statistics.positive_class.hectares, "ha")}</div>
          <div className="text-xs text-primary">{statistics.positive_class.percentage.toFixed(1)}%</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className={compact ? "px-3 pb-1 pt-3" : "pb-2"}>
          <CardTitle className="text-sm">{statistics.negative_class_label}</CardTitle>
        </CardHeader>
        <CardContent className={compact ? "space-y-1 px-3 pb-3 pt-0 text-xs" : "space-y-1 text-sm"}>
          <div className="font-semibold">{formatArea(statistics.negative_class.m2, "m2")}</div>
          <div className="text-muted-foreground">{formatArea(statistics.negative_class.km2, "km2")}</div>
          <div className="text-muted-foreground">{formatArea(statistics.negative_class.hectares, "ha")}</div>
          <div className="text-xs text-primary">{statistics.negative_class.percentage.toFixed(1)}%</div>
        </CardContent>
      </Card>

      <Card className={compact ? "sm:col-span-2" : "md:col-span-2"}>
        <CardHeader className={compact ? "px-3 pb-1 pt-3" : "pb-2"}>
          <CardTitle className="text-sm">Surface totale analysee</CardTitle>
        </CardHeader>
        <CardContent className={compact ? "px-3 pb-3 pt-0" : ""}>
          <div className={compact ? "text-xs font-semibold" : "text-sm font-semibold"}>{formatArea(statistics.total_area_m2, "m2")}</div>
          <div className={compact ? "text-[11px] text-muted-foreground" : "text-xs text-muted-foreground"}>
            {(statistics.total_area_m2 / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} km2 /{" "}
            {(statistics.total_area_m2 / 10_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ha
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
