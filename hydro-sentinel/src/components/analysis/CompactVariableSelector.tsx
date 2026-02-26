import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export interface CompactVariableSelection {
  variableCode: string;
  sourceCode: string;
  label: string;
  color: string;
}

export interface CompactVariableSelectorProps {
  selections?: CompactVariableSelection[];
  onSelectionChange: (selections: CompactVariableSelection[]) => void;
  maxSelections?: number;
}

const VARIABLE_OPTIONS = [
  { code: 'precip_mm', label: 'Précipitations', unit: 'mm' },
  { code: 'flow_m3s', label: 'Débit', unit: 'm3/s' },
  { code: 'volume_hm3', label: 'Volume', unit: 'hm3' },
  { code: 'inflow_m3s', label: 'Apports', unit: 'm3/s' },
];

const SOURCE_OPTIONS: Record<string, Array<{ code: string; label: string; color: string }>> = {
  precip_mm: [
    { code: 'OBS', label: 'Observées', color: '#3b82f6' },
    { code: 'AROME', label: 'AROME', color: '#8b5cf6' },
    { code: 'ECMWF', label: 'ECMWF', color: '#ec4899' },
  ],
  flow_m3s: [
    { code: 'OBS', label: 'Observé', color: '#10b981' },
    { code: 'SIMULE', label: 'Simulé', color: '#f59e0b' },
  ],
  volume_hm3: [
    { code: 'OBS', label: 'Observé', color: '#f97316' },
    { code: 'SIM', label: 'Simulé', color: '#fbbf24' },
  ],
  inflow_m3s: [
    { code: 'OBS', label: 'Observés', color: '#84cc16' },
    { code: 'SIM', label: 'Simulés', color: '#a3e635' },
  ],
};

export function CompactVariableSelector({
  selections,
  onSelectionChange,
  maxSelections = 3,
}: CompactVariableSelectorProps) {
  const [internalSelections, setInternalSelections] = useState<CompactVariableSelection[]>(selections ?? []);

  useEffect(() => {
    if (selections) {
      setInternalSelections(selections);
    }
  }, [selections]);

  const currentSelections = selections ?? internalSelections;

  const updateSelections = (next: CompactVariableSelection[]) => {
    if (!selections) {
      setInternalSelections(next);
    }
    onSelectionChange(next);
  };

  const addSelection = (variableCode: string, sourceCode: string) => {
    const variable = VARIABLE_OPTIONS.find((v) => v.code === variableCode);
    const source = SOURCE_OPTIONS[variableCode]?.find((s) => s.code === sourceCode);

    if (!variable || !source) return;

    const newSelection: CompactVariableSelection = {
      variableCode,
      sourceCode,
      label: `${variable.label} (${source.label})`,
      color: source.color,
    };

    const deduped = currentSelections.filter(
      (s) => !(s.variableCode === newSelection.variableCode && s.sourceCode === newSelection.sourceCode),
    );

    const newSelections = [...deduped, newSelection].slice(-maxSelections);
    updateSelections(newSelections);
  };

  const removeSelection = (index: number) => {
    const newSelections = currentSelections.filter((_, i) => i !== index);
    updateSelections(newSelections);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Variables :</span>

        <Select
          onValueChange={(value) => {
            const [varCode, srcCode] = value.split('|');
            addSelection(varCode, srcCode);
          }}
        >
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Ajouter une variable..." />
          </SelectTrigger>
          <SelectContent>
            {VARIABLE_OPTIONS.map((variable) => (
              <div key={variable.code}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{variable.label}</div>
                {SOURCE_OPTIONS[variable.code]?.map((source) => (
                  <SelectItem
                    key={`${variable.code}|${source.code}`}
                    value={`${variable.code}|${source.code}`}
                    className="text-xs pl-6"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: source.color }} />
                      {source.label}
                    </div>
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5 flex-wrap">
          {currentSelections.map((selection, index) => (
            <Badge
              key={`${selection.variableCode}-${selection.sourceCode}`}
              variant="secondary"
              className="text-xs px-2 py-0.5 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => removeSelection(index)}
              style={{ borderLeft: `3px solid ${selection.color}` }}
            >
              {selection.label} ×
            </Badge>
          ))}
        </div>
      </div>

      {currentSelections.length > 0 && (
        <div className="text-[10px] text-muted-foreground">
          {currentSelections.length}/{maxSelections}
        </div>
      )}
    </div>
  );
}
