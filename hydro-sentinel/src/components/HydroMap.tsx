import React, { useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '../lib/api';
import { useDashboardStore } from '../store/dashboardStore';

interface MapPoint {
  station_id: string;
  station_code?: string | null;
  station_name: string;
  station_type: string;
  basin_id?: string | null;
  basin_code?: string | null;
  basin_name?: string | null;
  is_active?: boolean | null;
  lat: number;
  lon: number;
  severity: 'safe' | 'warning' | 'critical' | 'OK' | 'ALERTE_LACHER' | string;
  score: number;
  kpi_source?: string | null;
  kpi_run_time?: string | null;
  last_data_time?: string | null;
  precip_obs_mm: number | null;
  precip_obs_time?: string | null;
  precip_arome_mm?: number | null;
  precip_ecmwf_mm?: number | null;
  precip_ecmwf_time?: string | null;
  precip_cum_24h_mm: number | null;
  debit_obs_m3s: number | null;
  debit_sim_m3s: number | null;
  debit_obs_time?: string | null;
  debit_max_24h_m3s?: number | null;
  lacher_m3s_latest?: number | null;
  lacher_m3s_time?: string | null;
  lacher_max_24h_m3s?: number | null;
  volume_hm3_latest: number | null;
  volume_obs_hm3?: number | null;
  volume_sim_hm3: number | null;
  volume_hm3_time?: string | null;
  apport_max_24h_m3s?: number | null;
}

const severityColors = {
  safe: '#10b981',    // green-500
  warning: '#f59e0b', // amber-500
  critical: '#ef4444' // red-500
};

export function HydroMap({ filterType = 'all' }: { filterType?: 'all' | 'Barrage' | 'Poste Pluviométrique' | 'Station hydrologique' | 'point resultats' }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { selectedBasinId, setSelectedBasinId, mapDisplayMode, setMapDisplayMode } = useDashboardStore();
  const [points, setPoints] = React.useState<MapPoint[]>([]);
  const [basins, setBasins] = React.useState<any[]>([]);
  const [sourceMode, setSourceMode] = React.useState<'OBS' | 'SIM'>('OBS');
  const hasHydroSimulatedData = useMemo(
    () => points.some((p) => p.debit_sim_m3s !== null || p.volume_sim_hm3 !== null),
    [points]
  );
  const hasForecastPrecipData = useMemo(
    () => points.some((p) => p.precip_arome_mm !== null || p.precip_ecmwf_mm !== null),
    [points]
  );
  const canUseSimulatedSource = mapDisplayMode === 'precip' ? hasForecastPrecipData : hasHydroSimulatedData;

  const escapeHtml = (value: unknown): string => {
    if (value === null || value === undefined) return '--';
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  };

  const formatNum = (value: number | null | undefined, digits = 1): string => {
    if (value === null || value === undefined || Number.isNaN(value)) return '--';
    return Number(value).toFixed(digits);
  };
  const sameNumericValue = (a: number | null | undefined, b: number | null | undefined): boolean => {
    if (a === null || a === undefined || b === null || b === undefined) return false;
    return Math.abs(Number(a) - Number(b)) < 1e-9;
  };

  const formatDateTime = (value?: string | null): string => {
    if (!value) return '--';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '--';
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSeverity = (severity?: string | null): string => {
    if (!severity) return '--';
    if (severity.startsWith('ALERTE')) return 'Alerte';
    if (severity.startsWith('VIGILANCE')) return 'Vigilance';
    if (severity === 'OK' || severity === 'safe') return 'OK';
    if (severity === 'warning') return 'Vigilance';
    if (severity === 'critical') return 'Alerte';
    return severity;
  };

  useEffect(() => {
    if (!canUseSimulatedSource && sourceMode === 'SIM') {
      setSourceMode('OBS');
    }
  }, [canUseSimulatedSource, sourceMode]);

  // Fetch points & basins
  useEffect(() => {
    // Fetch KPI points
    api.get<MapPoint[]>('/map/points-kpi')
      .then(res => {
        console.log("ðŸ—ºï¸ fetched map points:", res.data.length);
        setPoints(res.data);
      })
      .catch(err => console.error("Failed to load map points", err));
      
    // Fetch Basins
    api.get<any[]>('/basins')
      .then(res => {
        console.log("ðŸŒ² fetched basins:", res.data.length);
        setBasins(res.data);
      })
      .catch(err => console.error("Failed to load basins", err));
  }, []);

  const pointGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: points
      .filter(p => p.lon !== null && p.lat !== null && p.lon !== undefined && p.lat !== undefined)
      .filter(p => filterType === 'all' || p.station_type === filterType)
      .map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
        properties: {
          ...p,
          precip_val: sourceMode === 'SIM'
            ? (p.precip_arome_mm ?? p.precip_ecmwf_mm ?? p.precip_cum_24h_mm ?? p.precip_obs_mm)
            : (p.precip_cum_24h_mm ?? p.precip_obs_mm),
          precip_source: sourceMode === 'SIM'
            ? (
                p.precip_arome_mm !== null && p.precip_arome_mm !== undefined
                  ? 'AROME'
                  : (
                      p.precip_ecmwf_mm !== null && p.precip_ecmwf_mm !== undefined
                        ? 'ECMWF'
                        : 'OBS'
                    )
              )
            : 'OBS',
          displayMode: mapDisplayMode,
          source_mode: sourceMode,
          // Computed dynamic properties based on source mode
          debit_val: sourceMode === 'SIM' ? p.debit_sim_m3s : p.debit_obs_m3s,
          volume_val: sourceMode === 'SIM' ? p.volume_sim_hm3 : p.volume_hm3_latest,
          // Pre-calculate display checks to simplify expression
          hasPrecip: (sourceMode === 'SIM'
            ? (p.precip_arome_mm ?? p.precip_ecmwf_mm ?? p.precip_cum_24h_mm ?? p.precip_obs_mm)
            : (p.precip_cum_24h_mm ?? p.precip_obs_mm)) !== null
            && (sourceMode === 'SIM'
              ? (p.precip_arome_mm ?? p.precip_ecmwf_mm ?? p.precip_cum_24h_mm ?? p.precip_obs_mm)
              : (p.precip_cum_24h_mm ?? p.precip_obs_mm)) !== undefined,
          hasDebit: sourceMode === 'SIM' ? (p.debit_sim_m3s !== null && p.debit_sim_m3s !== undefined) : (p.debit_obs_m3s !== null && p.debit_obs_m3s !== undefined),
          hasVolume: sourceMode === 'SIM' ? (p.volume_sim_hm3 !== null && p.volume_sim_hm3 !== undefined) : (p.volume_hm3_latest !== null && p.volume_hm3_latest !== undefined)
        }
      }))
  }), [points, mapDisplayMode, filterType, sourceMode]);

  const basinGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: basins
      .filter(b => b.geometry !== null && b.geometry !== undefined)
      .map(b => ({
        type: 'Feature',
        geometry: b.geometry,
        properties: {
          id: b.id,
          name: b.name,
          code: b.code,
          level: b.level
        }
      }))
  }), [basins]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/satellite/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
      center: [-5.0, 34.0], // Centered on Sebou
      zoom: 7
    });

    map.current.on('load', () => {
      if (!map.current) return;

      map.current.addSource('basins', {
        type: 'geojson',
        data: basinGeoJson as any
      });

      map.current.addSource('stations', {
        type: 'geojson',
        data: pointGeoJson as any
      });

      // Basin Fill Layer
      map.current.addLayer({
        id: 'basins-fill',
        type: 'fill',
        source: 'basins',
        paint: {
          'fill-color': '#0369a1', // sky-700
          'fill-opacity': 0.15
        }
      });

      // Basin Outline Layer
      map.current.addLayer({
        id: 'basins-outline',
        type: 'line',
        source: 'basins',
        paint: {
          'line-color': '#0ea5e9', // sky-500
          'line-width': 1.5
        }
      });

      map.current.addLayer({
        id: 'stations-circle',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, [
              'match',
              ['get', 'station_type'],
              'Barrage', 9,
              'Station hydrologique', 6,
              'Poste Pluviométrique', 6,
              'point resultats', 6,
              5
            ],
            12, [
              'match',
              ['get', 'station_type'],
              'Barrage', 18,
              'Station hydrologique', 12,
              'Poste Pluviométrique', 12,
              'point resultats', 12,
              10
            ]
          ],
          'circle-color': [
            'case',
            // --- Precip Mode ---
            ['==', ['get', 'displayMode'], 'precip'],
            ['case',
                ['==', ['get', 'precip_val'], null], '#9ca3af', // Gray only when no data
                ['<=', ['get', 'precip_val'], 0], '#dbeafe',
                ['<=', ['get', 'precip_val'], 0.2], '#3b82f6',
                [
                  'interpolate',
                  ['linear'],
                  ['get', 'precip_val'],
                  0.2, '#3b82f6',
                  1, '#2563eb',
                  5, '#1d4ed8',
                  15, '#1e3a8a',
                  30, '#4c1d95',
                  100, '#be185d' // Pink/Red for extreme
                ]
            ],
            // --- Debit Mode ---
            ['==', ['get', 'displayMode'], 'debit'],
            ['case',
                ['==', ['get', 'debit_val'], null], '#9ca3af',
                ['==', ['get', 'debit_val'], 0], '#d1fae5', 
                [
                  'interpolate',
                  ['linear'],
                  ['get', 'debit_val'],
                  0.1, '#6ee7b7',
                  10, '#10b981',
                  50, '#059669',
                  100, '#047857',
                  500, '#022c22'
                ]
            ],
            // --- Volume Mode ---
            ['==', ['get', 'displayMode'], 'volume'],
             ['case',
                ['==', ['get', 'volume_val'], null], '#9ca3af',
                ['==', ['get', 'volume_val'], 0], '#ffedd5',
                [
                  'interpolate',
                  ['linear'],
                  ['get', 'volume_val'],
                  10, '#fdba74',
                  100, '#f97316',
                  500, '#c2410c',
                  1000, '#7c2d12'
                ]
            ],
            // --- Default / Severity Mode ---
            ['==', ['get', 'displayMode'], 'severity'],
            [
              'match',
              ['get', 'station_type'],
              'Station hydrologique', '#3b82f6', // blue-500
              'Barrage', '#8b5cf6',      // violet-500
              'Poste Pluviométrique', '#06B6D4', // cyan
              'point resultats', '#10b981', // emerald-500
              '#6b7280' // gray-500 default
            ],
            // Fallback for logic errors
            [
              'match',
              ['get', 'severity'],
              'OK', severityColors.safe,
              'safe', severityColors.safe,
              'warning', severityColors.warning,
              'critical', severityColors.critical,
              'ALERTE_LACHER', severityColors.critical,
              '#9ca3af' // default gray
            ]
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': [
            'match',
            ['get', 'severity'],
            'critical', '#ffffff',
            'ALERTE_LACHER', '#ffffff',
            'warning', '#ffffff',
            '#ffffff'
          ]
        }
      });

      // Cursor pointer
      map.current.on('mouseenter', 'stations-circle', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'stations-circle', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });

      // Click Popup
      map.current.on('click', 'stations-circle', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties as MapPoint;
        const isDam = props.station_type === 'Barrage';
        const dynamicProps = feature.properties as any;

        // Update global selection
        useDashboardStore.getState().setSelectedBasinId(props.station_id);

        const coordinates = (feature.geometry as any).coordinates.slice();
        const sourceModeLabel = dynamicProps.displayMode === 'precip'
          ? (dynamicProps.source_mode === 'SIM' ? (dynamicProps.precip_source || 'PREV') : 'OBS')
          : (dynamicProps.source_mode === 'SIM' ? 'SIM' : 'OBS');
        const basinLabel = props.basin_name
          ? `${escapeHtml(props.basin_name)}${props.basin_code ? ` (${escapeHtml(props.basin_code)})` : ''}`
          : '';

        const toRow = (label: string, value: string) => `
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
            <span style="color:#64748b;">${escapeHtml(label)}</span>
            <span style="font-weight:600;text-align:right;">${value}</span>
          </div>
        `;

        const metaRows: string[] = [];
        if (props.station_code) metaRows.push(toRow('Code', escapeHtml(props.station_code)));
        if (basinLabel) metaRows.push(toRow('Bassin', basinLabel));
        if (props.is_active !== null && props.is_active !== undefined) {
          metaRows.push(toRow('Etat', props.is_active ? 'Actif' : 'Inactif'));
        }
        if (props.severity) {
          const sev = escapeHtml(formatSeverity(props.severity));
          const score = props.score !== null && props.score !== undefined ? ` (${formatNum(props.score, 1)})` : '';
          metaRows.push(toRow('Vigilance', `${sev}${score}`));
        }
        metaRows.push(toRow('Source active', escapeHtml(sourceModeLabel)));
        if (props.last_data_time) metaRows.push(toRow('Derniere MAJ', escapeHtml(formatDateTime(props.last_data_time))));

        const dataRows: string[] = [];
        if (props.precip_cum_24h_mm !== null && props.precip_cum_24h_mm !== undefined) {
          dataRows.push(toRow('Pluie 24h', `${formatNum(props.precip_cum_24h_mm, 1)} mm`));
        }
        if (props.precip_obs_mm !== null && props.precip_obs_mm !== undefined) {
          dataRows.push(toRow('Pluie OBS', `${formatNum(props.precip_obs_mm, 1)} mm`));
        }
        if (props.precip_arome_mm !== null && props.precip_arome_mm !== undefined) {
          dataRows.push(toRow('Pluie AROME', `${formatNum(props.precip_arome_mm, 1)} mm`));
        }
        if (props.precip_ecmwf_mm !== null && props.precip_ecmwf_mm !== undefined) {
          dataRows.push(toRow('Pluie ECMWF', `${formatNum(props.precip_ecmwf_mm, 1)} mm`));
        }
        if (props.precip_obs_time) dataRows.push(toRow('Date pluie', escapeHtml(formatDateTime(props.precip_obs_time))));

        if (dynamicProps.debit_val !== null && dynamicProps.debit_val !== undefined) {
          dataRows.push(toRow(`Debit (${sourceModeLabel})`, `${formatNum(Number(dynamicProps.debit_val), 2)} m3/s`));
        }
        const isActiveObsDebit = dynamicProps.source_mode === 'OBS' && sameNumericValue(props.debit_obs_m3s, Number(dynamicProps.debit_val));
        const isActiveSimDebit = dynamicProps.source_mode === 'SIM' && sameNumericValue(props.debit_sim_m3s, Number(dynamicProps.debit_val));
        if (props.debit_obs_m3s !== null && props.debit_obs_m3s !== undefined && !isActiveObsDebit) {
          dataRows.push(toRow('Debit OBS', `${formatNum(props.debit_obs_m3s, 2)} m3/s`));
        }
        if (props.debit_sim_m3s !== null && props.debit_sim_m3s !== undefined && !isActiveSimDebit) {
          dataRows.push(toRow('Debit SIM', `${formatNum(props.debit_sim_m3s, 2)} m3/s`));
        }
        if (props.debit_max_24h_m3s !== null && props.debit_max_24h_m3s !== undefined) {
          dataRows.push(toRow('Debit max 24h', `${formatNum(props.debit_max_24h_m3s, 2)} m3/s`));
        }
        if (props.debit_obs_time) dataRows.push(toRow('Date debit', escapeHtml(formatDateTime(props.debit_obs_time))));

        if (isDam) {
          if (props.lacher_m3s_latest !== null && props.lacher_m3s_latest !== undefined) {
            dataRows.push(toRow('Lacher actuel', `${formatNum(props.lacher_m3s_latest, 2)} m3/s`));
          }
          if (props.lacher_max_24h_m3s !== null && props.lacher_max_24h_m3s !== undefined) {
            dataRows.push(toRow('Lacher max 24h', `${formatNum(props.lacher_max_24h_m3s, 2)} m3/s`));
          }
          if (props.lacher_m3s_time) dataRows.push(toRow('Date lacher', escapeHtml(formatDateTime(props.lacher_m3s_time))));

          if (dynamicProps.volume_val !== null && dynamicProps.volume_val !== undefined) {
            dataRows.push(toRow(`Volume (${sourceModeLabel})`, `${formatNum(Number(dynamicProps.volume_val), 2)} hm3`));
          }
          const isActiveObsVolume = dynamicProps.source_mode === 'OBS' && sameNumericValue(props.volume_obs_hm3, Number(dynamicProps.volume_val));
          const isActiveSimVolume = dynamicProps.source_mode === 'SIM' && sameNumericValue(props.volume_sim_hm3, Number(dynamicProps.volume_val));
          if (props.volume_obs_hm3 !== null && props.volume_obs_hm3 !== undefined && !isActiveObsVolume) {
            dataRows.push(toRow('Volume OBS', `${formatNum(props.volume_obs_hm3, 2)} hm3`));
          }
          if (props.volume_sim_hm3 !== null && props.volume_sim_hm3 !== undefined && !isActiveSimVolume) {
            dataRows.push(toRow('Volume SIM', `${formatNum(props.volume_sim_hm3, 2)} hm3`));
          }
          if (props.volume_hm3_time) dataRows.push(toRow('Date volume', escapeHtml(formatDateTime(props.volume_hm3_time))));
        }

        new maplibregl.Popup({ maxWidth: '360px' })
          .setLngLat(coordinates as [number, number])
          .setHTML(`
            <div style="min-width:320px;padding:10px 12px;font-size:12px;line-height:1.35;">
              <h3 style="font-weight:700;font-size:20px;margin:0 0 2px 0;">${escapeHtml(props.station_name)}</h3>
              <div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">
                ${escapeHtml(props.station_type?.replace('_', ' '))}
              </div>

              <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;padding-bottom:8px;border-bottom:1px solid #e2e8f0;">
                ${metaRows.join('')}
              </div>

              ${dataRows.length > 0 ? `
                <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;">
                  ${dataRows.join('')}
                </div>
              ` : ''}

              <div style="padding-top:8px;margin-top:8px;border-top:1px solid #e2e8f0;font-size:11px;text-align:center;color:#64748b;font-style:italic;">
                Cliquez pour voir le graphique detaille
              </div>
            </div>
          `)
          .addTo(map.current!);
      });
    });
  }, []);

  // Update source data when points change or mode changes
  useEffect(() => {
    if (map.current && map.current.getSource('stations')) {
      (map.current.getSource('stations') as maplibregl.GeoJSONSource).setData(pointGeoJson as any);
    }
  }, [pointGeoJson]);

  useEffect(() => {
    if (map.current && map.current.getSource('basins')) {
      (map.current.getSource('basins') as maplibregl.GeoJSONSource).setData(basinGeoJson as any);
    }
  }, [basinGeoJson]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map Control - Top Right */}
      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm p-2 rounded-md shadow-md border z-10 w-36">
        <div className="text-xs font-semibold mb-2 px-1">Données</div>
        <div className="flex gap-1 mb-3 bg-muted/30 p-1 rounded-md">
          <button 
            onClick={() => setSourceMode('OBS')}
            className={`flex-1 text-[10px] py-1 rounded transition-colors ${sourceMode === 'OBS' ? 'bg-background shadow-sm border font-bold text-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Observé
          </button>
          <button 
            onClick={() => setSourceMode('SIM')}
            disabled={!canUseSimulatedSource}
            title={!canUseSimulatedSource ? (mapDisplayMode === 'precip' ? 'Aucune prevision disponible' : 'Aucune donnee simulee disponible') : undefined}
            className={`flex-1 text-[10px] py-1 rounded transition-colors ${
              !canUseSimulatedSource
                ? 'text-muted-foreground/50 cursor-not-allowed'
                : sourceMode === 'SIM'
                  ? 'bg-background shadow-sm border font-bold text-foreground'
                  : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Simulé
          </button>
        </div>
        {!canUseSimulatedSource && (
          <div className="text-[10px] text-muted-foreground px-1 mb-2">
            {mapDisplayMode === 'precip'
              ? 'Pas de previsions AROME/ECMWF dans la base.'
              : 'Pas de donnees simulees dans la base.'}
          </div>
        )}

        <div className="text-xs font-semibold mb-2 px-1">Affichage</div>
        <div className="flex flex-col gap-1">
          {[
            { id: 'severity', label: 'Vigilance' },
            { id: 'precip', label: 'Précipitations' },
            { id: 'debit', label: 'Débits' },
            { id: 'volume', label: 'Volume' }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setMapDisplayMode(mode.id as any)}
              className={`text-xs px-2 py-1 rounded text-left transition-colors ${
                mapDisplayMode === mode.id 
                  ? 'bg-primary text-primary-foreground font-medium' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        
        {/* Simple Legend */}
        <div className="mt-3 pt-2 border-t px-1">
          <div className="text-[10px] text-muted-foreground mb-1">Légende</div>
          <div className="flex flex-col gap-1 text-[10px]">
            {mapDisplayMode === 'severity' && (
              <>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#8B5CF6]"></div>
                        <span className="text-xs">Barrage</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
                        <span className="text-xs">Station Hydrologique</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#06B6D4]"></div>
                        <span className="text-xs">Poste Pluviométrique</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                        <span className="text-xs">Point Résultats</span>
                    </div>
                </div>
              </>
            )}
            {mapDisplayMode === 'precip' && (
               <div className="w-full h-2 rounded bg-gradient-to-r from-blue-100 via-blue-500 to-indigo-900"></div>
            )}
            {mapDisplayMode === 'debit' && (
               <div className="w-full h-2 rounded bg-gradient-to-r from-emerald-100 via-emerald-500 to-emerald-900"></div>
            )}
            {mapDisplayMode === 'volume' && (
               <div className="w-full h-2 rounded bg-gradient-to-r from-orange-100 via-orange-500 to-orange-900"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



