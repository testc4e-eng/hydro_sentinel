// Hydro Sentinel Main Application
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useAuthStore } from "./store/authStore";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const Precipitations = lazy(() => import("./pages/Precipitations"));
const Debits = lazy(() => import("./pages/Debits"));
const Apports = lazy(() => import("./pages/Apports"));
const Lachers = lazy(() => import("./pages/Lachers"));
const Stations = lazy(() => import("./pages/Stations"));
const Dams = lazy(() => import("./pages/Dams"));
const Import = lazy(() => import("./pages/Import"));
const DataScan = lazy(() => import("./pages/DataScan"));
const DataManagement = lazy(() => import("./pages/DataManagement"));
const Settings = lazy(() => import("./pages/Settings"));
const Alerts = lazy(() => import("./pages/Alerts"));
const RecapBarrage = lazy(() => import("./pages/RecapBarrage"));
const Volume = lazy(() => import("./pages/Volume"));
const Environment = lazy(() => import("./pages/Environment"));
const ThematicDashboard = lazy(() => import("./pages/ThematicDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Protected Route Wrapper
const ProtectedRoute = () => {
  const token = useAuthStore(state => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Layout />; // Layout contains Outlet
};

const RouteLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center bg-background text-sm text-muted-foreground">
    Chargement de la page...
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/precipitations" element={<Precipitations />} />
              <Route path="/precipitations/station" element={<Precipitations />} />
              <Route path="/precipitations/bassin" element={<Precipitations />} />
              <Route path="/debits" element={<Debits />} />
              <Route path="/debits/station" element={<Debits />} />
              <Route path="/apports" element={<Apports />} />
              <Route path="/apports/barrage" element={<Apports />} />
              <Route path="/volume" element={<Volume />} />
              <Route path="/volume/barrage" element={<Volume />} />
              <Route path="/recap-barrage" element={<RecapBarrage />} />
              <Route path="/alertes" element={<Alerts />} />
              <Route path="/carte-synthese" element={<ThematicDashboard />} />
              <Route path="/carte-inondation" element={<Navigate to="/carte-synthese?type=flood" replace />} />
              <Route path="/carte-couverture-neige" element={<Navigate to="/carte-synthese?type=snow" replace />} />
              <Route path="/stations" element={<Stations />} />
              <Route path="/barrages" element={<Dams />} />
              <Route path="/import" element={<Import />} />
              <Route path="/data-management" element={<DataManagement />} />
              <Route path="/data-scan" element={<DataScan />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/environment" element={<Environment />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
