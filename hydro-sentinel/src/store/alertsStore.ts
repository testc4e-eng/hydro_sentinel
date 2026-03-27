import { create } from "zustand";
import { DEFAULT_THRESHOLD_CONFIG, type ThresholdConfig } from "@/features/alerts/damAlerting";

interface AlertsState {
  thresholdConfig: ThresholdConfig;
  activeAlertsCount: number;
  setThresholdConfig: (patch: Partial<ThresholdConfig>) => void;
  setActiveAlertsCount: (count: number) => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  thresholdConfig: DEFAULT_THRESHOLD_CONFIG,
  activeAlertsCount: 0,
  setThresholdConfig: (patch) =>
    set((state) => ({
      thresholdConfig: {
        ...state.thresholdConfig,
        ...patch,
      },
    })),
  setActiveAlertsCount: (count) => set({ activeAlertsCount: Math.max(0, Math.floor(count || 0)) }),
}));
