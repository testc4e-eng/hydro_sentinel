import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ShieldCheck, Siren, TriangleAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { computeStatus } from "@/features/alerts/damAlerting";
import { useAlertsStore } from "@/store/alertsStore";
import { api } from "@/lib/api";

type AlertStatus = "ALERTE" | "VIGILANCE" | "OK";

interface DamTarget {
  key: string;
  nom: string;
  bassin: string;
  capacite: number;
  match: string[];
}

interface DayPoint {
  date: string;
  tIndex: number;
  creuxPrevu: number;
}

interface DamAlertData {
  key: string;
  nom: string;
  bassin: string;
  capacite: number;
  stationId: string | null;
  series: DayPoint[];
  derniereDate: string | null;
  sourceUtilisee: string;
  noDataMessage?: string;
}

interface EvaluatedDam extends DamAlertData {
  seuilPct: number;
  seuilMm3: number;
  minCreuxMm3: number | null;
  minDate: string | null;
  minTIndex: number | null;
  statut: AlertStatus | "NO_DATA";
}

const TARGET_DAMS: DamTarget[] = [
  { key: "wahda", nom: "Bge Al Wahda", bassin: "Sebou", capacite: 3523, match: ["wahda"] },
  { key: "idriss", nom: "Barrage Idriss 1er", bassin: "Haut Sebou", capacite: 1125, match: ["idriss", "1er"] },
  { key: "ouljet", nom: "Bge Ouljet Soltane", bassin: "Sebou", capacite: 508, match: ["ouljet", "soltane"] },
];

function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("fr-FR");
}

function normalize(input: string): string {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function dayDiff(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86400000);
}

function statusBadge(status: EvaluatedDam["statut"]) {
  if (status === "ALERTE") return <Badge className="bg-red-600 hover:bg-red-600">Alerte</Badge>;
  if (status === "VIGILANCE") return <Badge className="bg-orange-500 hover:bg-orange-500">Vigilance</Badge>;
  if (status === "OK") return <Badge className="bg-emerald-600 hover:bg-emerald-600">OK</Badge>;
  return <Badge variant="outline">Pas de donnees</Badge>;
}

async function fetchDamSeries(
  barrageName: string,
  capacite: number,
  nbJours: number,
): Promise<{ series: DayPoint[]; derniereDate: string | null; sourceUtilisee: string; noDataMessage?: string }> {
  const res = await api.get("/alertes/prevision", {
    params: {
      barrage: barrageName,
      nbJours,
    },
  });

  const payload = res?.data || {};
  const previsions = Array.isArray(payload?.previsions) ? payload.previsions : [];
  const t0Day = String(payload?.t0 || "");
  const sourceUtilisee = "SIM";
  const warning = payload?.avertissement ? String(payload.avertissement) : undefined;

  if (!previsions.length || !t0Day) {
    return {
      series: [],
      derniereDate: payload?.tn || payload?.t0 || null,
      sourceUtilisee,
      noDataMessage:
        warning || "Donnees simulees non disponibles. Importer une nouvelle simulation pour activer les alertes.",
    };
  }

  const series: DayPoint[] = previsions
    .filter((p: any) => p?.jour)
    .map((p: any) => {
      const day = String(p.jour).slice(0, 10);
      const creux = Number(p?.creux_prevu_mm3);
      return {
        date: day,
        tIndex: dayDiff(t0Day, day),
        creuxPrevu: Number.isFinite(creux) ? creux : Number((capacite - Number(p?.volume_prevu_mm3 || 0)).toFixed(1)),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const latestDay = String(payload?.tn || series[series.length - 1]?.date || "");
  return {
    series,
    derniereDate: latestDay || null,
    sourceUtilisee,
    noDataMessage: warning,
  };
}

export default function Alerts() {
  const setActiveAlertsCount = useAlertsStore((state) => state.setActiveAlertsCount);

  const [loading, setLoading] = useState(true);
  const [rowsData, setRowsData] = useState<DamAlertData[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem("alertsEnabledByDam");
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  const [showTableHelp, setShowTableHelp] = useState(true);

  const [seuils, setSeuils] = useState<Record<string, { pct: number; draftPct: number }>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const loaded = await Promise.all(
          TARGET_DAMS.map(async (target) => {
            const fetched = await fetchDamSeries(target.nom, target.capacite, 14);
            return {
              ...target,
              stationId: null,
              ...fetched,
            } as DamAlertData;
          }),
        );

        if (!cancelled) {
          setRowsData(loaded);
          setSeuils((prev) => {
            const next = { ...prev };
            for (const row of loaded) {
              if (!next[row.nom]) {
                next[row.nom] = { pct: 20, draftPct: 20 };
              }
            }
            return next;
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMessage(err?.response?.data?.detail || err?.message || "Erreur de chargement des alertes.");
          setRowsData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const evaluatedRows = useMemo<EvaluatedDam[]>(() => {
    return rowsData.map((row) => {
      const pct = Math.max(0, Math.min(100, Number(seuils[row.nom]?.pct ?? 20)));
      const seuilMm3 = (pct / 100) * row.capacite;

      if (!row.series.length) {
        return {
          ...row,
          seuilPct: pct,
          seuilMm3,
          minCreuxMm3: null,
          minDate: null,
          minTIndex: null,
          statut: "NO_DATA",
        };
      }

      const minPoint = row.series.reduce((min, p) => (p.creuxPrevu < min.creuxPrevu ? p : min), row.series[0]);
      const statut = computeStatus(minPoint.creuxPrevu, seuilMm3);
      return {
        ...row,
        seuilPct: pct,
        seuilMm3,
        minCreuxMm3: minPoint.creuxPrevu,
        minDate: minPoint.date,
        minTIndex: minPoint.tIndex,
        statut,
      };
    });
  }, [rowsData, seuils]);

  const summary = useMemo(() => {
    let alertes = 0;
    let vigilances = 0;
    let ok = 0;
    for (const row of evaluatedRows) {
      const enabled = alertsEnabled[row.nom] ?? true;
      if (!enabled) continue;
      if (row.statut === "ALERTE") alertes += 1;
      else if (row.statut === "VIGILANCE") vigilances += 1;
      else if (row.statut === "OK") ok += 1;
    }
    return { total: evaluatedRows.length, alertes, vigilances, ok };
  }, [alertsEnabled, evaluatedRows]);

  useEffect(() => {
    setActiveAlertsCount(summary.alertes);
  }, [setActiveAlertsCount, summary.alertes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("alertsEnabledByDam", JSON.stringify(alertsEnabled));
  }, [alertsEnabled]);

  const toggleAlertEnabled = (nomBarrage: string) => {
    setAlertsEnabled((prev) => ({ ...prev, [nomBarrage]: !(prev[nomBarrage] ?? true) }));
  };

  const handleSeuilChange = (nomBarrage: string, value: string) => {
    const parsed = Number(value);
    const clamped = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
    setSeuils((prev) => ({
      ...prev,
      [nomBarrage]: {
        ...(prev[nomBarrage] ?? { pct: 20, draftPct: 20 }),
        draftPct: clamped,
      },
    }));
  };

  const validerSeuil = (nomBarrage: string) => {
    setSeuils((prev) => {
      const row = prev[nomBarrage] ?? { pct: 20, draftPct: 20 };
      return {
        ...prev,
        [nomBarrage]: {
          ...row,
          pct: Math.max(0, Math.min(100, Number(row.draftPct) || 0)),
        },
      };
    });
  };

  return (
    <div className="space-y-5 bg-slate-50/60 p-4 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Alertes Barrages (Horizon 14 jours)</h2>
          <p className="text-xs text-slate-500">
            Regle: ALERTE si min(creux prevu t0-&gt;t14) &lt;= seuil, VIGILANCE si &lt;= seuil x 1.4
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Barrages surveilles</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
            <Siren className="h-6 w-6 text-blue-500" />
          </CardContent>
        </Card>
        <Card className={summary.alertes > 0 ? "border-red-300 shadow-sm" : "shadow-sm"}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Alertes (14j)</p>
              <p className="text-2xl font-bold text-red-600">{summary.alertes}</p>
            </div>
            <AlertTriangle className={`h-6 w-6 text-red-600 ${summary.alertes > 0 ? "animate-pulse" : ""}`} />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Vigilance (14j)</p>
              <p className="text-2xl font-bold text-orange-500">{summary.vigilances}</p>
            </div>
            <TriangleAlert className="h-6 w-6 text-orange-500" />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">OK</p>
              <p className="text-2xl font-bold text-emerald-600">{summary.ok}</p>
            </div>
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-slate-900">Resume multi-barrages (source simulee)</CardTitle>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                title={showTableHelp ? "Masquer les explications" : "Afficher les explications"}
                onClick={() => setShowTableHelp((v) => !v)}
              >
                <Info className="h-4 w-4 text-slate-500" />
                {showTableHelp ? "Masquer infos" : "Afficher infos"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const header = [
                    "barrage",
                    "bassin",
                    "creux_min_prevu_mm3",
                    "jour_du_min",
                    "capacite_mm3",
                    "seuil_pct",
                    "seuil_mm3",
                    "statut",
                    "alerte_active",
                  ].join(",");
                  const rows = evaluatedRows.map((row) => {
                    const seuil = Math.max(0, Math.min(100, Number(seuils[row.nom]?.pct ?? 20)));
                    const enabled = alertsEnabled[row.nom] ?? true;
                    return [
                      row.nom,
                      row.bassin,
                      row.minCreuxMm3 !== null ? row.minCreuxMm3.toFixed(1) : "",
                      row.minDate && row.minTIndex !== null ? `t+${row.minTIndex} (${formatDate(row.minDate)})` : "",
                      row.capacite.toFixed(0),
                      String(seuil),
                      row.seuilMm3.toFixed(1),
                      row.statut,
                      enabled ? "on" : "off",
                    ].join(",");
                  });
                  const content = [header, ...rows].join("\n");
                  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "alertes_resume_table.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Telecharger tableau
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showTableHelp && (
            <div
              id="table-help"
              className="mb-3 rounded-md border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600"
            >
              <div className="mb-1 font-semibold text-slate-700">Explication des champs du tableau</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div><span className="font-medium">Barrage :</span> Nom du barrage surveille.</div>
                <div><span className="font-medium">Bassin :</span> Bassin hydrologique associe.</div>
                <div><span className="font-medium">Creux min prevu (Mm3) :</span> Minimum des volumes prevus sur 14 jours.</div>
                <div><span className="font-medium">Jour du min :</span> Date et decalage (t+X) du minimum prevu.</div>
                <div><span className="font-medium">Capacite (Mm3) :</span> Capacite nominale du barrage.</div>
                <div><span className="font-medium">Seuil % :</span> Pourcentage applique a la capacite pour definir le seuil.</div>
                <div><span className="font-medium">Seuil Mm3 :</span> Valeur seuil en volume (Mm3).</div>
                <div><span className="font-medium">Statut :</span> Etat calcule (Alerte, Vigilance, OK).</div>
                <div><span className="font-medium">On/Off :</span> Activation ou desactivation locale des alertes.</div>
              </div>
            </div>
          )}
          {loading ? (
            <div className="text-sm text-muted-foreground">Chargement des previsions...</div>
          ) : errorMessage ? (
            <div className="text-sm text-red-600">{errorMessage}</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barrage</TableHead>
                    <TableHead>Bassin</TableHead>
                    <TableHead className="text-right">Creux min prevu (Mm3)</TableHead>
                    <TableHead>Jour du min</TableHead>
                    <TableHead className="text-right">Capacite (Mm3)</TableHead>
                    <TableHead>Seuil %</TableHead>
                    <TableHead className="text-right">Seuil Mm3</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>On/Off</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluatedRows.map((row) => {
                    const seuilRow = seuils[row.nom] ?? { pct: 20, draftPct: 20 };
                    const enabled = alertsEnabled[row.nom] ?? true;
                    return (
                      <TableRow key={row.key} className="hover:bg-slate-50/70">
                        <TableCell className="font-medium">{row.nom}</TableCell>
                        <TableCell>{row.bassin}</TableCell>
                        <TableCell className="text-right">{row.minCreuxMm3 !== null ? row.minCreuxMm3.toFixed(1) : "-"}</TableCell>
                        <TableCell>
                          {row.minDate && row.minTIndex !== null ? `t+${row.minTIndex} (${formatDate(row.minDate)})` : "-"}
                        </TableCell>
                        <TableCell className="text-right">{row.capacite.toFixed(0)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={seuilRow.draftPct}
                              onChange={(e) => handleSeuilChange(row.nom, e.target.value)}
                              className="w-16 h-8 rounded border px-2 text-xs"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                            <Button size="sm" className="h-8 px-2 text-xs" onClick={() => validerSeuil(row.nom)}>
                              Valider
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{row.seuilMm3.toFixed(1)}</TableCell>
                        <TableCell>{statusBadge(row.statut)}</TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => toggleAlertEnabled(row.nom)}
                            className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-colors ${
                              enabled ? "bg-emerald-500 border-emerald-600" : "bg-slate-300 border-slate-300"
                            }`}
                            title={enabled ? "Alerte active" : "Alerte desactivee"}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                                enabled ? "translate-x-7" : "translate-x-1"
                              }`}
                            />
                            <span className="sr-only">Basculer alerte</span>
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-900">Detail par barrage</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={evaluatedRows[0]?.key}>
            <TabsList className="h-auto flex-wrap justify-start">
              {evaluatedRows.map((row) => (
                <TabsTrigger key={row.key} value={row.key}>
                  {row.nom}
                </TabsTrigger>
              ))}
            </TabsList>

            {evaluatedRows.map((row) => (
              <TabsContent key={row.key} value={row.key} className="space-y-4">
                <DamDetailSection row={row} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <div>
        <Link className="text-sm text-blue-600 hover:underline" to="/recap-barrage">
          Ouvrir Recapitulatif barrage
        </Link>
      </div>
    </div>
  );
}

function DamDetailSection({ row }: { row: EvaluatedDam }) {
  if (!row.series.length) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        {row.noDataMessage || "Aucune donnee de prevision disponible pour ce barrage."}
      </div>
    );
  }

  const chartData = row.series.map((point) => ({
    ...point,
    label: `t+${point.tIndex} (${new Date(`${point.date}T00:00:00`).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    })})`,
  }));

  const downloadCsv = () => {
    const header = ["date", "t_index", "creux_prevu_mm3", "taux_pct", "statut"].join(",");
    const rows = row.series.map((day) => {
      const taux = row.capacite > 0 ? (day.creuxPrevu / row.capacite) * 100 : 0;
      const statut = computeStatus(day.creuxPrevu, row.seuilMm3);
      return [
        day.date,
        String(day.tIndex),
        day.creuxPrevu.toFixed(1),
        taux.toFixed(1),
        statut,
      ].join(",");
    });
    const content = [header, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alertes_${row.key}_table.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadChart = () => {
    const container = document.getElementById(`chart-${row.key}`);
    const svg = container?.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alertes_${row.key}_chart.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-800">Graphe des creux prevus</div>
        <button
          type="button"
          onClick={downloadChart}
          className="rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Telecharger graphe
        </button>
      </div>
      <div id={`chart-${row.key}`} className="h-[280px] rounded-md border bg-white p-2 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 32, left: 16, bottom: 24 }}>
            <defs>
              <linearGradient id={`creuxGradient-${row.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" minTickGap={24} padding={{ left: 12, right: 28 }} />
            <YAxis />
            <Tooltip
              formatter={(value: any) => [`${Number(value).toFixed(1)} Mm3`, "Creux prevu"]}
              labelFormatter={(label) => `${label}`}
            />
            <ReferenceLine
              y={row.seuilMm3}
              stroke="#dc2626"
              strokeDasharray="6 4"
              ifOverflow="extendDomain"
              label={{ value: `Seuil alerte: ${row.seuilMm3.toFixed(1)} Mm3`, fill: "#dc2626", fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="creuxPrevu"
              stroke="#2563eb"
              fill={`url(#creuxGradient-${row.key})`}
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const v = Number(payload?.creuxPrevu);
                if (!Number.isFinite(v)) return null;
                const isAlert = v <= row.seuilMm3;
                return <circle cx={cx} cy={cy} r={isAlert ? 4 : 2.5} fill={isAlert ? "#dc2626" : "#2563eb"} />;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-800">Tableau detaille</div>
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Telecharger tableau
        </button>
      </div>
      <div className="rounded-md border bg-white shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Creux prevu (Mm3)</TableHead>
              <TableHead className="text-right">Taux %</TableHead>
              <TableHead>Statut jour</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {row.series.map((day) => {
              const taux = row.capacite > 0 ? (day.creuxPrevu / row.capacite) * 100 : 0;
              const dayStatus = computeStatus(day.creuxPrevu, row.seuilMm3);
              const isAlert = dayStatus === "ALERTE";
              return (
                <TableRow key={`${row.key}-${day.date}`} className={isAlert ? "bg-red-50/80" : ""}>
                  <TableCell>{`${formatDate(day.date)} (t+${day.tIndex})`}</TableCell>
                  <TableCell className="text-right">{day.creuxPrevu.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{taux.toFixed(1)}%</TableCell>
                  <TableCell>{statusBadge(dayStatus)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
