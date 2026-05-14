export interface SourceAvailability {
  record_count: number;
  first_record: string | null;
  last_record: string | null;
}

export interface VariableAvailability {
  total_records?: number;
  sources: Record<string, SourceAvailability>;
}

export interface BasinEntityAvailability {
  basin_id: string;
  basin_code: string | null;
  basin_name: string;
  level: number | null;
  total_records: number;
  variable_count: number;
  source_count: number;
  first_record: string | null;
  last_record: string | null;
  variables: Record<string, VariableAvailability>;
}

export interface StationEntityAvailability {
  station_id: string;
  station_code: string | null;
  station_name: string;
  station_type: string;
  basin_id: string | null;
  basin_name: string | null;
}

export interface DgmAlignedBasin {
  option_id: string;
  basin_id: string;
  basin_name: string;
  basin_code: string | null;
  level: number | null;
  total_records: number;
  variable_count: number;
  source_count: number;
  first_record: string | null;
  last_record: string | null;
  variables: Record<string, VariableAvailability>;
}

const normalizeText = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

const normalizeLabel = (value: unknown): string =>
  normalizeText(value)
    .replace(/\b(bge|barrage|brg)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const codeVariants = (value: unknown): string[] => {
  const raw = normalizeText(value);
  if (!raw) return [];
  const variants = new Set<string>([raw]);
  const compact = raw.replace(/[\s_-]+/g, "");
  if (compact) variants.add(compact);
  const dgmNum = raw.match(/^dgm[\s_-]*0*([0-9]+)$/i);
  if (dgmNum) {
    variants.add(dgmNum[1]);
    variants.add(`dgm-${dgmNum[1]}`);
    variants.add(`dgm${dgmNum[1]}`);
  }
  const trailingNum = raw.match(/0*([0-9]+)$/);
  if (trailingNum) variants.add(trailingNum[1]);
  return Array.from(variants);
};

const earliestIso = (a: string | null, b: string | null): string | null => {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
};

const latestIso = (a: string | null, b: string | null): string | null => {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
};

const toDgmSafeEntity = (entity: BasinEntityAvailability | null): BasinEntityAvailability | null => {
  if (!entity) return null;
  const variables: Record<string, VariableAvailability> = {};
  let totalRecords = 0;
  let firstRecord: string | null = null;
  let lastRecord: string | null = null;
  let sourceCount = 0;
  let variableCount = 0;

  Object.entries(entity.variables || {}).forEach(([variableCode, variableData]) => {
    const filteredSources = Object.fromEntries(
      Object.entries(variableData.sources || {}).filter(([sourceCode]) => sourceCode.toUpperCase() !== "OBS"),
    );
    const filteredTotal = Object.values(filteredSources).reduce(
      (sum, s) => sum + (s?.record_count ?? 0),
      0,
    );

    if (filteredTotal <= 0) return;

    variables[variableCode] = {
      total_records: filteredTotal,
      sources: filteredSources,
    };

    variableCount += 1;
    sourceCount += Object.keys(filteredSources).length;
    totalRecords += filteredTotal;
    Object.values(filteredSources).forEach((s) => {
      firstRecord = earliestIso(firstRecord, s.first_record ?? null);
      lastRecord = latestIso(lastRecord, s.last_record ?? null);
    });
  });

  return {
    ...entity,
    total_records: totalRecords,
    variable_count: variableCount,
    source_count: sourceCount,
    first_record: firstRecord,
    last_record: lastRecord,
    variables,
  };
};

export function mapDgmBasinsFromScan(
  features: any[],
  basinEntities: BasinEntityAvailability[],
  stationEntities: StationEntityAvailability[],
): DgmAlignedBasin[] {
  const basinById = new Map(basinEntities.map((b) => [String(b.basin_id), b] as const));

  return features.map((feature: any, index: number) => {
    const props = feature?.properties ?? {};
    const rawName =
      props.name ??
      props.nom ??
      props.NOM ??
      props.Name ??
      props.Name1 ??
      props.BASSIN ??
      `Bassin DGM ${index + 1}`;
    const rawCode = props.code ?? props.CODE ?? props.Code ?? props.id ?? props.ID ?? null;
    const codeNorm = normalizeText(rawCode);
    const nameNorm = normalizeText(rawName);
    const nameLabelNorm = normalizeLabel(rawName);
    const codeNormVariants = codeVariants(rawCode);
    const fallbackDgmCode = `dgm-${index + 1}`;
    const fallbackDgmVariants = codeVariants(fallbackDgmCode);

    const matchedAbh = basinEntities.find((abh) => {
      const abhCode = normalizeText(abh.basin_code);
      const abhName = normalizeText(abh.basin_name);
      const abhLabel = normalizeLabel(abh.basin_name);
      const abhCodeVariants = codeVariants(abh.basin_code);
      const codeMatched =
        (codeNormVariants.length > 0 || fallbackDgmVariants.length > 0) &&
        abhCodeVariants.length > 0 &&
        [...codeNormVariants, ...fallbackDgmVariants].some((candidate) => abhCodeVariants.includes(candidate));
      const nameMatchedExact = (nameNorm && abhName && nameNorm === abhName) || (nameLabelNorm && abhLabel && nameLabelNorm === abhLabel);
      const nameMatchedLoose =
        !!nameLabelNorm &&
        !!abhLabel &&
        (nameLabelNorm.includes(abhLabel) || abhLabel.includes(nameLabelNorm));
      return codeMatched || nameMatchedExact || nameMatchedLoose;
    });

    const matchedStation = !matchedAbh
      ? stationEntities.find((station) => {
          const stationName = normalizeText(station.station_name);
          const stationLabel = normalizeLabel(station.station_name);
          const stationCode = normalizeText(station.station_code);
          const stationCodeVariants = codeVariants(station.station_code);
          const stationCodeMatch =
            (codeNormVariants.length > 0 || fallbackDgmVariants.length > 0) &&
            stationCodeVariants.length > 0 &&
            [...codeNormVariants, ...fallbackDgmVariants].some((candidate) => stationCodeVariants.includes(candidate));
          const stationNameExact =
            (nameNorm && stationName && nameNorm === stationName) ||
            (nameLabelNorm && stationLabel && nameLabelNorm === stationLabel);
          const stationNameLoose =
            !!nameLabelNorm &&
            !!stationLabel &&
            (nameLabelNorm.includes(stationLabel) || stationLabel.includes(nameLabelNorm));
          return stationCodeMatch || stationNameExact || stationNameLoose || (codeNorm && stationCode && codeNorm === stationCode);
        })
      : null;

    const matchedFromStation =
      matchedStation?.basin_id != null ? basinById.get(String(matchedStation.basin_id)) : null;
    const effectiveMatch = toDgmSafeEntity(matchedAbh ?? matchedFromStation ?? null);

    return {
      option_id: `dgm-${index + 1}`,
      basin_id: String(effectiveMatch?.basin_id || ""),
      basin_code: rawCode ? String(rawCode) : null,
      basin_name: String(rawName),
      level: effectiveMatch?.level ?? null,
      total_records: effectiveMatch?.total_records ?? 0,
      variable_count: effectiveMatch?.variable_count ?? 0,
      source_count: effectiveMatch?.source_count ?? 0,
      first_record: effectiveMatch?.first_record ?? null,
      last_record: effectiveMatch?.last_record ?? null,
      variables: effectiveMatch?.variables ?? {},
    } as DgmAlignedBasin;
  });
}
