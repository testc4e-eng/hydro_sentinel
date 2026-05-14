import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useThematicMapCatalog, useThematicMapProduct } from "@/hooks/useApi";
import { ProcessingChainCard } from "@/components/thematic/ProcessingChainCard";
import { ThematicHistoryPanel } from "@/components/thematic/ThematicHistoryPanel";
import { ThematicMapViewer } from "@/components/thematic/ThematicMapViewer";
import { ThematicStatsCards } from "@/components/thematic/ThematicStatsCards";
import type { ThematicMapType } from "@/types/thematicMaps";

interface ThematicMapModuleProps {
  mapType: ThematicMapType;
  pageTitle: string;
}

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

export default function ThematicMapModule({ mapType, pageTitle }: ThematicMapModuleProps) {
  const thematicDemoOnly = String(import.meta.env.VITE_THEMATIC_DEMO_ONLY ?? "false").toLowerCase() === "true";
  const [eventFilter, setEventFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      event: eventFilter.trim() || undefined,
      date_from: dateFrom ? `${dateFrom}T00:00:00Z` : undefined,
      date_to: dateTo ? `${dateTo}T23:59:59Z` : undefined,
    }),
    [dateFrom, dateTo, eventFilter],
  );

  const { data: catalog, isLoading: isCatalogLoading, error: catalogError } = useThematicMapCatalog(mapType, filters);
  const products = catalog?.products ?? [];

  useEffect(() => {
    if (products.length === 0) {
      setSelectedProductId(null);
      return;
    }
    if (!selectedProductId || !products.some((product) => product.id === selectedProductId)) {
      setSelectedProductId(catalog?.latest_product_id ?? products[0].id);
    }
  }, [catalog?.latest_product_id, products, selectedProductId]);

  const { data: selectedProduct, isLoading: isProductLoading } = useThematicMapProduct(mapType, selectedProductId);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3 overflow-hidden p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground">Carte interactive, historique temporel et statistiques automatiques de surface.</p>
        </div>
        {thematicDemoOnly && <Badge variant="secondary">Mode test (sans base de donnees)</Badge>}
      </div>

      <div className="grid flex-none grid-cols-1 gap-2 md:grid-cols-4">
        <Input
          placeholder="Filtrer par evenement"
          value={eventFilter}
          onChange={(event) => setEventFilter(event.target.value)}
        />
        <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEventFilter("");
            setDateFrom("");
            setDateTo("");
          }}
        >
          Reinitialiser filtres
        </Button>
      </div>

      {(isCatalogLoading || isProductLoading) && (
        <div className="flex-none rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">Chargement des cartes...</div>
      )}

      {catalogError && (
        <div className="flex-none rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          Impossible de charger le module cartographique.
        </div>
      )}

      {selectedProduct && (
        <div className="grid flex-none grid-cols-1 gap-3 md:grid-cols-4">
          <Card className="border-indigo-200/80 bg-indigo-50/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-indigo-700">Couverture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-900">{selectedProduct.statistics.positive_class.percentage.toFixed(1)}%</div>
              <div className="text-xs text-indigo-700/90">{selectedProduct.statistics.positive_class_label}</div>
            </CardContent>
          </Card>
          <Card className="border-cyan-200/80 bg-cyan-50/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-cyan-700">
                {selectedProduct.statistics.positive_class_label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-cyan-900">{formatArea(selectedProduct.statistics.positive_class.km2, "km2")}</div>
              <div className="text-xs text-cyan-700/90">{formatArea(selectedProduct.statistics.positive_class.hectares, "ha")}</div>
            </CardContent>
          </Card>
          <Card className="border-amber-200/80 bg-amber-50/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-amber-700">
                {selectedProduct.statistics.negative_class_label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-amber-900">{formatArea(selectedProduct.statistics.negative_class.km2, "km2")}</div>
              <div className="text-xs text-amber-700/90">{formatArea(selectedProduct.statistics.negative_class.hectares, "ha")}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 bg-slate-50/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-slate-700">Acquisition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold text-slate-900">{formatDate(selectedProduct.acquisition_end)}</div>
              <div className="text-xs text-slate-600">{selectedProduct.satellite}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid flex-1 min-h-0 grid-cols-12 gap-3">
        <div className="col-span-12 flex min-h-0 flex-col gap-3 xl:col-span-8">
          <Card className="flex-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Metadonnees d'acquisition</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
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
                <div>{selectedProduct?.event_name ?? "--"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Satellite / Statut</div>
                <div>{selectedProduct ? `${selectedProduct.satellite} / ${selectedProduct.status}` : "--"}</div>
              </div>
            </CardContent>
          </Card>

          <ThematicMapViewer mapType={mapType} product={selectedProduct ?? null} className="flex-1" />
        </div>

        <div className="col-span-12 flex min-h-0 flex-col gap-3 overflow-auto xl:col-span-4">
          <ThematicHistoryPanel
            products={products}
            selectedProductId={selectedProductId}
            onSelect={(productId) => setSelectedProductId(productId)}
          />
          {selectedProduct && <ThematicStatsCards statistics={selectedProduct.statistics} />}
          <ProcessingChainCard steps={catalog?.processing_chain ?? []} />
        </div>
      </div>
    </div>
  );
}
