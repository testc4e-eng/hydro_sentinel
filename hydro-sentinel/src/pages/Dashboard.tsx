import { useEffect, useMemo, useState } from 'react';
import { HydroMap } from '@/components/HydroMap';
import { CriticalTable } from '@/components/CriticalTable';
import { KPIDashboard } from '@/components/KPIDashboard';
import { CompactVariableSelector, CompactVariableSelection } from '@/components/analysis/CompactVariableSelector';
import { UnifiedChart } from '@/components/analysis/UnifiedChart';
import { CompactFilterBar, defaultCompactFilters, type CompactFilters } from '@/components/CompactFilterBar';
import { useDashboardStore } from '@/store/dashboardStore';
import { api } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Layers, Settings2 } from 'lucide-react';

interface StationKpiRow {
  station_id: string;
  basin_id?: string | null;
  precip_cum_24h_mm?: number | null;
  precip_obs_mm?: number | null;
  debit_obs_m3s?: number | null;
  volume_hm3_latest?: number | null;
}

const DEFAULT_SELECTIONS = {
  precip: { variableCode: 'precip_mm', sourceCode: 'OBS', label: 'Precipitations (Observees)', color: '#3b82f6' },
  debit: { variableCode: 'flow_m3s', sourceCode: 'OBS', label: 'Debit (Observe)', color: '#10b981' },
  volume: { variableCode: 'volume_hm3', sourceCode: 'OBS', label: 'Volume (Observe)', color: '#f97316' },
};

function isAlertSeverity(severity?: string): boolean {
  if (!severity) return false;
  return severity === 'critical' || severity === 'warning' || severity.startsWith('ALERTE') || severity.startsWith('VIGILANCE');
}

export default function Dashboard() {
  const { selectedBasinId, mapDisplayMode } = useDashboardStore();
  const [selections, setSelections] = useState<CompactVariableSelection[]>([]);
  const [stationsKpi, setStationsKpi] = useState<StationKpiRow[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'Barrage' | 'Poste Pluviometrique' | 'Station hydrologique' | 'point resultats'>('all');
  const [bassinsVisible, setBassinsVisible] = useState(false);
  const [bassinsType, setBassinsType] = useState<'ABH' | 'DGM' | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [chartFilters, setChartFilters] = useState<CompactFilters>({
    ...defaultCompactFilters,
    period: '7d',
  });
  const [kpiData, setKpiData] = useState({
    totalStations: 0,
    activeAlerts: 0,
    avgPrecip24h: 0,
    maxDebit: 0,
  });

  const chartDateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();

    switch (chartFilters.period) {
      case '24h':
        start.setHours(end.getHours() - 24);
        break;
      case '72h':
        start.setHours(end.getHours() - 72);
        break;
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '14d':
        start.setDate(end.getDate() - 14);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case 'custom': {
        const parsedStart = chartFilters.customStart ? new Date(chartFilters.customStart) : null;
        const parsedEnd = chartFilters.customEnd ? new Date(chartFilters.customEnd) : null;
        if (parsedStart && !Number.isNaN(parsedStart.getTime())) {
          start.setTime(parsedStart.getTime());
        } else {
          start.setDate(end.getDate() - 7);
        }
        if (parsedEnd && !Number.isNaN(parsedEnd.getTime())) {
          end.setTime(parsedEnd.getTime());
        }
        break;
      }
      default:
        start.setDate(end.getDate() - 7);
    }

    return { start: start.toISOString(), end: end.toISOString() };
  }, [chartFilters.customEnd, chartFilters.customStart, chartFilters.period]);

  useEffect(() => {
    Promise.all([
      api.get('/map/points-kpi'),
      api.get('/dashboard/top-critical'),
    ])
      .then(([stationsRes, criticalRes]) => {
        const stations = (stationsRes.data || []) as StationKpiRow[];
        const critical = criticalRes.data || [];

        setStationsKpi(stations);

        const alerts = critical.filter((item: any) => isAlertSeverity(item.severity)).length;
        const avgPrecip = stations.reduce((sum: number, s: any) => sum + (s.precip_cum_24h_mm || 0), 0) / (stations.length || 1);
        const maxDebit = Math.max(...stations.map((s: any) => s.debit_obs_m3s || 0));

        setKpiData({
          totalStations: stations.length,
          activeAlerts: alerts,
          avgPrecip24h: avgPrecip,
          maxDebit,
        });
      })
      .catch((err) => console.error('Failed to fetch KPI data:', err));
  }, []);

  useEffect(() => {
    if (!selectedBasinId) {
      setSelections([]);
      return;
    }

    const station = stationsKpi.find((s) => s.station_id === selectedBasinId);
    const modeDefault =
      mapDisplayMode === 'precip'
        ? DEFAULT_SELECTIONS.precip
        : mapDisplayMode === 'debit'
          ? DEFAULT_SELECTIONS.debit
          : mapDisplayMode === 'volume'
            ? DEFAULT_SELECTIONS.volume
            : null;

    const fallbackDefault =
      (station?.precip_cum_24h_mm != null || station?.precip_obs_mm != null)
        ? DEFAULT_SELECTIONS.precip
        : (station?.debit_obs_m3s != null)
          ? DEFAULT_SELECTIONS.debit
          : (station?.volume_hm3_latest != null)
            ? DEFAULT_SELECTIONS.volume
            : DEFAULT_SELECTIONS.precip;

    const targetDefault = modeDefault ?? fallbackDefault;

    const isDefaultSelection = (selection: CompactVariableSelection): boolean =>
      [DEFAULT_SELECTIONS.precip, DEFAULT_SELECTIONS.debit, DEFAULT_SELECTIONS.volume].some(
        (d) => d.variableCode === selection.variableCode && d.sourceCode === selection.sourceCode,
      );

    setSelections((current) => {
      if (current.length === 0) return [targetDefault];

      // Keep user custom multi-selection. Auto-sync only simple/default single selection.
      if (current.length === 1 && isDefaultSelection(current[0])) {
        return [targetDefault];
      }

      return current;
    });
  }, [selectedBasinId, stationsKpi, mapDisplayMode]);

  const handleBassinsToggle = () => {
    if (!bassinsType) {
      setShowTypeMenu(true);
      return;
    }
    setBassinsVisible((current) => !current);
  };

  const handleSelectBassinsType = (type: 'ABH' | 'DGM') => {
    setBassinsType(type);
    setBassinsVisible(true);
    setShowTypeMenu(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3 overflow-hidden p-4">
      <div className="flex-none flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Tableau de bord de surveillance</h1>
        <div className="max-w-3xl flex-1">
          <KPIDashboard {...kpiData} />
        </div>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-12 gap-3">
        <div className="relative col-span-12 flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow lg:col-span-8">
          <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
            <div className="w-[200px] rounded-md bg-background/90 shadow-sm backdrop-blur-sm">
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="Station hydrologique">Stations hydrologiques</SelectItem>
                  <SelectItem value="Barrage">Barrages</SelectItem>
                  <SelectItem value="Poste Pluviometrique">Postes pluviometriques</SelectItem>
                  <SelectItem value="point resultats">Points de resultats</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <button
              type="button"
              onClick={handleBassinsToggle}
              className={`h-8 rounded-md border px-2.5 text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                bassinsVisible
                  ? 'bg-slate-900 text-white border-slate-100/60 shadow-sm'
                  : 'bg-slate-900/90 text-white border-slate-300/20 hover:bg-slate-800'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{bassinsType ? `Bassins · ${bassinsType}` : 'Bassins'}</span>
            </button>

            <Popover open={showTypeMenu} onOpenChange={setShowTypeMenu}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-8 w-8 rounded-md border border-slate-300/20 bg-slate-900/90 text-white inline-flex items-center justify-center hover:bg-slate-800 transition-colors"
                  aria-label="Choisir le type de bassins"
                  title="Choisir le type de bassins"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-52 p-2">
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => handleSelectBassinsType('ABH')}
                    className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
                      <span>Bassins ABH</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectBassinsType('DGM')}
                    className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                      <span>Bassins DGM</span>
                    </span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <HydroMap filterType={filterType} bassinsVisible={bassinsVisible} bassinsType={bassinsType} />
        </div>

        <div className="col-span-12 flex flex-col gap-3 overflow-auto lg:col-span-4">
          <div className="flex-shrink-0">
            <CriticalTable />
          </div>

          {selectedBasinId ? (
            <div className="flex flex-1 min-h-0 flex-col gap-3">
              <CompactVariableSelector selections={selections} onSelectionChange={setSelections} maxSelections={3} />
              <CompactFilterBar filters={chartFilters} onChange={setChartFilters} hideSources />

              <div className="flex-1 min-h-0 rounded-lg border bg-card p-3">
                {selections.length > 0 ? (
                  <UnifiedChart
                    stationId={selectedBasinId}
                    fallbackBasinId={stationsKpi.find((s) => s.station_id === selectedBasinId)?.basin_id ?? undefined}
                    selections={selections}
                    startDate={chartDateRange.start}
                    endDate={chartDateRange.end}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Selectionnez une variable pour afficher le graphique
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Selectionnez une station sur la carte pour voir les details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
