import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAlertsStore } from "@/store/alertsStore";
import { api } from "@/lib/api";
import { DAMS_UNDER_SURVEILLANCE, computeStatus } from "@/features/alerts/damAlerting";

const ALERT_THRESHOLD_PCT = 20;
const ALERT_HORIZON_DAYS = 14;
const ALERT_REFRESH_MS = 5 * 60_000;

function computeAlertsFromForecast(payload: any, capacity: number): boolean {
  const previsions = Array.isArray(payload?.previsions) ? payload.previsions : [];
  if (!previsions.length) return false;

  const minCreux = previsions.reduce((min: number, p: any) => {
    const creux = Number(p?.creux_prevu_mm3);
    const fallback = capacity - Number(p?.volume_prevu_mm3 || 0);
    const value = Number.isFinite(creux) ? creux : Number.isFinite(fallback) ? fallback : min;
    return value < min ? value : min;
  }, Number.POSITIVE_INFINITY);

  if (!Number.isFinite(minCreux)) return false;
  const seuil = (ALERT_THRESHOLD_PCT / 100) * capacity;
  return computeStatus(minCreux, seuil) === "ALERTE";
}

export function Layout() {
  const navigate = useNavigate();
  const activeAlertsCount = useAlertsStore((state) => state.activeAlertsCount);
  const setActiveAlertsCount = useAlertsStore((state) => state.setActiveAlertsCount);

  useEffect(() => {
    let intervalId: number | null = null;
    let cancelled = false;
    let inFlight = false;

    const refreshAlerts = async () => {
      if (document.visibilityState === "hidden") return;
      if (inFlight) return;
      inFlight = true;
      try {
        const results = await Promise.all(
          DAMS_UNDER_SURVEILLANCE.map(async (dam) => {
            const res = await api.get("/alertes/prevision", { params: { barrage: dam.nom, nbJours: ALERT_HORIZON_DAYS } });
            return computeAlertsFromForecast(res?.data, dam.capacite);
          }),
        );
        const alerts = results.filter(Boolean).length;
        if (!cancelled) setActiveAlertsCount(alerts);
      } catch (err) {
        console.error("Failed to refresh alerts:", err);
      } finally {
        inFlight = false;
      }
    };

    const timeoutId = window.setTimeout(() => {
      refreshAlerts();
      intervalId = window.setInterval(refreshAlerts, ALERT_REFRESH_MS);
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [setActiveAlertsCount]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-12 flex items-center border-b px-4 bg-card shrink-0">
            <SidebarTrigger />
            <span className="ml-3 text-sm font-medium text-foreground">Hydro-Meteo Sebou</span>
            <span className="ml-2 text-xs text-muted-foreground">Connecte a l'API</span>
            <button
              type="button"
              onClick={() => navigate("/alertes")}
              className={`ml-auto ${activeAlertsCount > 0 ? "badge-alerte-active" : "badge-alerte-inactive"}`}
              title="Afficher les alertes barrages"
            >
              {`ALERTES : ${activeAlertsCount}`}
            </button>
          </header>
          <div className="flex-1 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
