import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Precipitations from "./pages/Precipitations";
import Debits from "./pages/Debits";
import Apports from "./pages/Apports";
import Lachers from "./pages/Lachers";
import Stations from "./pages/Stations";
import Dams from "./pages/Dams";
import Import from "./pages/Import";
import Settings from "./pages/Settings";
import Environment from "./pages/Environment";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/precipitations" element={<Precipitations />} />
            <Route path="/precipitations/station" element={<Precipitations />} />
            <Route path="/precipitations/bassin" element={<Precipitations />} />
            <Route path="/debits" element={<Debits />} />
            <Route path="/debits/station" element={<Debits />} />
            <Route path="/apports" element={<Apports />} />
            <Route path="/apports/barrage" element={<Apports />} />
            <Route path="/lachers" element={<Lachers />} />
            <Route path="/lachers/barrage" element={<Lachers />} />
            <Route path="/stations" element={<Stations />} />
            <Route path="/barrages" element={<Dams />} />
            <Route path="/import" element={<Import />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/environment" element={<Environment />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
