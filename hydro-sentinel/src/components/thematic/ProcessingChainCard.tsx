import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProcessingStep } from "@/types/thematicMaps";

interface ProcessingChainCardProps {
  steps: ProcessingStep[];
}

export function ProcessingChainCard({ steps }: ProcessingChainCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Chaine de traitement satellitaire</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step, index) => (
          <div key={step.id} className="rounded-md border p-2">
            <div className="text-sm font-medium">
              {index + 1}. {step.label}
            </div>
            <div className="text-xs text-muted-foreground">{step.description}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
