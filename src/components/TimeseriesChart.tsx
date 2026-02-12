import { useMemo } from "react";
import { MultiSourceChart } from "./MultiSourceChart";
import { generateMultiSourceSeries } from "@/data/mockData";

interface Props {
  entityId?: string;
  variable?: string;
  sources?: string[];
}

export function TimeseriesChart({ entityId = "st-1", variable = "precip_mm", sources = ["OBS", "AROME"] }: Props) {
  const series = useMemo(
    () => generateMultiSourceSeries(entityId, variable, sources),
    [entityId, variable, sources]
  );

  return (
    <MultiSourceChart
      series={series}
      variable={variable}
      unit=""
      height="100%"
      showDataZoom={false}
    />
  );
}
