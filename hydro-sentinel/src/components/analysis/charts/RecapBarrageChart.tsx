import { useMemo, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
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

function parseScaleInput(rawValue: string): number | undefined {
  const normalized = rawValue.trim().replace(",", ".");
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sanitizeFilename(rawValue: string): string {
  const base = rawValue
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "recap";
}

export function RecapBarrageChart({ data, damName, series, vn = 3522.2 }: RecapBarrageChartProps) {
  const rawData = Array.isArray(data) ? data : [];
  const safeSeries = Array.isArray(series) && series.length > 0 ? series : buildLegacySeries(rawData);
  const chartWrapperRef = useRef<HTMLDivElement | null>(null);
  const [leftMinInput, setLeftMinInput] = useState("");
  const [leftMaxInput, setLeftMaxInput] = useState("");
  const [rightMinInput, setRightMinInput] = useState("");
  const [rightMaxInput, setRightMaxInput] = useState("");

  const activeSeries = safeSeries.filter((s) => !!s?.key);
  const safeData = useMemo(
    () =>
      rawData.map((row) => {
        const next: any = { ...(row || {}) };
        activeSeries.forEach((serie) => {
          const rawValue = next[serie.key];
          if (rawValue === null || rawValue === undefined || rawValue === "") {
            next[serie.key] = null;
            return;
          }
          const numeric = Number(rawValue);
          next[serie.key] = Number.isFinite(numeric) ? numeric : null;
        });
        return next;
      }),
    [activeSeries, rawData],
  );
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
  const hasLeftFiniteValues = useMemo(
    () =>
      safeData.some((row) =>
        activeSeries.some(
          (serie) => serie.axis === "left" && typeof row?.[serie.key] === "number" && Number.isFinite(row[serie.key]),
        ),
      ),
    [activeSeries, safeData],
  );
  const safeVn = Number(vn);
  const canRenderReferenceLine = hasVolumeLeft && hasLeftFiniteValues && Number.isFinite(safeVn);
  const leftDomain = useMemo<[number | "auto", number | "auto"]>(() => {
    const min = parseScaleInput(leftMinInput);
    const max = parseScaleInput(leftMaxInput);
    if (min !== undefined && max !== undefined && min >= max) return ["auto", "auto"];
    return [min ?? "auto", max ?? "auto"];
  }, [leftMaxInput, leftMinInput]);
  const rightDomain = useMemo<[number | "auto", number | "auto"]>(() => {
    const min = parseScaleInput(rightMinInput);
    const max = parseScaleInput(rightMaxInput);
    if (min !== undefined && max !== undefined && min >= max) return ["auto", "auto"];
    return [min ?? "auto", max ?? "auto"];
  }, [rightMaxInput, rightMinInput]);

  const resetScale = () => {
    setLeftMinInput("");
    setLeftMaxInput("");
    setRightMinInput("");
    setRightMaxInput("");
  };

  const handleExportGraph = () => {
    const chartRoot = chartWrapperRef.current;
    if (!chartRoot) return;

    const svgElement = chartRoot.querySelector("svg");
    if (!svgElement) return;

    const rect = svgElement.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clonedSvg.setAttribute("width", String(width));
    clonedSvg.setAttribute("height", String(height));

    const serialized = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(blobUrl);
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      const anchor = document.createElement("a");
      anchor.download = `${sanitizeFilename(`recap_${damName}`)}_${new Date().toISOString().slice(0, 10)}.png`;
      anchor.href = canvas.toDataURL("image/png");
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      console.error("Failed to export recap chart");
    };

    image.src = blobUrl;
  };

  return (
    <Card className="w-full h-[560px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-2xl font-semibold text-gray-700 uppercase">
          Recap barrage {damName}
        </CardTitle>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          {hasLeft && (
            <div className="flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1">
              <span className="text-[11px] text-muted-foreground">Axe G:</span>
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                value={leftMinInput}
                onChange={(event) => setLeftMinInput(event.target.value)}
                placeholder="Min"
                className="h-7 w-[90px] text-xs"
              />
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                value={leftMaxInput}
                onChange={(event) => setLeftMaxInput(event.target.value)}
                placeholder="Max"
                className="h-7 w-[90px] text-xs"
              />
            </div>
          )}

          {hasRight && (
            <div className="flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1">
              <span className="text-[11px] text-muted-foreground">Axe D:</span>
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                value={rightMinInput}
                onChange={(event) => setRightMinInput(event.target.value)}
                placeholder="Min"
                className="h-7 w-[90px] text-xs"
              />
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                value={rightMaxInput}
                onChange={(event) => setRightMaxInput(event.target.value)}
                placeholder="Max"
                className="h-7 w-[90px] text-xs"
              />
            </div>
          )}

          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={resetScale}>
            Auto
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleExportGraph}>
            <Download className="h-3 w-3" />
            Exporter graphe
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 pb-4">
        <div ref={chartWrapperRef} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={safeData} margin={{ top: 16, right: 32, left: 16, bottom: 44 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDay}
              angle={-90}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 10 }}
              padding={{ left: 12, right: 28 }}
            />

            {hasLeft && (
              <YAxis
                yAxisId="left"
                orientation="left"
                domain={leftDomain}
                label={{ value: leftUnits || "Axe gauche", angle: -90, position: "insideLeft" }}
                tick={{ fontSize: 11 }}
              />
            )}

            {hasRight && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={rightDomain}
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

            {canRenderReferenceLine && (
              <ReferenceLine
                yAxisId="left"
                y={safeVn}
                stroke="#b91c1c"
                strokeDasharray="6 4"
                ifOverflow="visible"
                label={{ value: `Vn=${safeVn}`, position: "insideTopLeft", fill: "#b91c1c", fontSize: 11 }}
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
        </div>
      </CardContent>
    </Card>
  );
}
