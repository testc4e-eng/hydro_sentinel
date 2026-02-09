import { CriticalityBadge } from "./CriticalityBadge";
import { getAlerts } from "@/data/mockData";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AlertsList() {
  const alerts = getAlerts();
  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <CriticalityBadge status={alert.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{alert.entity_name}</p>
              <p className="text-xs text-muted-foreground">{alert.message}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
