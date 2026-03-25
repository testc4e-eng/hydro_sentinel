import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { api } from "@/lib/api";

export interface RecapTableRow {
  date?: string;
  pluieMm?: number | null;
  retenueMm3?: number | null;
  apportsMm3?: number | null;
  creuxMm3?: number | null;
  restitutionMm3?: number | null;
  debitMaxM3s?: number | null;
  debitMoyenJournalierM3s?: number | null;
}

interface RecapTableProps {
  barrageId?: string;
  barrageName: string;
  periode: string;
  dateFin: string;
}

function parsePeriodeToDays(periode: string): number {
  const normalized = String(periode || "").toLowerCase().trim();
  if (normalized === "24h") return 1;
  if (normalized === "72h") return 3;
  if (normalized === "7d") return 7;
  if (normalized === "14d") return 14;
  if (normalized === "30d") return 30;
  const parsed = Number.parseInt(normalized.replace(/[^\d]/g, ""), 10);
  if (Number.isFinite(parsed)) return Math.max(1, parsed);
  return 14;
}

function formatDay(dateInput: Date): string {
  const dd = String(dateInput.getDate()).padStart(2, "0");
  const mm = String(dateInput.getMonth() + 1).padStart(2, "0");
  const yyyy = String(dateInput.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function parseDateLike(value?: string): Date | null {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const parsed = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toNumber(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return Number(value);
}

function formatCellValue(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function RecapTable({ barrageId, barrageName, periode, dateFin }: RecapTableProps) {
  const daysCount = useMemo(() => parsePeriodeToDays(periode), [periode]);
  const [apiRows, setApiRows] = useState<RecapTableRow[]>([]);

  useEffect(() => {
    if (!barrageId || !dateFin) {
      setApiRows([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const response = await api.get("/recapitulatif/barrage", {
          params: {
            barrage_id: barrageId,
            date_fin: dateFin,
            nb_jours: daysCount,
          },
        });

        const rows = Array.isArray(response.data) ? response.data : [];
        const mapped: RecapTableRow[] = rows.map((row: any) => ({
          date: row?.jour,
          pluieMm: row?.pluie_moy,
          retenueMm3: row?.retenue_actuelle,
          apportsMm3: row?.apports,
          creuxMm3: row?.creux_actuel,
          restitutionMm3: row?.restitutions,
          debitMaxM3s: row?.debit_max,
          debitMoyenJournalierM3s: row?.debit_moy_j,
        }));

        if (!cancelled) {
          setApiRows(mapped);
        }
      } catch {
        if (!cancelled) {
          setApiRows([]);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [barrageId, dateFin, daysCount]);

  const tableRows = useMemo(() => {
    if (apiRows.length > 0) {
      const sorted = [...apiRows].sort((a, b) => {
        const da = parseDateLike(a.date)?.getTime() ?? 0;
        const db = parseDateLike(b.date)?.getTime() ?? 0;
        return da - db;
      });
      return sorted.map((row) => ({
        ...row,
        date: parseDateLike(row.date) ? formatDay(parseDateLike(row.date) as Date) : row.date ?? "-",
      }));
    }

    const out: RecapTableRow[] = [];
    const end = parseDateLike(dateFin) ?? new Date();
    for (let i = daysCount - 1; i >= 0; i -= 1) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      out.push({ date: formatDay(d) });
    }
    return out;
  }, [apiRows, dateFin, daysCount]);

  const latestDateForTitle = useMemo(() => {
    if (tableRows.length === 0) return formatDay(new Date());
    const last = tableRows[tableRows.length - 1];
    return last?.date || formatDay(new Date());
  }, [tableRows]);

  const totals = useMemo(() => {
    return tableRows.reduce(
      (acc, row) => {
        acc.pluieMm += toNumber(row.pluieMm);
        acc.apportsMm3 += toNumber(row.apportsMm3);
        acc.restitutionMm3 += toNumber(row.restitutionMm3);
        return acc;
      },
      { pluieMm: 0, apportsMm3: 0, restitutionMm3: 0 },
    );
  }, [tableRows]);

  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="w-24" />
        <h3 className="text-center text-lg font-bold text-gray-900">
          {`Recap Barrage ${barrageName || "-"} ${latestDateForTitle}`}
        </h3>
        <Button variant="outline" size="sm" className="h-8 text-xs" disabled>
          <Download className="mr-1 h-3.5 w-3.5" />
          Exporter Excel
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#1E3A5F] text-white">
              <th className="border border-gray-300 px-2 py-2 text-left font-bold">Jour</th>
              <th className="border border-gray-300 px-2 py-2 text-center font-bold">{`Pluie (Moy) DGM - BV ${barrageName || "-"}`}</th>
              <th className="border border-gray-300 px-2 py-2 text-center font-bold">{`Retenue du barrage ${barrageName || "-"} actuelle (Mm3) a 8h`}</th>
              <th className="border border-gray-300 px-2 py-2 text-center font-bold">Apports (Mm3)</th>
              <th className="border border-gray-300 px-2 py-2 text-center font-bold">Creux actuel (Mm3)</th>
              <th className="border border-gray-300 px-2 py-2 text-center font-bold">Restitutions - Lacher (0 m3/s) (Mm3)</th>
              <th className="border border-gray-300 px-2 py-2 text-center font-bold">Debit maximal m3/s</th>
              <th className="border border-gray-300 px-2 py-2 text-center font-bold">Debit moyen journalier m3/s</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, idx) => (
              <tr key={`recap-row-${idx}`} className={idx % 2 === 0 ? "bg-white" : "bg-[#F5F5F5]"}>
                <td className="border border-gray-300 px-2 py-1.5 text-left">{row.date || "-"}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{formatCellValue(row.pluieMm)}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{formatCellValue(row.retenueMm3)}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{formatCellValue(row.apportsMm3)}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{formatCellValue(row.creuxMm3)}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{formatCellValue(row.restitutionMm3)}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{formatCellValue(row.debitMaxM3s)}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{formatCellValue(row.debitMoyenJournalierM3s)}</td>
              </tr>
            ))}
            <tr className="bg-gray-300 font-bold">
              <td className="border border-gray-300 px-2 py-1.5 text-left">Total</td>
              <td className="border border-gray-300 px-2 py-1.5 text-right">{formatCellValue(totals.pluieMm)}</td>
              <td className="border border-gray-300 px-2 py-1.5 text-right" />
              <td className="border border-gray-300 px-2 py-1.5 text-right">{formatCellValue(totals.apportsMm3)}</td>
              <td className="border border-gray-300 px-2 py-1.5 text-right" />
              <td className="border border-gray-300 px-2 py-1.5 text-right">{formatCellValue(totals.restitutionMm3)}</td>
              <td className="border border-gray-300 px-2 py-1.5 text-right" />
              <td className="border border-gray-300 px-2 py-1.5 text-right" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
