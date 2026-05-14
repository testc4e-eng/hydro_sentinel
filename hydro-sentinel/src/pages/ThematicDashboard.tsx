import { useEffect, useMemo, useState } from "react";
import { CloudRain, CloudSnow, ChevronLeft, ChevronRight, Waves } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useThematicMapCatalog, useThematicMapProduct } from "@/hooks/useApi";
import { ThematicHistoryPanel } from "@/components/thematic/ThematicHistoryPanel";
import { ThematicMapViewer } from "@/components/thematic/ThematicMapViewer";
import { ThematicStatsCards } from "@/components/thematic/ThematicStatsCards";
import type { ThematicMapType } from "@/types/thematicMaps";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatArea(value: number, unit: "m2" | "km2" | "ha"): string {
  if (unit === "m2") return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} m2`;
  if (unit === "km2") return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} km2`;
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ha`;
}

function getInitialMapType(searchParams: URLSearchParams): ThematicMapType {
  const type = searchParams.get("type");
  if (type === "snow") return "snow";
  if (type === "precip") return "precip";
  return "flood";
}

export default function ThematicDashboard() {
  const thematicDemoOnly = String(import.meta.env.VITE_THEMATIC_DEMO_ONLY ?? "false").toLowerCase() === "true";
  const [searchParams] = useSearchParams();
  const [mapType, setMapType] = useState<ThematicMapType>(() => getInitialMapType(searchParams));

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const { data: catalog, isLoading: isCatalogLoading, error: catalogError } = useThematicMapCatalog(mapType);
  const products = catalog?.products ?? [];

  const timelineProducts = useMemo(() => {
    return [...products].sort(
      (a, b) => new Date(a.acquisition_end).getTime() - new Date(b.acquisition_end).getTime(),
    );
  }, [products]);

  useEffect(() => {
    if (timelineProducts.length === 0) {
      setSelectedProductId(null);
      return;
    }
    if (selectedProductId && timelineProducts.some((product) => product.id === selectedProductId)) {
      return;
    }

    const latestCandidate = catalog?.latest_product_id;
    if (latestCandidate && timelineProducts.some((product) => product.id === latestCandidate)) {
      setSelectedProductId(latestCandidate);
      return;
    }

    setSelectedProductId(timelineProducts[timelineProducts.length - 1].id);
  }, [catalog?.latest_product_id, selectedProductId, timelineProducts]);

  const { data: selectedProduct, isLoading: isProductLoading } = useThematicMapProduct(mapType, selectedProductId);

  const selectedTimelineIndex = useMemo(() => {
    const idx = timelineProducts.findIndex((product) => product.id === selectedProductId);
    return idx >= 0 ? idx : 0;
  }, [selectedProductId, timelineProducts]);

  const hasTimeline = timelineProducts.length > 1;
  const timelineMaxIndex = Math.max(timelineProducts.length - 1, 0);
  const canGoPrev = selectedTimelineIndex > 0;
  const canGoNext = selectedTimelineIndex < timelineProducts.length - 1;

  const selectTimelineIndex = (rawIndex: number) => {
    const nextIndex = Math.max(0, Math.min(Math.round(rawIndex), timelineMaxIndex));
    const nextProduct = timelineProducts[nextIndex];
    if (nextProduct) setSelectedProductId(nextProduct.id);
  };

  const moveTimeline = (direction: -1 | 1) => {
    const nextIndex = Math.min(Math.max(selectedTimelineIndex + direction, 0), timelineProducts.length - 1);
    selectTimelineIndex(nextIndex);
  };

  const pageTitle =
    mapType === "flood" ? "Carte inondation" : mapType === "snow" ? "Carte couverture de neige" : "Carte Precipitation";
  const mapSubtitle =
    mapType === "flood"
      ? "Suivi des zones inondees avec historique temporel glissant."
      : mapType === "snow"
        ? "Suivi de la couverture neigeuse avec historique temporel glissant."
        : "Suivi des precipitations avec historique temporel glissant";

  return (
    <div className="min-h-[calc(100vh-4rem)] space-y-3 overflow-y-auto p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{pageTitle}</h1>
          <p className="text-xs text-muted-foreground">{mapSubtitle}</p>
        </div>
        {thematicDemoOnly && <Badge variant="secondary">Mode test (sans base de donnees)</Badge>}
      </div>

      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Choix du module cartographique</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-4 pb-4 pt-0 md:grid-cols-3">
          <Button
            type="button"
            variant="outline"
            className={`h-11 justify-center text-sm font-semibold md:h-12 ${
              mapType === "precip"
                ? "border-[#0052CC] bg-[#0052CC] text-white hover:bg-[#003f9f] hover:text-white"
                : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            onClick={() => setMapType("precip")}
          >
            <CloudRain className="mr-2 h-4 w-4" />
            Carte precipitation
          </Button>
          <Button
            type="button"
            variant="outline"
            className={`h-11 justify-center text-sm font-semibold md:h-12 ${
              mapType === "flood"
                ? "border-[#0052CC] bg-[#0052CC] text-white hover:bg-[#003f9f] hover:text-white"
                : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            onClick={() => setMapType("flood")}
          >
            <Waves className="mr-2 h-4 w-4" />
            Carte inondation
          </Button>
          <Button
            type="button"
            variant="outline"
            className={`h-11 justify-center text-sm font-semibold md:h-12 ${
              mapType === "snow"
                ? "border-[#0052CC] bg-[#0052CC] text-white hover:bg-[#003f9f] hover:text-white"
                : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            onClick={() => setMapType("snow")}
          >
            <CloudSnow className="mr-2 h-4 w-4" />
            Carte couverture de neige
          </Button>
        </CardContent>
      </Card>

      {(isCatalogLoading || isProductLoading) && (
        <div className="flex-none rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">Chargement des cartes...</div>
      )}

      {catalogError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          Impossible de charger le module cartographique.
        </div>
      )}

      {selectedProduct && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {mapType === "precip" ? (
            <Card className="border-indigo-200/80 bg-indigo-50/60">
              <CardHeader className="px-4 pb-1 pt-3">
                <CardTitle className="text-xs uppercase tracking-wide text-indigo-700">Precipitation cumulee</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <div className="text-xl font-bold text-indigo-900">
                  {(selectedProduct.meta?.precip_cum_mm ?? selectedProduct.meta?.precip_mean_mm ?? 0).toFixed(1)} mm
                </div>
                <div className="text-xs text-indigo-700/90">Source {selectedProduct.meta?.source ?? selectedProduct.satellite}</div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-indigo-200/80 bg-indigo-50/60">
              <CardHeader className="px-4 pb-1 pt-3">
                <CardTitle className="text-xs uppercase tracking-wide text-indigo-700">Couverture</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <div className="text-xl font-bold text-indigo-900">{selectedProduct.statistics.positive_class.percentage.toFixed(1)}%</div>
                <div className="text-xs text-indigo-700/90">{selectedProduct.statistics.positive_class_label}</div>
              </CardContent>
            </Card>
          )}
          <Card className="border-cyan-200/80 bg-cyan-50/60">
            <CardHeader className="px-4 pb-1 pt-3">
              <CardTitle className="text-xs uppercase tracking-wide text-cyan-700">
                {mapType === "precip" ? "Zone concernee" : selectedProduct.statistics.positive_class_label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="text-base font-semibold text-cyan-900">{formatArea(selectedProduct.statistics.positive_class.km2, "km2")}</div>
              <div className="text-xs text-cyan-700/90">{formatArea(selectedProduct.statistics.positive_class.hectares, "ha")}</div>
            </CardContent>
          </Card>
          <Card className="border-amber-200/80 bg-amber-50/60">
            <CardHeader className="px-4 pb-1 pt-3">
              <CardTitle className="text-xs uppercase tracking-wide text-amber-700">
                {mapType === "precip" ? "Intensite dominante" : selectedProduct.statistics.negative_class_label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              {mapType === "precip" ? (
                <>
                  <div
                    className="h-3 w-full rounded"
                    style={{ background: "linear-gradient(90deg, #16a34a 0%, #84cc16 18%, #facc15 40%, #f97316 58%, #ef4444 78%, #7e22ce 100%)" }}
                  />
                  <div className="text-xs text-amber-700/90">{selectedProduct.meta?.dominant_level ?? "Pluie moderee"}</div>
                </>
              ) : (
                <>
                  <div className="text-base font-semibold text-amber-900">{formatArea(selectedProduct.statistics.negative_class.km2, "km2")}</div>
                  <div className="text-xs text-amber-700/90">{formatArea(selectedProduct.statistics.negative_class.hectares, "ha")}</div>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 bg-slate-50/80">
            <CardHeader className="px-4 pb-1 pt-3">
              <CardTitle className="text-xs uppercase tracking-wide text-slate-700">Acquisition</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="text-sm font-semibold text-slate-900">{formatDate(selectedProduct.acquisition_end)}</div>
              <div className="text-xs text-slate-600">{selectedProduct.satellite}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          <Card className="xl:col-span-6">
            <CardHeader className="px-4 pb-1 pt-3">
              <CardTitle className="text-sm">Metadonnees d'acquisition</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 px-4 pb-3 pt-0 text-sm md:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground">Periode</div>
                <div>
                  {selectedProduct
                    ? `${formatDate(selectedProduct.acquisition_start)} -> ${formatDate(selectedProduct.acquisition_end)}`
                    : "--"}
                </div>
              </div>
                <div>
                  <div className="text-xs text-muted-foreground">Evenement</div>
                  <div>{selectedProduct ? selectedProduct.event_name : "--"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Satellite / Statut</div>
                  <div>{selectedProduct ? `${selectedProduct.meta?.source ?? selectedProduct.satellite} / ${selectedProduct.status}` : "--"}</div>
                </div>
              </CardContent>

            <div className="mx-4 border-t border-border/70" />

            <CardHeader className="px-4 pb-1 pt-3">
              <CardTitle className="text-sm">Filtre temporel glissant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-3 pt-0">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{timelineProducts[0] ? formatDate(timelineProducts[0].acquisition_end) : "--"}</span>
                <span>
                  {timelineProducts[selectedTimelineIndex]
                    ? formatDate(timelineProducts[selectedTimelineIndex].acquisition_end)
                    : "--"}
                </span>
                <span>
                  {timelineProducts[timelineProducts.length - 1]
                    ? formatDate(timelineProducts[timelineProducts.length - 1].acquisition_end)
                    : "--"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveTimeline(-1)}
                  disabled={!canGoPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <input
                  type="range"
                  min={0}
                  max={timelineMaxIndex}
                  step={1}
                  value={selectedTimelineIndex}
                  disabled={!hasTimeline}
                  onChange={(event) => selectTimelineIndex(Number(event.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary disabled:cursor-not-allowed"
                  style={{ touchAction: "pan-y" }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveTimeline(1)}
                  disabled={!canGoNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                {timelineProducts[selectedTimelineIndex]
                  ? `Selection: ${timelineProducts[selectedTimelineIndex].event_name}`
                  : "Aucun produit disponible sur la periode choisie."}
              </div>
            </CardContent>
          </Card>

          <div className="xl:col-span-3">
            <ThematicHistoryPanel
              products={products}
              selectedProductId={selectedProductId}
              onSelect={(productId) => setSelectedProductId(productId)}
              maxHeightClass="max-h-[250px]"
            />
          </div>

          <div className="xl:col-span-3">
            {selectedProduct && <ThematicStatsCards statistics={selectedProduct.statistics} compact />}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          <div className="xl:col-span-12">
            <ThematicMapViewer mapType={mapType} product={selectedProduct ?? null} className="h-[620px] min-h-[520px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
