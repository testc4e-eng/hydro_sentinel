import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface RecapSeriesConfig {
  key: string;
  label: string;
  color: string;
  axis: "left" | "right";
  type: "line" | "bar";
  unit: string;
}

interface RecapBarrageChartProps {
  data?: any[];
  damName: string;
  series?: RecapSeriesConfig[];
  vn?: number;
}

function formatDay(value: string) {
  try {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : format(date, "dd/MM", { locale: fr });
  } catch {
    return value;
  }
}

function buildLegacySeries(data: any[]): RecapSeriesConfig[] {
  const hasKey = (key: string) => data.some((row) => row && row[key] !== undefined);
  const fallback: RecapSeriesConfig[] = [];

  if (hasKey("lacher_m3s")) {
    fallback.push({
      key: "lacher_m3s",
      label: "Debit de lacher",
      color: "#6b7280",
      axis: "right",
      type: "bar",
      unit: "m3/s",
    });
  }

  if (hasKey("apport_journalier")) {
    fallback.push({
      key: "apport_journalier",
      label: "Apport",
      color: "#3b82f6",
      axis: "right",
      type: "line",
      unit: "m3/s",
    });
  }

  if (hasKey("volume_mm3")) {
    fallback.push({
      key: "volume_mm3",
      label: "Volume de la retenue",
      color: "#ea580c",
      axis: "left",
      type: "line",
      unit: "Mm3",
    });
  }

  return fallback;
}

export function RecapBarrageChart({ data, damName, series, vn = 3522.2 }: RecapBarrageChartProps) {
  const safeData = Array.isArray(data) ? data : [];
  const safeSeries = Array.isArray(series) && series.length > 0 ? series : buildLegacySeries(safeData);

  const activeSeries = safeSeries.filter((s) => !!s?.key);
  const hasLeft = activeSeries.some((s) => s.axis === "left");
  const hasRight = activeSeries.some((s) => s.axis === "right");

  const leftUnits = Array.from(
    new Set(activeSeries.filter((s) => s.axis === "left").map((s) => s.unit).filter(Boolean)),
  ).join(" / ");

  const rightUnits = Array.from(
    new Set(activeSeries.filter((s) => s.axis === "right").map((s) => s.unit).filter(Boolean)),
  ).join(" / ");

  const showValueLabels = safeData.length <= 35;
  const hasVolumeLeft = activeSeries.some((s) => s.axis === "left" && s.unit.toLowerCase().includes("mm"));

  return (
    <Card className="w-full h-[560px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-2xl font-semibold text-gray-700 uppercase">
          Recap barrage {damName}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={safeData} margin={{ top: 16, right: 24, left: 8, bottom: 36 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDay}
              angle={-90}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 10 }}
            />

            {hasLeft && (
              <YAxis
                yAxisId="left"
                orientation="left"
                label={{ value: leftUnits || "Axe gauche", angle: -90, position: "insideLeft" }}
                tick={{ fontSize: 11 }}
              />
            )}

            {hasRight && (
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{ value: rightUnits || "Axe droit", angle: 90, position: "insideRight" }}
                tick={{ fontSize: 11 }}
              />
            )}

            <Tooltip
              labelFormatter={(value) => {
                try {
                  const date = new Date(`${String(value)}T00:00:00`);
                  return Number.isNaN(date.getTime())
                    ? String(value)
                    : format(date, "dd MMMM yyyy", { locale: fr });
                } catch {
                  return String(value);
                }
              }}
              formatter={(value: any, name: string) => {
                if (value === null || value === undefined || Number.isNaN(Number(value))) {
                  return ["-", name];
                }
                return [Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 2 }), name];
              }}
            />
            <Legend verticalAlign="bottom" />

            {hasVolumeLeft && (
              <ReferenceLine
                yAxisId="left"
                y={vn}
                stroke="#b91c1c"
                strokeDasharray="6 4"
                ifOverflow="visible"
                label={{ value: `Vn=${vn}`, position: "insideTopLeft", fill: "#b91c1c", fontSize: 11 }}
              />
            )}

            {activeSeries.map((serie) => {
              if (serie.type === "bar") {
                return (
                  <Bar
                    key={serie.key}
                    yAxisId={serie.axis}
                    dataKey={serie.key}
                    name={serie.label}
                    fill={serie.color}
                    barSize={16}
                    opacity={0.85}
                  >
                    {showValueLabels && (
                      <LabelList
                        dataKey={serie.key}
                        position="top"
                        formatter={(v: any) => (v === null || v === undefined ? "" : Number(v).toFixed(1))}
                        style={{ fontSize: 10, fontWeight: "bold", fill: "#4b5563" }}
                      />
                    )}
                  </Bar>
                );
              }

              return (
                <Line
                  key={serie.key}
                  yAxisId={serie.axis}
                  type="monotone"
                  dataKey={serie.key}
                  name={serie.label}
                  stroke={serie.color}
                  strokeWidth={2.2}
                  dot={{ r: 3, fill: serie.color }}
                  connectNulls
                >
                  {showValueLabels && (
                    <LabelList
                      dataKey={serie.key}
                      position="top"
                      formatter={(v: any) => (v === null || v === undefined ? "" : Number(v).toFixed(1))}
                      style={{ fontSize: 10, fontWeight: "bold", fill: serie.color }}
                    />
                  )}
                </Line>
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
