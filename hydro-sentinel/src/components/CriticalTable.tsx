import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from './ui/table';

interface CriticalItem {
  station_id: string;
  station_name: string;
  basin_name: string;
  precip_cum_24h_mm: number;
  debit_max_24h_m3s: number;
  severity: string;
  score: number;
}

function normalizeSeverity(severity?: string): 'safe' | 'warning' | 'critical' {
  if (!severity) return 'safe';
  if (severity === 'critical' || severity.startsWith('ALERTE')) return 'critical';
  if (severity === 'warning' || severity.startsWith('VIGILANCE')) return 'warning';
  if (severity === 'safe' || severity === 'OK') return 'safe';
  return 'safe';
}

export function CriticalTable() {
  const [items, setItems] = useState<CriticalItem[]>([]);

  useEffect(() => {
    api.get<CriticalItem[]>('/dashboard/top-critical')
      .then((res) => setItems(res.data))
      .catch((err) => console.error('Failed to fetch critical table', err));
  }, []);

  return (
    <div className="rounded-md border bg-card">
      <div className="px-3 py-2 border-b">
        <h3 className="font-semibold text-sm">Top Vigilance (24h)</h3>
      </div>
      <ScrollArea className="h-[280px] w-full">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs h-8 py-1">Station</TableHead>
              <TableHead className="text-xs h-8 py-1">Bassin</TableHead>
              <TableHead className="text-xs h-8 py-1 text-right">Pluie 24h</TableHead>
              <TableHead className="text-xs h-8 py-1 text-right">Débit Max</TableHead>
              <TableHead className="text-xs h-8 py-1 text-center">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const level = normalizeSeverity(item.severity);
              return (
                <TableRow key={item.station_id} className="h-9">
                  <TableCell className="font-medium text-xs py-1">{item.station_name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs py-1">{item.basin_name}</TableCell>
                  <TableCell className="text-right text-xs py-1">{item.precip_cum_24h_mm?.toFixed(1) ?? '-'}</TableCell>
                  <TableCell className="text-right text-xs py-1">{item.debit_max_24h_m3s?.toFixed(1) ?? '-'}</TableCell>
                  <TableCell className="text-center py-1">
                    <Badge
                      variant={level === 'critical' ? 'destructive' : level === 'warning' ? 'default' : 'secondary'}
                      className={`text-[10px] px-1.5 py-0 h-5 ${level === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                    >
                      {level === 'critical' ? 'ALERTE' : level === 'warning' ? 'VIGILANCE' : 'OK'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-20 text-muted-foreground text-xs">
                  Aucune donnée de vigilance disponible
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
