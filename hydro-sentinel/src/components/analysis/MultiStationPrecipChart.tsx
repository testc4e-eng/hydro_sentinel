import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface TimeseriesData {
  time: string;
  displayTime: string;
  [key: string]: number | string | undefined;
}

interface MultiStationPrecipChartProps {
  stationIds: string[];
  stationLabelById: Record<string, string>;
  variableCode: string;
  sourceCode: string;
  unit: string;
  startDate?: string;
  endDate?: string;
  aggregation?: "raw" | "day";
  cumulative?: boolean;
  chartType?: "line" | "bar";
  entityType?: "stations" | "bassins";
  onDataLoaded?: (data: TimeseriesData[]) => void;
}

const SERIES_COLORS = [
  "#2563eb",
  "#0f766e",
  "#dc2626",
  "#7c3aed",
  "#ea580c",
  "#0ea5e9",
  "#16a34a",
  "#d946ef",
  "#4f46e5",
  "#059669",
];

export function MultiStationPrecipChart({
  stationIds,
  stationLabelById,
  variableCode,
  sourceCode,
  unit,
  startDate,
  endDate,
  aggregation = "raw",
  cumulative = false,
  chartType = "line",
  entityType = "stations",
  onDataLoaded,
}: MultiStationPrecipChartProps) {
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<TimeseriesData[]>([]);

  const stationColorById = useMemo(() => {
    const map: Record<string, string> = {};
    stationIds.forEach((id, index) => {
      map[id] = SERIES_COLORS[index % SERIES_COLORS.length];
    });
    return map;
  }, [stationIds]);

  useEffect(() => {
    if (!stationIds.length || !sourceCode || !variableCode) {
      setChartData([]);
      onDataLoaded?.([]);
      return;
    }

    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const params: any = {
          station_ids: stationIds.join(","),
          variable_code: variableCode,
          source_code: sourceCode,
          entity_type: entityType,
          aggregation,
          cumulative,
          limit: 20000,
        };
        if (startDate) params.start = startDate;
        if (endDate) params.end = endDate;

        const response = await api.get("/measurements/timeseries", { params });
        const rows = Array.isArray(response.data) ? response.data : [];

        const timeMap = new Map<string, TimeseriesData>();
        rows.forEach((point: any) => {
          const isoTime = point?.time;
          const rowStationId = String(point?.station_id || "");
          if (!isoTime || !rowStationId) return;

          if (!timeMap.has(isoTime)) {
            const dateObj = new Date(isoTime);
            if (Number.isNaN(dateObj.getTime())) return;
            const displayTime = dateObj.toLocaleString("fr-FR", {
              month: "2-digit",
              day: "2-digit",
              ...(aggregation === "day" ? { year: "2-digit" } : { hour: "2-digit", minute: "2-digit" }),
            });
            timeMap.set(isoTime, { time: isoTime, displayTime });
          }

          const existing = timeMap.get(isoTime);
          if (!existing) return;
          existing[rowStationId] = point?.value;
        });

        const merged = Array.from(timeMap.values()).sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
        );

        if (!cancelled) {
          setChartData(merged);
          onDataLoaded?.(merged);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch multi-station precipitation data:", error);
          setChartData([]);
          onDataLoaded?.([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [stationIds, sourceCode, variableCode, startDate, endDate, entityType, aggregation, cumulative, onDataLoaded]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground border rounded-lg bg-muted/20">
        Aucune donnee disponible pour cette selection
      </div>
    );
  }

  const ChartComponent = chartType === "bar" ? BarChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ChartComponent data={chartData} margin={{ top: 8, right: 32, left: 16, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="displayTime" tick={{ fontSize: 11 }} stroke="#6b7280" padding={{ left: 12, right: 28 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          stroke="#6b7280"
          label={{ value: unit, angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "12px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        {stationIds.map((stationId) => {
          const label = stationLabelById[stationId] || stationId;
          const color = stationColorById[stationId] || "#6b7280";
          if (chartType === "bar") {
            return (
              <Bar
                key={stationId}
                dataKey={stationId}
                name={label}
                fill={color}
                opacity={0.8}
              />
            );
          }
          return (
            <Line
              key={stationId}
              type="monotone"
              dataKey={stationId}
              name={label}
              stroke={color}
              dot={false}
              strokeWidth={2}
              connectNulls
            />
          );
        })}
      </ChartComponent>
    </ResponsiveContainer>
  );
}
