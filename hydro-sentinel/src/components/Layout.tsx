import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { useAlertsStore } from "@/store/alertsStore";

export function Layout() {
  const navigate = useNavigate();
  const activeAlertsCount = useAlertsStore((state) => state.activeAlertsCount);

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
