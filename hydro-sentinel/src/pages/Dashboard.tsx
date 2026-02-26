import { useState, useEffect } from 'react';
import { HydroMap } from '@/components/HydroMap';
import { CriticalTable } from '@/components/CriticalTable';
import { KPIDashboard } from '@/components/KPIDashboard';
import { CompactVariableSelector, CompactVariableSelection } from '@/components/analysis/CompactVariableSelector';
import { UnifiedChart } from '@/components/analysis/UnifiedChart';
import { useDashboardStore } from '@/store/dashboardStore';
import { api } from '@/lib/api';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StationKpiRow {
  station_id: string;
  precip_cum_24h_mm?: number | null;
  precip_obs_mm?: number | null;
  debit_obs_m3s?: number | null;
  volume_hm3_latest?: number | null;
}

const DEFAULT_SELECTIONS = {
  precip: { variableCode: 'precip_mm', sourceCode: 'OBS', label: 'Précipitations (Observées)', color: '#3b82f6' },
  debit: { variableCode: 'flow_m3s', sourceCode: 'OBS', label: 'Débit (Observé)', color: '#10b981' },
  volume: { variableCode: 'volume_hm3', sourceCode: 'OBS', label: 'Volume (Observé)', color: '#f97316' },
};

function isAlertSeverity(severity?: string): boolean {
  if (!severity) return false;
  return severity === 'critical' || severity === 'warning' || severity.startsWith('ALERTE') || severity.startsWith('VIGILANCE');
}

export default function Dashboard() {
  const { selectedBasinId } = useDashboardStore();
  const [selections, setSelections] = useState<CompactVariableSelection[]>([]);
  const [stationsKpi, setStationsKpi] = useState<StationKpiRow[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'Barrage' | 'Poste Pluviométrique' | 'Station hydrologique' | 'point resultats'>('all');
  const [kpiData, setKpiData] = useState({
    totalStations: 0,
    activeAlerts: 0,
    avgPrecip24h: 0,
    maxDebit: 0,
  });

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

    setSelections((current) => {
      if (current.length > 0) return current;

      const station = stationsKpi.find((s) => s.station_id === selectedBasinId);
      if (station?.precip_cum_24h_mm != null || station?.precip_obs_mm != null) {
        return [DEFAULT_SELECTIONS.precip];
      }
      if (station?.debit_obs_m3s != null) {
        return [DEFAULT_SELECTIONS.debit];
      }
      if (station?.volume_hm3_latest != null) {
        return [DEFAULT_SELECTIONS.volume];
      }
      return [DEFAULT_SELECTIONS.precip];
    });
  }, [selectedBasinId, stationsKpi]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-3 p-4 overflow-hidden">
      <div className="flex-none flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Tableau de bord de surveillance</h1>
        <div className="flex-1 max-w-3xl">
          <KPIDashboard {...kpiData} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
        <div className="col-span-12 lg:col-span-8 relative rounded-xl border bg-card text-card-foreground shadow overflow-hidden flex flex-col">
          <div className="absolute top-4 left-4 z-10 w-[200px] bg-background/90 backdrop-blur-sm rounded-md shadow-sm">
            <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="Station hydrologique">Stations hydrologiques</SelectItem>
                <SelectItem value="Barrage">Barrages</SelectItem>
                <SelectItem value="Poste Pluviométrique">Postes pluviométriques</SelectItem>
                <SelectItem value="point resultats">Points de résultats</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <HydroMap filterType={filterType} />
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 overflow-auto">
          <div className="flex-shrink-0">
            <CriticalTable />
          </div>

          {selectedBasinId ? (
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              <CompactVariableSelector selections={selections} onSelectionChange={setSelections} maxSelections={3} />

              <div className="flex-1 min-h-0 border rounded-lg bg-card p-3">
                {selections.length > 0 ? (
                  <UnifiedChart stationId={selectedBasinId} selections={selections} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Sélectionnez une variable pour afficher le graphique
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 border rounded-xl flex items-center justify-center bg-muted/20 text-muted-foreground p-6 text-center text-sm">
              Sélectionnez une station sur la carte pour voir les détails
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
