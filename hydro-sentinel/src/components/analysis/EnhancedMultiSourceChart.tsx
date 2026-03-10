import { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { api } from '@/lib/api';
import { Loader2, TrendingUp, Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

export interface EnhancedMultiSourceChartProps {
  stationId: string;
  variableCode: string;
  variableLabel: string;
  unit: string;
  sources: string[];
  startDate?: string;
  endDate?: string;
  chartType?: 'line' | 'bar';
  entityType?: 'stations' | 'bassins';
  continuityEnabled?: boolean;
  continuityPriority?: string[];
  onDataLoaded?: (data: TimeseriesData[]) => void;
}

interface TimeseriesData {
  time: string;
  displayTime: string;
  [key: string]: number | string | null;
}

const SOURCE_COLORS: Record<string, string> = {
  OBS: '#3b82f6',
  AROME: '#f59e0b',
  ECMWF: '#10b981',
  HEC_HMS: '#8b5cf6',
  SIM: '#8b5cf6',
  ABHS_RES: '#ec4899',
};

function formatDisplayTime(date: Date): string {
  return date.toLocaleString('fr-FR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function addBoundaryPoint(timeMap: Map<string, TimeseriesData>, isoDate?: string) {
  if (!isoDate) return;
  const boundaryDate = new Date(isoDate);
  if (Number.isNaN(boundaryDate.getTime())) return;

  const boundaryIso = boundaryDate.toISOString();
  if (!timeMap.has(boundaryIso)) {
    timeMap.set(boundaryIso, {
      time: boundaryIso,
      displayTime: formatDisplayTime(boundaryDate),
    });
  }
}

function parseIsoToMs(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? undefined : parsed;
}

function selectFallbackWindowRows(
  rows: any[],
  requestedStart?: string,
  requestedEnd?: string,
): { rows: any[]; from?: string; to?: string } {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { rows: [] };
  }

  const timedRows = rows
    .map((row) => ({
      row,
      timeMs: parseIsoToMs(row?.time),
    }))
    .filter((entry): entry is { row: any; timeMs: number } => entry.timeMs !== undefined)
    .sort((a, b) => a.timeMs - b.timeMs);

  if (timedRows.length === 0) {
    return { rows: [] };
  }

  const firstTimeMs = timedRows[0].timeMs;
  const lastTimeMs = timedRows[timedRows.length - 1].timeMs;
  const requestedStartMs = parseIsoToMs(requestedStart);
  const requestedEndMs = parseIsoToMs(requestedEnd);
  const requestedDurationMs =
    requestedStartMs !== undefined && requestedEndMs !== undefined && requestedEndMs > requestedStartMs
      ? requestedEndMs - requestedStartMs
      : undefined;

  if (!requestedDurationMs) {
    return {
      rows: timedRows.map((entry) => entry.row),
      from: new Date(firstTimeMs).toISOString(),
      to: new Date(lastTimeMs).toISOString(),
    };
  }

  const windowEndMs = lastTimeMs;
  const windowStartMs = Math.max(firstTimeMs, windowEndMs - requestedDurationMs);
  const windowRows = timedRows
    .filter((entry) => entry.timeMs >= windowStartMs && entry.timeMs <= windowEndMs)
    .map((entry) => entry.row);

  return {
    rows: windowRows.length > 0 ? windowRows : timedRows.map((entry) => entry.row),
    from: new Date(windowStartMs).toISOString(),
    to: new Date(windowEndMs).toISOString(),
  };
}

function parseScaleInput(rawValue: string): number | undefined {
  const normalized = rawValue.trim().replace(',', '.');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sanitizeFilename(rawValue: string): string {
  const base = rawValue
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || 'graph';
}

export function EnhancedMultiSourceChart({
  stationId,
  variableCode,
  variableLabel,
  unit,
  sources,
  startDate,
  endDate,
  chartType = 'line',
  entityType = 'stations',
  continuityEnabled = false,
  continuityPriority,
  onDataLoaded,
}: EnhancedMultiSourceChartProps) {
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<TimeseriesData[]>([]);
  const [autoFallbackInfo, setAutoFallbackInfo] = useState<{ used: boolean; from?: string; to?: string }>({
    used: false,
  });
  const [logScale, setLogScale] = useState(false);
  const [enableBrush, setEnableBrush] = useState(false);
  const [yMinInput, setYMinInput] = useState('');
  const [yMaxInput, setYMaxInput] = useState('');
  const [customPeriod, setCustomPeriod] = useState<{ start?: Date; end?: Date }>({});
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const chartWrapperRef = useRef<HTMLDivElement | null>(null);

  const effectiveStartDate = customPeriod.start
    ? customPeriod.start.toISOString()
    : startDate;
  const effectiveEndDate = customPeriod.end
    ? customPeriod.end.toISOString()
    : endDate;

  useEffect(() => {
    if (!stationId || !variableCode || sources.length === 0) {
      setChartData([]);
      setAutoFallbackInfo({ used: false });
      return;
    }
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      const timeMap = new Map<string, TimeseriesData>();
      let fallbackUsed = false;
      let fallbackRangeStartMs: number | undefined;
      let fallbackRangeEndMs: number | undefined;
      const allowAutoFallback = !customPeriod.start && !customPeriod.end && Boolean(effectiveStartDate || effectiveEndDate);
      const sourceRowsMap = new Map<string, any[]>();

      try {
        for (const source of sources) {
          const params: any = {
            station_id: stationId,
            variable_code: variableCode,
            source_code: source,
            entity_type: entityType,
          };

            if (effectiveStartDate) params.start = effectiveStartDate;
            if (effectiveEndDate) params.end = effectiveEndDate;

          try {
            const response = await api.get('/measurements/timeseries', { params });
            const rows = response.data && Array.isArray(response.data) ? response.data : [];
            sourceRowsMap.set(source, rows);
          } catch (error) {
            console.error(`Failed to fetch ${source}:`, error);
            sourceRowsMap.set(source, []);
          }
        }

        const hasDataInRequestedRange = sources.some((source) => {
          const rows = sourceRowsMap.get(source);
          return Array.isArray(rows) && rows.length > 0;
        });

        if (!hasDataInRequestedRange && allowAutoFallback) {
          for (const source of sources) {
            try {
              const fallbackParams: any = {
                station_id: stationId,
                variable_code: variableCode,
                source_code: source,
                entity_type: entityType,
              };

              const response = await api.get('/measurements/timeseries', { params: fallbackParams });
              const fallbackRows = response.data && Array.isArray(response.data) ? response.data : [];
              if (fallbackRows.length === 0) {
                sourceRowsMap.set(source, []);
                continue;
              }

              const selectedFallback = selectFallbackWindowRows(
                fallbackRows,
                effectiveStartDate,
                effectiveEndDate,
              );
              sourceRowsMap.set(source, selectedFallback.rows);
              fallbackUsed = true;

              const fromMs = parseIsoToMs(selectedFallback.from);
              if (fromMs !== undefined) {
                fallbackRangeStartMs =
                  fallbackRangeStartMs === undefined ? fromMs : Math.min(fallbackRangeStartMs, fromMs);
              }

              const toMs = parseIsoToMs(selectedFallback.to);
              if (toMs !== undefined) {
                fallbackRangeEndMs =
                  fallbackRangeEndMs === undefined ? toMs : Math.max(fallbackRangeEndMs, toMs);
              }
            } catch (error) {
              console.error(`Failed fallback fetch for ${source}:`, error);
            }
          }
        }

        for (const source of sources) {
          const rows = sourceRowsMap.get(source) ?? [];
          rows.forEach((point: any) => {
            if (cancelled) return;
            const isoTime = point.time;
            if (!isoTime) return;

            if (!timeMap.has(isoTime)) {
              try {
                const dateObj = new Date(isoTime);
                if (isNaN(dateObj.getTime())) return;

                const displayTime = formatDisplayTime(dateObj);
                timeMap.set(isoTime, { time: isoTime, displayTime });
              } catch (e) {
                console.error('Invalid date:', isoTime, e);
                return;
              }
            }
            const existing = timeMap.get(isoTime);
            if (existing) {
              existing[source] = point.value;
            }
          });
        }

        if (timeMap.size > 0) {
          if (fallbackUsed) {
            addBoundaryPoint(
              timeMap,
              fallbackRangeStartMs !== undefined ? new Date(fallbackRangeStartMs).toISOString() : undefined,
            );
            addBoundaryPoint(
              timeMap,
              fallbackRangeEndMs !== undefined ? new Date(fallbackRangeEndMs).toISOString() : undefined,
            );
          } else {
            addBoundaryPoint(timeMap, effectiveStartDate);
            addBoundaryPoint(timeMap, effectiveEndDate);
          }
        }

        const merged = Array.from(timeMap.values());
        merged.sort((a, b) => {
          return new Date(a.time).getTime() - new Date(b.time).getTime();
        });

        if (cancelled) return;
        setChartData(merged);
        if (fallbackUsed && merged.length > 0) {
          setAutoFallbackInfo({
            used: true,
            from:
              fallbackRangeStartMs !== undefined
                ? new Date(fallbackRangeStartMs).toISOString()
                : merged[0].time,
            to:
              fallbackRangeEndMs !== undefined
                ? new Date(fallbackRangeEndMs).toISOString()
                : merged[merged.length - 1].time,
          });
        } else {
          setAutoFallbackInfo({ used: false });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId, variableCode, sources.join(','), effectiveStartDate, effectiveEndDate, entityType]);

  const handlePeriodApply = () => {
    setShowPeriodPicker(false);
  };

  const handlePeriodReset = () => {
    setCustomPeriod({});
    setShowPeriodPicker(false);
  };

  const parsedYMin = useMemo(() => parseScaleInput(yMinInput), [yMinInput]);
  const parsedYMax = useMemo(() => parseScaleInput(yMaxInput), [yMaxInput]);

  const yDomain = useMemo<[number | 'auto', number | 'auto']>(() => {
    let min = parsedYMin;
    let max = parsedYMax;

    if (logScale) {
      if (min !== undefined && min <= 0) min = undefined;
      if (max !== undefined && max <= 0) max = undefined;
    }

    if (min !== undefined && max !== undefined && min >= max) {
      return ['auto', 'auto'];
    }

    return [min ?? 'auto', max ?? 'auto'];
  }, [logScale, parsedYMax, parsedYMin]);

  const resetYAxisScale = () => {
    setYMinInput('');
    setYMaxInput('');
  };

  const ChartComponent = chartType === 'bar' ? BarChart : LineChart;

  const orderedContinuitySources = useMemo(() => {
    const preferred = (continuityPriority ?? []).filter((source) => sources.includes(source));
    const remaining = sources.filter((source) => !preferred.includes(source));
    return [...preferred, ...remaining];
  }, [continuityPriority, sources]);

  const processedChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];

    const normalizedRows = chartData.map((point) => {
      const normalized: TimeseriesData = { ...point };

      sources.forEach((source) => {
        const rawValue = point[source];
        let value: number | null =
          typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : null;

        if (logScale && value !== null && value <= 0) {
          value = null;
        }

        normalized[source] = value;
      });

      return normalized;
    });

    if (!continuityEnabled || orderedContinuitySources.length <= 1) {
      return normalizedRows;
    }

    const segments = new Map<string, { start: number; end: number }>();
    let cursor = 0;

    for (let i = 0; i < orderedContinuitySources.length; i += 1) {
      const source = orderedContinuitySources[i];

      let start = -1;
      for (let idx = cursor; idx < normalizedRows.length; idx += 1) {
        if (typeof normalizedRows[idx][source] === 'number') {
          start = idx;
          break;
        }
      }

      if (start === -1) continue;

      let nextStart = -1;
      for (let j = i + 1; j < orderedContinuitySources.length && nextStart === -1; j += 1) {
        const nextSource = orderedContinuitySources[j];
        for (let idx = start + 1; idx < normalizedRows.length; idx += 1) {
          if (typeof normalizedRows[idx][nextSource] === 'number') {
            nextStart = idx;
            break;
          }
        }
      }

      const end = nextStart === -1 ? normalizedRows.length - 1 : nextStart - 1;
      segments.set(source, { start, end });
      cursor = nextStart === -1 ? normalizedRows.length : nextStart;
    }

    return normalizedRows.map((point, index) => {
      const segmented: TimeseriesData = {
        time: point.time,
        displayTime: point.displayTime,
      };

      sources.forEach((source) => {
        const value = point[source];
        const segment = segments.get(source);
        const inSegment = segment && index >= segment.start && index <= segment.end;
        segmented[source] = inSegment && typeof value === 'number' ? value : null;
      });

      return segmented;
    });
  }, [chartData, continuityEnabled, logScale, orderedContinuitySources, sources]);

  useEffect(() => {
    if (onDataLoaded) {
      onDataLoaded(processedChartData);
    }
  }, [onDataLoaded, processedChartData]);

  const getSourceConfig = (source: string) => {
    const color = SOURCE_COLORS[source] || '#6b7280';
    let name = source;
    let strokeDasharray = undefined;

    if (source === 'OBS') {
      name = 'Obs';
    } else if (['AROME', 'ECMWF', 'SIM'].includes(source)) {
      name = `Prev ${source}`;
    }

    return { color, name, strokeDasharray };
  };

  const handleExportGraph = () => {
    const chartRoot = chartWrapperRef.current;
    if (!chartRoot) return;

    const svgElement = chartRoot.querySelector('svg');
    if (!svgElement) return;

    const rect = svgElement.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('width', String(width));
    clonedSvg.setAttribute('height', String(height));

    const serialized = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(blobUrl);
        return;
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      const pngUrl = canvas.toDataURL('image/png');
      const anchor = document.createElement('a');
      const label = variableLabel || variableCode || 'graph';
      anchor.download = `${sanitizeFilename(label)}_${new Date().toISOString().slice(0, 10)}.png`;
      anchor.href = pngUrl;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      console.error('Failed to export chart image');
    };

    image.src = blobUrl;
  };

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
        Aucune donnée disponible pour cette sélection
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 p-2">
        <div className="flex flex-wrap items-center gap-3">
          <Label className="flex items-center gap-2 cursor-pointer text-xs">
            <Checkbox checked={logScale} onCheckedChange={(checked) => setLogScale(!!checked)} />
            <TrendingUp className="h-3 w-3" />
            <span>Échelle log</span>
          </Label>

          <Label className="flex items-center gap-2 cursor-pointer text-xs">
            <Checkbox checked={enableBrush} onCheckedChange={(checked) => setEnableBrush(!!checked)} />
            <span>Zoom interactif</span>
          </Label>

          <div className="flex items-center gap-1 rounded-md border bg-background/70 px-2 py-1">
            <span className="text-[11px] text-muted-foreground">Y:</span>
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              value={yMinInput}
              onChange={(event) => setYMinInput(event.target.value)}
              placeholder="Min"
              className="h-6 w-[78px] text-xs"
            />
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              value={yMaxInput}
              onChange={(event) => setYMaxInput(event.target.value)}
              placeholder="Max"
              className="h-6 w-[78px] text-xs"
            />
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={resetYAxisScale}>
              Auto
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover open={showPeriodPicker} onOpenChange={setShowPeriodPicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Calendar className="h-3 w-3" />
                {customPeriod.start || customPeriod.end
                  ? `${customPeriod.start ? format(customPeriod.start, 'dd/MM') : '...'} - ${customPeriod.end ? format(customPeriod.end, 'dd/MM') : '...'}`
                  : 'Période personnalisée'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="end">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Date de début</Label>
                  <CalendarComponent
                    mode="single"
                    selected={customPeriod.start}
                    onSelect={(date) => setCustomPeriod((prev) => ({ ...prev, start: date }))}
                    className="rounded-md border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Date de fin</Label>
                  <CalendarComponent
                    mode="single"
                    selected={customPeriod.end}
                    onSelect={(date) => setCustomPeriod((prev) => ({ ...prev, end: date }))}
                    className="rounded-md border"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handlePeriodApply} className="flex-1 text-xs">
                    Appliquer
                  </Button>
                  <Button size="sm" variant="outline" onClick={handlePeriodReset} className="flex-1 text-xs">
                    Réinitialiser
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleExportGraph}>
            <Download className="h-3 w-3" />
            Exporter graphe
          </Button>
        </div>
      </div>

      {autoFallbackInfo.used && (
        <div className="text-xs text-muted-foreground">
          Periode demandee sans donnees. Affichage automatique des dernieres donnees disponibles:{' '}
          {autoFallbackInfo.from ? format(new Date(autoFallbackInfo.from), 'dd/MM/yyyy HH:mm') : '-'}
          {' -> '}
          {autoFallbackInfo.to ? format(new Date(autoFallbackInfo.to), 'dd/MM/yyyy HH:mm') : '-'}
        </div>
      )}

      <div ref={chartWrapperRef} className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={processedChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="displayTime" tick={{ fontSize: 11 }} stroke="#6b7280" />
            <YAxis
              scale={logScale ? 'log' : 'auto'}
              domain={yDomain}
              tick={{ fontSize: 11 }}
              stroke="#6b7280"
              label={{ value: unit, angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {sources.map((source) => {
              const { color, name, strokeDasharray } = getSourceConfig(source);

              if (chartType === 'bar') {
                return (
                  <Bar
                    key={source}
                    dataKey={source}
                    name={name}
                    fill={color}
                    opacity={0.8}
                  />
                );
              }

              return (
                <Line
                  key={source}
                  type="monotone"
                  dataKey={source}
                  stroke={color}
                  name={name}
                  dot={false}
                  strokeWidth={2}
                  strokeDasharray={strokeDasharray}
                  connectNulls
                />
              );
            })}
            {enableBrush && <Brush dataKey="displayTime" height={30} stroke="#3b82f6" />}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

