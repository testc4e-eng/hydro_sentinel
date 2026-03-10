import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ThematicMapProductSummary } from "@/types/thematicMaps";

interface ThematicHistoryPanelProps {
  products: ThematicMapProductSummary[];
  selectedProductId: string | null;
  onSelect: (productId: string) => void;
  maxHeightClass?: string;
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

export function ThematicHistoryPanel({
  products,
  selectedProductId,
  onSelect,
  maxHeightClass = "max-h-[360px]",
}: ThematicHistoryPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Historique par date / evenement</CardTitle>
      </CardHeader>
      <CardContent className={`${maxHeightClass} space-y-2 overflow-auto`}>
        {products.length === 0 && <div className="text-sm text-muted-foreground">Aucun resultat sur cette periode.</div>}
        {products.map((product) => {
          const isActive = selectedProductId === product.id;
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelect(product.id)}
              className={`w-full rounded-md border p-2 text-left text-sm transition-colors ${
                isActive ? "border-primary bg-primary/5" : "hover:bg-muted/40"
              }`}
            >
              <div className="font-medium">{product.event_name}</div>
              <div className="text-xs text-muted-foreground">{formatDate(product.acquisition_end)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {product.statistics.positive_class_label}: {product.statistics.positive_class.percentage.toFixed(1)}%
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
