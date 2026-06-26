import { uiMonthToApiMonth, normalizeFinancialYear, uiReturnTypeToApi, uiReturnsFyToApi } from './gstPeriod';

/** Human-readable labels for GST API enums (display only — compare using raw API values). */
const GST_ENUM_LABELS = {
  MATCHED: 'Matched',
  MISMATCHED: 'Amount Mismatch',
  AMOUNT_MISMATCH: 'Amount Mismatch',
  MISSING_IN_GSTR2A: 'Missing in GST',
  MISSING_IN_OPTIFII: 'Missing in AP',
  PARTIAL_MATCH: 'Partial',
  ELIGIBLE: 'Eligible',
  INELIGIBLE: 'Ineligible',
  PARTIALLY_ELIGIBLE: 'Partially Eligible',
  UNKNOWN: 'Unknown',
  BLOCKED: 'Blocked',
  YES: 'Amended',
  NO: 'No Amendment',
  ORIGINAL: 'Original',
};

export function humanizeGstEnum(value) {
  if (value == null || value === '') return '—';
  const normalized = String(value).toUpperCase().replace(/[\s-]+/g, '_');
  return GST_ENUM_LABELS[normalized] ?? String(value);
}

export function isGstMatchStatus(invoice, status) {
  return String(invoice?.matchStatus ?? '').toUpperCase() === String(status).toUpperCase();
}

export function isAmendedGstInvoice(invoice) {
  const status = String(invoice?.amendmentStatus ?? '').toUpperCase();
  return status === 'YES' || status === 'AMENDED' || status.includes('MULTIPLE');
}

const extractPanFromGstin = (gstin = '') => {
  const normalized = String(gstin || '').trim().toUpperCase();
  if (normalized.length !== 15) return '';
  return normalized.slice(2, 12);
};

const formatGstPortalBusinessNature = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean).join(', ');
  }
  return String(value || '').trim();
};

const getGstPortalAddressNode = (source = {}) => {
  const principal = source.pradr ?? source.principalAddress ?? source.principal_address;
  if (!principal) return null;
  if (principal.addr && typeof principal.addr === 'object') return principal.addr;
  if (typeof principal === 'object') return principal;
  return null;
};

export const formatGstPortalAddress = (addr = {}) => {
  if (!addr || typeof addr !== 'object') return '';

  const streetLine = [addr.bno, addr.flno, addr.bnm].filter(Boolean).join(', ');
  const localityLine = [addr.st, addr.locality, addr.landMark ?? addr.landmark].filter(Boolean).join(', ');

  return [
    streetLine,
    localityLine,
    addr.loc,
    addr.dst,
    addr.stcd,
    addr.pncd,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
};

export const gstPortalAddrToLocation = (addr = {}) => {
  if (!addr || typeof addr !== 'object') return null;

  const addressLine1 = [addr.bno, addr.flno, addr.bnm].filter(Boolean).join(', ');
  const addressLine2 = [addr.st, addr.locality].filter(Boolean).join(', ');

  return {
    addressLine1: addressLine1 || undefined,
    addressLine2: addressLine2 || undefined,
    city: addr.loc || addr.dst || '',
    district: addr.dst || '',
    state: addr.stcd || '',
    pincode: addr.pncd || '',
    country: 'India',
    landmark: addr.landMark ?? addr.landmark ?? '',
  };
};

/** Normalize raw GST portal taxpayer payload (lgnm, tradeNam, pradr, …) to app field names. */
export function normalizeGstPortalVendorDetails(raw = {}) {
  if (!raw || typeof raw !== 'object') return {};

  const hasPortalShape =
    raw.lgnm ||
    raw.tradeNam ||
    raw.pradr ||
    raw.rgdt ||
    raw.sts ||
    raw.dty ||
    raw.nba;

  if (!hasPortalShape) return raw;

  const gstin = String(raw.gstin ?? raw.gstIn ?? raw.gst ?? '').trim().toUpperCase();
  const principalAddr = getGstPortalAddressNode(raw) ?? {};
  const location = gstPortalAddrToLocation(principalAddr);

  return {
    ...raw,
    gstin,
    legalName: raw.lgnm ?? raw.legalName ?? raw.legal_name ?? '',
    tradeName: raw.tradeNam ?? raw.tradeName ?? raw.trade_name ?? '',
    pan: String(raw.pan ?? extractPanFromGstin(gstin) ?? '').trim().toUpperCase(),
    state: raw.stateName ?? raw.state_name ?? raw.state ?? principalAddr.stcd ?? '',
    stateCode: raw.stateCode ?? raw.state_code ?? (gstin ? gstin.slice(0, 2) : ''),
    businessNature:
      formatGstPortalBusinessNature(raw.nba ?? raw.bussNature ?? raw.businessNature ?? raw.business_nature) ||
      formatGstPortalBusinessNature(raw.pradr?.ntr),
    registrationDate: raw.rgdt ?? raw.regStartDate ?? raw.registrationDate ?? raw.registration_date ?? '',
    registrationType: raw.dty ?? raw.registrationType ?? raw.registration_type ?? '',
    gstStatus: raw.sts ?? raw.status ?? raw.gstStatus ?? raw.gst_status ?? '',
    constitution: raw.ctb ?? raw.constitution ?? '',
    einvoiceStatus: raw.einvoiceStatus ?? raw.einvoice_status ?? '',
    address: formatGstPortalAddress(principalAddr) || raw.address || '',
    location: location ?? raw.location ?? null,
  };
}

export function mapVendorGstDetailsToForm(currentData = {}) {
  const data = normalizeGstPortalVendorDetails(currentData);
  const validGstin =
    data.validGstin ??
    data.valid_gstin ??
    data.isValid ??
    data.is_valid;

  return {
    gstin: (data.gstin ?? data.gstIn ?? data.gst ?? '').toUpperCase(),
    legalName: data.legalName ?? data.legal_name ?? data.tradeName ?? data.trade_name ?? '',
    tradeName: data.tradeName ?? data.trade_name ?? '',
    businessNature: data.bussNature ?? data.businessNature ?? data.business_nature ?? '',
    state: data.stateName ?? data.state_name ?? data.state ?? '',
    stateCode: data.stateCode ?? data.state_code ?? '',
    pan: data.pan ?? '',
    registrationDate: data.regStartDate ?? data.registrationDate ?? data.registration_date ?? '',
    registrationType: data.registrationType ?? data.registration_type ?? '',
    gstStatus: data.status ?? data.gstStatus ?? data.gst_status ?? '',
    address: data.address ?? '',
    location: data.location ?? null,
    validGstin: validGstin === undefined ? true : validGstin === true || String(validGstin).toLowerCase() === 'true',
  };
}

export function mapGstSummaryToOverviewKpis(summary = {}) {
  const totalTax = Number(summary.total_tax ?? summary.totalTax ?? 0);
  const totalTaxable = Number(summary.total_taxable_amount ?? summary.totalTaxableAmount ?? 0);
  const itcEligible = Number(summary.itc_eligible ?? summary.itcEligible ?? 0);
  const itcClaimed = Number(summary.itc_claimed ?? summary.itcClaimed ?? 0);
  const totalCgst = Number(summary.total_cgst ?? summary.totalCgst ?? 0);
  const totalSgst = Number(summary.total_sgst ?? summary.totalSgst ?? 0);
  const totalIgst = Number(summary.total_igst ?? summary.totalIgst ?? 0);

  const formatL = (value) => `₹${(Number(value) / 100000).toFixed(2)}L`;

  return {
    totalTaxable: formatL(totalTaxable),
    totalTaxableSub: `${summary.total_entries ?? summary.totalEntries ?? 0} entries`,
    totalGstCollected: formatL(totalTax),
    totalGstCollectedSub: 'From GST ledger entries',
    eligibleItc: formatL(itcEligible),
    eligibleItcSub: itcClaimed > 0 ? `₹${(itcClaimed / 100000).toFixed(2)}L claimed` : 'Pending claim',
    cashLedgerBalance: '—',
    cashLedgerSub: 'Fetch from Ledgers tab',
    cgst: formatL(totalCgst),
    sgst: formatL(totalSgst),
    igst: formatL(totalIgst),
    reconciliationPct: '—',
    reconciliationSub: 'Run GSTR-2A reconcile',
  };
}

export function buildReconcileRequestPayload({
  month,
  financialYear,
  gstin,
  username,
  supplierGstin,
  vendor,
  startDate,
  endDate,
  invoiceFilter,
  otp,
}) {
  return {
    month: uiMonthToApiMonth(month) || month,
    financialYear: normalizeFinancialYear(financialYear),
    gstin,
    username,
    ...(supplierGstin ? { supplierGstin } : {}),
    ...(vendor ? { vendor } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(invoiceFilter ? { invoiceFilter } : {}),
    ...(otp ? { otp } : {}),
  };
}

export function buildGstrDocumentsRequestPayload({
  month,
  financialYear,
  gstin,
  username,
  vendorName,
  supplierGstin,
  startDate,
  endDate,
  otp,
}) {
  const apiMonth = uiMonthToApiMonth(month) || month;
  return {
    username,
    gstin,
    month: Number.parseInt(apiMonth, 10) || apiMonth,
    financialYear: normalizeFinancialYear(financialYear),
    ...(vendorName ? { vendorName } : {}),
    ...(supplierGstin ? { supplierGstin } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(otp ? { otp } : {}),
  };
}

export function buildReturnsTrackPayload({
  vendorName,
  gstin,
  returnType,
  financialYear,
}) {
  const apiReturnType = uiReturnTypeToApi(returnType);
  const apiFy = financialYear ? uiReturnsFyToApi(financialYear) : undefined;
  return {
    vendorName,
    gstin,
    ...(apiReturnType ? { returnType: apiReturnType } : {}),
    ...(apiFy ? { financialYear: apiFy } : {}),
  };
}

export function buildCashItcBalanceRequestPayload({
  gstin,
  username,
  month,
  year,
  otp,
}) {
  const apiMonth = Number.parseInt(uiMonthToApiMonth(month) || month, 10);
  return {
    username,
    gstin,
    month: apiMonth,
    year: Number.parseInt(String(year), 10),
    ...(otp ? { otp } : {}),
  };
}

const LEDGER_HEAD_MAP = [
  { key: 'igst', head: 'IGST', tone: 'green' },
  { key: 'cgst', head: 'CGST', tone: 'primary' },
  { key: 'sgst', head: 'SGST', tone: 'blue' },
  { key: 'cess', head: 'CESS', tone: 'amber' },
];

function mapLedgerHistoryEntry(entry, index) {
  const statusRaw = String(entry.status ?? 'Success');
  const status = statusRaw.toLowerCase() === 'failed' ? 'failed' : 'success';
  const periodMonth = entry.selectedMonth ?? entry.periodMonth ?? '';
  const periodYear = String(entry.year ?? entry.periodYear ?? '');
  const monthLabel = entry.month ?? (periodYear ? `${periodMonth} ${periodYear}`.trim() : periodMonth);

  return {
    id: entry.id ?? `lh-api-${index}-${entry.dateRetrieved ?? index}`,
    dateRetrieved: entry.dateRetrieved ?? '—',
    month: monthLabel,
    periodMonth,
    periodYear,
    gstin: entry.gstin ?? '',
    legalName: entry.legalName ?? '',
    cash: Number(entry.cashLedgerAmount ?? entry.cash ?? 0),
    itcAvail: Number(entry.availableItcAmount ?? entry.itcAvail ?? 0),
    itcBlocked: Number(entry.blockedItcAmount ?? entry.itcBlocked ?? 0),
    totalBalance: Number(entry.totalBalance ?? 0),
    status,
  };
}

/** Shape ledger API response for Ledgers tab (nested API → flat view state). */
export function mapCashItcBalanceResponseToUi(response = {}) {
  const balance = response.gstLedgerBalance ?? {};
  const rows = LEDGER_HEAD_MAP.map(({ key, head, tone }) => {
    const entry = balance[key] ?? {};
    return {
      head,
      tone,
      cash: Number(entry.cashBalance ?? 0),
      itcAvail: Number(entry.availableItc ?? 0),
      itcBlocked: Number(entry.blockedItc ?? 0),
    };
  });

  const stats = response.overallStats ?? {};
  const totalCash = Number(stats.totalCashAvailable ?? rows.reduce((sum, row) => sum + row.cash, 0));
  const totalItcAvail = Number(stats.availableItc ?? rows.reduce((sum, row) => sum + row.itcAvail, 0));
  const totalBlocked = Number(stats.blockedItcAmount ?? rows.reduce((sum, row) => sum + row.itcBlocked, 0));
  const totalAvail = Number(stats.totalAvailableBalance ?? totalCash + totalItcAvail);
  const grandTotal = totalCash + totalItcAvail + totalBlocked;

  const composition = response.itcComposition ?? {};
  const itcComposition = [
    { label: 'IGST ITC', tone: 'green', amount: Number(composition.igstItcAmount ?? 0) },
    { label: 'CGST ITC', tone: 'primary', amount: Number(composition.cgstItcAmount ?? 0) },
    { label: 'SGST ITC', tone: 'blue', amount: Number(composition.sgstItcAmount ?? 0) },
  ]
    .filter((item) => item.amount > 0)
    .map((item) => ({
      ...item,
      pct: totalItcAvail > 0 ? Math.round((item.amount / totalItcAvail) * 100) : 0,
    }));

  const position = response.gstPosition ?? {};

  return {
    rows,
    totals: { totalCash, totalItcAvail, totalBlocked, totalAvail, grandTotal },
    itcComposition,
    gstPosition: {
      gstin: position.gstin ?? '',
      legalName: position.legalName ?? '',
      selectedMonth: position.selectedMonth ?? '',
      cashAvailable: Number(position.cashAvailable ?? totalCash),
      itcAvailable: Number(position.itcAvailable ?? totalItcAvail),
      totalAvailable: Number(position.totalAvailable ?? totalCash + totalItcAvail),
      lastSynced: position.lastSynced ?? '',
      authStatus: position.authStatus ?? 'Verified',
    },
    history: (response.history ?? []).map(mapLedgerHistoryEntry),
  };
}

export function unwrapGstApiResponse(response) {
  if (!response) return response;
  if (response.currentData !== undefined || response.history !== undefined) return response;
  if (response.data?.currentData !== undefined || response.data?.history !== undefined) return response.data;
  if (response.success && response.data) return response.data;
  return response;
}

export function mapHistoryEntriesToSnapshots({
  history = [],
  mapResponseToSnapshot,
}) {
  return history.map((entry, index) =>
    mapResponseToSnapshot(entry.response ?? {}, {
      fetchedAt: entry.requestedAt,
      idSuffix: `hist-${index}-${entry.requestedAt ?? index}`,
    }),
  );
}
