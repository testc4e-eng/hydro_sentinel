import { useEffect, useMemo, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface VariableSourceSelection {
  variableCode: string;
  variableLabel: string;
  unit: string;
  sources: string[];
}

interface Props {
  onSelectionChange: (selection: VariableSourceSelection) => void;
  availableVariables: Array<{ code: string; label: string; unit: string }>;
  availableSources: Array<{ code: string; label: string }>;
  defaultVariable?: string;
  period?: string;
  onPeriodChange?: (period: string) => void;
}

const periodOptions = [
  { value: "24h", label: "24h" },
  { value: "72h", label: "72h" },
  { value: "7d", label: "7 jours" },
  { value: "14d", label: "14 jours" },
  { value: "30d", label: "30 jours" },
  { value: "custom", label: "Manuelle" },
];

export function SingleVariableSelector({
  onSelectionChange,
  availableVariables,
  availableSources,
  defaultVariable,
  period,
  onPeriodChange,
}: Props) {
  const lastEmittedKeyRef = useRef<string>("");

  const defaultSources = useMemo(() => {
    if (!availableSources || availableSources.length === 0) return [];
    const codes = availableSources.map((s) => s.code);
    if (codes.includes("OBS")) return ["OBS"];
    return [codes[0]];
  }, [availableSources]);

  const [selectedVariable, setSelectedVariable] = useState<string>(
    defaultVariable || availableVariables[0]?.code || "",
  );
  const [selectedSources, setSelectedSources] = useState<string[]>(defaultSources);

  useEffect(() => {
    if (selectedSources.length === 0 && defaultSources.length > 0) {
      setSelectedSources(defaultSources);
    }
  }, [defaultSources, selectedSources.length]);

  useEffect(() => {
    const variable = availableVariables.find((v) => v.code === selectedVariable);
    if (!variable || selectedSources.length === 0) return;

    const normalizedSources = [...selectedSources].sort();
    const nextKey = `${variable.code}|${normalizedSources.join(",")}`;
    if (lastEmittedKeyRef.current === nextKey) return;
    lastEmittedKeyRef.current = nextKey;

    onSelectionChange({
      variableCode: variable.code,
      variableLabel: variable.label,
      unit: variable.unit,
      sources: normalizedSources,
    });
  }, [selectedVariable, selectedSources, availableVariables, onSelectionChange]);

  const handleVariableChange = (variableCode: string) => {
    setSelectedVariable(variableCode);
  };

  const toggleSource = (sourceCode: string) => {
    const newSources = selectedSources.includes(sourceCode)
      ? selectedSources.filter((s) => s !== sourceCode)
      : [...selectedSources, sourceCode];

    if (newSources.length === 0) return;
    setSelectedSources(newSources);
  };

  const currentVariable = availableVariables.find((v) => v.code === selectedVariable);

  return (
    <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Variable :</span>
        <Select value={selectedVariable} onValueChange={handleVariableChange}>
          <SelectTrigger className="h-8 text-xs w-[180px]">
            <SelectValue placeholder="Choisir une variable..." />
          </SelectTrigger>
          <SelectContent>
            {availableVariables.map((v) => (
              <SelectItem key={v.code} value={v.code}>
                {v.label} ({v.unit})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-[1px] h-5 bg-border" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Sources :</span>
        <div className="flex items-center gap-2">
          {availableSources.map((source) => (
            <Label
              key={source.code}
              className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded text-xs"
            >
              <Checkbox
                checked={selectedSources.includes(source.code)}
                onCheckedChange={() => toggleSource(source.code)}
              />
              <span>{source.label}</span>
            </Label>
          ))}
        </div>
      </div>

      {period && onPeriodChange && (
        <>
          <div className="w-[1px] h-5 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Periode :</span>
            <Select value={period} onValueChange={onPeriodChange}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Periode" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {currentVariable && (
        <div className="ml-auto text-xs text-muted-foreground">
          {selectedSources.length} source{selectedSources.length > 1 ? "s" : ""} selectionnee
          {selectedSources.length > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
