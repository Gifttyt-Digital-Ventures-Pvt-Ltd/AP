export const DEFAULT_TDS_SECTIONS = [
  { id: "tds-194d-insurance-commission", section_code: "194D", rate_individual: 0.02 },
  { id: "tds-194h-commission-brokerage", section_code: "194H", rate_individual: 0.02 },
  { id: "tds-194i-rent-plant-machinery", section_code: "194I", rate_individual: 0.02 },
  { id: "tds-194i-rent-land-building", section_code: "194I", rate_individual: 0.1 },
  { id: "tds-194ia-property-purchase", section_code: "194IA", rate_individual: 0.01 },
  { id: "tds-194la-property-compensation", section_code: "194LA", rate_individual: 0.1 },
  { id: "tds-194k-capital-market-distributions", section_code: "194K", rate_individual: 0.1 },
  { id: "tds-193-interest-on-securities", section_code: "193", rate_individual: 0.1 },
  { id: "tds-194a-interest-others", section_code: "194A", rate_individual: 0.1 },
  { id: "tds-194c-contract-individual-huf", section_code: "194C", rate_individual: 0.01 },
  { id: "tds-194c-contract-others", section_code: "194C", rate_individual: 0.02 },
  { id: "tds-194j-professional-fees-technical", section_code: "194J", rate_individual: 0.02 },
  { id: "tds-194j-professional-fees-professional", section_code: "194J", rate_individual: 0.1 },
  { id: "tds-194m-high-value-payment", section_code: "194M", rate_individual: 0.02 },
  { id: "tds-194-dividend", section_code: "194", rate_individual: 0.1 },
  { id: "tds-194q-purchase-of-goods", section_code: "194Q", rate_individual: 0.001 },
  { id: "tds-194o-e-commerce", section_code: "194O", rate_individual: 0.001 },
  { id: "tds-194s-vda-crypto", section_code: "194S", rate_individual: 0.01 },
  { id: "tds-194r-business-benefit", section_code: "194R", rate_individual: 0.1 },
  { id: "tds-194da-life-insurance", section_code: "194DA", rate_individual: 0.02 },
  { id: "tds-194t-partner-payments", section_code: "194T", rate_individual: 0.1 },
];

export const NO_TDS_VALUE = "__NO_TDS__";

const normalizeSectionsResponse = (sections = []) => {
  if (Array.isArray(sections)) return sections;
  if (Array.isArray(sections?.data)) return sections.data;
  if (Array.isArray(sections?.items)) return sections.items;
  if (Array.isArray(sections?.content)) return sections.content;
  if (Array.isArray(sections?.sections)) return sections.sections;
  if (Array.isArray(sections?.tdsSections)) return sections.tdsSections;
  if (Array.isArray(sections?.tds_sections)) return sections.tds_sections;
  return [];
};

export const parseTdsRate = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === NO_TDS_VALUE
  ) {
    return 0;
  }
  const text = String(value).trim();
  if (!text) return 0;

  const percentMatches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];
  if (percentMatches.length > 0) {
    const numeric = Number(percentMatches[percentMatches.length - 1][1]);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  const numeric = Number.parseFloat(text);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const parseTdsSelection = (value) => {
  if (!value || value === NO_TDS_VALUE) {
    return {
      tdsSectionId: null,
      tdsSectionCode: null,
      tdsRate: null,
    };
  }

  const [rawId, rawLabel = rawId] = String(value).split("::");
  const label = rawLabel.trim();
  const match = label.match(/^(.+)-(\d+(?:\.\d+)?)%$/);

  return {
    tdsSectionId: rawId || null,
    tdsSectionCode: match?.[1] || null,
    tdsRate: match ? Number(match[2]) : null,
  };
};

const normalizeTdsRate = (rate) => {
  const numericRate = Number(rate);
  if (!Number.isFinite(numericRate)) return null;

  const percentageRate =
    numericRate > 0 && numericRate <= 1 ? numericRate * 100 : numericRate;

  return Number.isInteger(percentageRate)
    ? String(percentageRate)
    : percentageRate.toFixed(2).replace(/\.?0+$/, "");
};

export const formatTdsLabel = (sectionCode, rate) => {
  const code = String(sectionCode || "").trim().toUpperCase();
  const normalizedRate = normalizeTdsRate(rate);
  if (!code || !normalizedRate) return "";
  return `${code}-${normalizedRate}%`;
};

export const buildTdsValue = ({ tdsSectionId, tdsSectionCode, tdsRate } = {}) => {
  const label = formatTdsLabel(tdsSectionCode, tdsRate);
  if (!tdsSectionId || !label) return "";
  return `${tdsSectionId}::${label}`;
};

const extractTdsRates = (rate) => {
  if (rate === null || rate === undefined || rate === "") return [];

  if (Array.isArray(rate)) {
    return rate.map(normalizeTdsRate).filter(Boolean);
  }

  if (typeof rate === "string") {
    const percentMatches = [...rate.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];
    if (percentMatches.length > 0) {
      return percentMatches
        .map((match) => normalizeTdsRate(match[1]))
        .filter(Boolean);
    }

    return String(rate)
      .split(/[\/,|]/)
      .map((entry) => normalizeTdsRate(entry.trim()))
      .filter(Boolean);
  }

  const normalizedRate = normalizeTdsRate(rate);
  return normalizedRate ? [normalizedRate] : [];
};

export const buildTdsOptionsFromSection = (section = {}) => {
  const rowId = String(section?.id ?? section?.tds_id ?? section?.tdsId ?? "").trim();
  const sectionCode = String(
    section?.section_code ??
      section?.sectionCode ??
      section?.code ??
      section?.section ??
      "",
  )
    .trim()
    .toUpperCase();
  const rate =
    section?.rate_individual ??
    section?.rateIndividual ??
    section?.individualRate ??
      section?.tdsRate ??
      section?.tds_rate ??
      section?.rate ??
      "";
  const rates = extractTdsRates(rate);

  if (!sectionCode || rates.length === 0) return [];
  return rates.map((normalizedRate, index) => {
    const label = `${sectionCode}-${normalizedRate}%`;
    const valuePrefix = rowId || `tds-${sectionCode.toLowerCase()}-${index}`;
    return {
      value: `${valuePrefix}::${label}`,
      label,
    };
  });
};

export const buildTdsOptions = (sections = [], currentValue = "") => {
  const normalizedSections = normalizeSectionsResponse(sections);
  const sourceSections = [...normalizedSections, ...DEFAULT_TDS_SECTIONS];
  const sectionOptions = sourceSections.flatMap(buildTdsOptionsFromSection);

  const options = [
    { value: NO_TDS_VALUE, label: "No TDS" },
    ...sectionOptions,
  ];
  if (currentValue && currentValue !== NO_TDS_VALUE) {
    options.unshift({ value: String(currentValue), label: String(currentValue).split("::").pop() });
  }

  const seen = new Set();
  return options.filter((option) => {
    if (seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
};
