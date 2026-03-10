import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ThematicMapCatalog, ThematicMapProduct, ThematicMapProductSummary, ThematicMapType } from "@/types/thematicMaps";
import { getFallbackCatalog, getFallbackHistory, getFallbackProduct } from "@/lib/thematicFallback";

const thematicDemoOnly = String(import.meta.env.VITE_THEMATIC_DEMO_ONLY ?? "false").toLowerCase() === "true";

export function useVariables() {
  return useQuery({ queryKey: ["variables"], queryFn: () => api.getVariables(), staleTime: 5 * 60_000 });
}

export function useSources() {
  return useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const raw = await api.getSources();

      // Normalize to the legacy shape expected by many UI components:
      // result.data.data -> Array<{ code, label, ... }>
      if (Array.isArray(raw)) {
        return { data: { data: raw } };
      }

      if (Array.isArray((raw as any)?.data?.data)) {
        return raw as any;
      }

      if (Array.isArray((raw as any)?.data)) {
        return { data: { data: (raw as any).data } };
      }

      return { data: { data: [] } };
    },
    staleTime: 5 * 60_000,
  });
}

export function useRuns(source_code?: string) {
  return useQuery({
    queryKey: ["runs", source_code],
    queryFn: () => api.getRuns({ source_code }),
    staleTime: 60_000,
  });
}

export function useStations(params?: { type?: string; basin_id?: string }) {
  return useQuery({
    queryKey: ["stations", params],
    queryFn: () => api.getStations(params),
    staleTime: 5 * 60_000,
  });
}

export function useBasins() {
  return useQuery({ queryKey: ["basins"], queryFn: () => api.getBasins(), staleTime: 5 * 60_000 });
}

export function useDams() {
  return useQuery({ queryKey: ["dams"], queryFn: () => api.getDams(), staleTime: 5 * 60_000 });
}

export function useAlerts(params?: { level?: string; active?: number }) {
  return useQuery({
    queryKey: ["alerts", params],
    queryFn: () => api.getAlerts(params),
    staleTime: 30_000,
  });
}

export function useCompare(params: { station_id: string; variable_code?: string; start?: string; end?: string; sources?: string }) {
  return useQuery({
    queryKey: ["compare", params],
    queryFn: () => api.getCompare(params),
    enabled: !!params.station_id,
    staleTime: 60_000,
  });
}

export function useKpis(params?: { basin_id?: string; window?: string }) {
  return useQuery({
    queryKey: ["kpis", params],
    queryFn: () => api.getKpis(params),
    staleTime: 30_000,
  });
}

export function useIngestions() {
  return useQuery({ queryKey: ["ingestions"], queryFn: () => api.getIngestions(), staleTime: 30_000 });
}

export function useThematicMapCatalog(
  mapType: ThematicMapType,
  params?: { event?: string; date_from?: string; date_to?: string },
) {
  return useQuery<ThematicMapCatalog>({
    queryKey: ["thematic-map-catalog", mapType, params],
    queryFn: async () => {
      if (thematicDemoOnly) {
        return getFallbackCatalog(mapType, params);
      }
      return await api.getThematicMapCatalog(mapType, params);
    },
    staleTime: 60_000,
  });
}

export function useThematicMapHistory(
  mapType: ThematicMapType,
  params?: { event?: string; date_from?: string; date_to?: string },
) {
  return useQuery<ThematicMapProductSummary[]>({
    queryKey: ["thematic-map-history", mapType, params],
    queryFn: async () => {
      if (thematicDemoOnly) {
        return getFallbackHistory(mapType, params);
      }
      return await api.getThematicMapHistory(mapType, params);
    },
    staleTime: 60_000,
  });
}

export function useThematicMapProduct(mapType: ThematicMapType, productId: string | null) {
  return useQuery<ThematicMapProduct>({
    queryKey: ["thematic-map-product", mapType, productId],
    queryFn: async () => {
      const targetId = productId as string;
      if (thematicDemoOnly) {
        return getFallbackProduct(mapType, targetId);
      }
      return await api.getThematicMapProduct(mapType, targetId);
    },
    enabled: !!productId,
    staleTime: 60_000,
  });
}

export function useHealth() {
  return useQuery({ queryKey: ["health"], queryFn: () => api.getHealth(), staleTime: 10_000 });
}
