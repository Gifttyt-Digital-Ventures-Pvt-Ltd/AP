export const localeMap = {
  AED: "ar-AE",
  AFN: "fa-AF",
  ALL: "sq-AL",
  AMD: "hy-AM",
  ANG: "nl-CW",
  AOA: "pt-AO",
  ARS: "es-AR",
  AUD: "en-AU",
  AWG: "nl-AW",
  AZN: "az-AZ",
  BAM: "bs-BA",
  BBD: "en-BB",
  BDT: "bn-BD",
  BGN: "bg-BG",
  BHD: "ar-BH",
  BIF: "fr-BI",
  BMD: "en-BM",
  BND: "ms-BN",
  BOB: "es-BO",
  BRL: "pt-BR",
  BSD: "en-BS",
  BTN: "dz-BT",
  BWP: "en-BW",
  BYN: "be-BY",
  BZD: "en-BZ",
  CAD: "en-CA",
  CDF: "fr-CD",
  CHF: "de-CH",
  CLP: "es-CL",
  CNY: "zh-CN",
  COP: "es-CO",
  CRC: "es-CR",
  CUP: "es-CU",
  CVE: "pt-CV",
  CZK: "cs-CZ",
  DJF: "fr-DJ",
  DKK: "da-DK",
  DOP: "es-DO",
  DZD: "ar-DZ",
  EGP: "ar-EG",
  ERN: "ti-ER",
  ETB: "am-ET",
  EUR: "de-DE",
  FJD: "en-FJ",
  FKP: "en-FK",
  GBP: "en-GB",
  GEL: "ka-GE",
  GHS: "en-GH",
  GIP: "en-GI",
  GMD: "en-GM",
  GNF: "fr-GN",
  GTQ: "es-GT",
  GYD: "en-GY",
  HKD: "zh-HK",
  HNL: "es-HN",
  HRK: "hr-HR",
  HTG: "fr-HT",
  HUF: "hu-HU",
  IDR: "id-ID",
  ILS: "he-IL",
  INR: "en-IN",
  IQD: "ar-IQ",
  IRR: "fa-IR",
  ISK: "is-IS",
  JMD: "en-JM",
  JOD: "ar-JO",
  JPY: "ja-JP",
  KES: "sw-KE",
  KGS: "ky-KG",
  KHR: "km-KH",
  KMF: "ar-KM",
  KPW: "ko-KP",
  KRW: "ko-KR",
  KWD: "ar-KW",
  KYD: "en-KY",
  KZT: "kk-KZ",
  LAK: "lo-LA",
  LBP: "ar-LB",
  LKR: "si-LK",
  LRD: "en-LR",
  LSL: "st-LS",
  LYD: "ar-LY",
  MAD: "ar-MA",
  MDL: "ro-MD",
  MGA: "mg-MG",
  MKD: "mk-MK",
  MMK: "my-MM",
  MNT: "mn-MN",
  MOP: "zh-MO",
  MRU: "ar-MR",
  MUR: "en-MU",
  MVR: "dv-MV",
  MWK: "en-MW",
  MXN: "es-MX",
  MYR: "ms-MY",
  MZN: "pt-MZ",
  NAD: "en-NA",
  NGN: "en-NG",
  NIO: "es-NI",
  NOK: "nb-NO",
  NPR: "ne-NP",
  NZD: "en-NZ",
  OMR: "ar-OM",
  PAB: "es-PA",
  PEN: "es-PE",
  PGK: "en-PG",
  PHP: "fil-PH",
  PKR: "ur-PK",
  PLN: "pl-PL",
  PYG: "es-PY",
  QAR: "ar-QA",
  RON: "ro-RO",
  RSD: "sr-RS",
  RUB: "ru-RU",
  RWF: "rw-RW",
  SAR: "ar-SA",
  SBD: "en-SB",
  SCR: "fr-SC",
  SDG: "ar-SD",
  SEK: "sv-SE",
  SGD: "en-SG",
  SHP: "en-SH",
  SLE: "en-SL",
  SOS: "so-SO",
  SRD: "nl-SR",
  STN: "pt-ST",
  SYP: "ar-SY",
  SZL: "en-SZ",
  THB: "th-TH",
  TJS: "tg-TJ",
  TMT: "tk-TM",
  TND: "ar-TN",
  TOP: "to-TO",
  TRY: "tr-TR",
  TTD: "en-TT",
  TWD: "zh-TW",
  TZS: "sw-TZ",
  UAH: "uk-UA",
  UGX: "sw-UG",
  USD: "en-US",
  UYU: "es-UY",
  UZS: "uz-UZ",
  VES: "es-VE",
  VND: "vi-VN",
  VUV: "bi-VU",
  WST: "sm-WS",
  XAF: "fr-CM",
  XCD: "en-AG",
  XOF: "fr-SN",
  XPF: "fr-PF",
  YER: "ar-YE",
  ZAR: "en-ZA",
  ZMW: "en-ZM",
  ZWL: "en-ZW",
};

export const noDecimalCurrencies = [
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
];

export const DEFAULT_CURRENCY = "INR";

export const CURRENCY_FILTER_ALL = "ALL";

// Values must match backend getAvailableCurrencies screen enum.
export const CURRENCY_SCREENS = {
  INVOICE: "INVOICE",
  CHECKER: "CHECKER",
  APPROVAL: "APPROVAL",
  PAYMENT: "PAYMENT",
  WORKFLOW: "WORKFLOW",
  ANALYTICS: "ANALYTICS",
  CATEGORY: "CATEGORY",
};

export function normalizeCurrencyCode(currency = DEFAULT_CURRENCY) {
  const value = String(currency || "").trim().toUpperCase();
  return value || DEFAULT_CURRENCY;
}

/** Ensures current/scanned currency codes appear in form dropdowns even if not in corp config. */
export function mergeCurrencyOptions(baseOptions = [], ...extraCurrencies) {
  const merged = [];
  const seen = new Set();

  const add = (code) => {
    const normalized = normalizeCurrencyCode(code);
    if (!normalized || normalized === CURRENCY_FILTER_ALL || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    merged.push(normalized);
  };

  (Array.isArray(baseOptions) ? baseOptions : []).forEach(add);
  extraCurrencies.flat().forEach(add);

  return merged;
}

export function formatCurrency(amount, currency = DEFAULT_CURRENCY) {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  const locale = localeMap[normalizedCurrency] ?? "en-US";
  const isNoDecimal = noDecimalCurrencies.includes(normalizedCurrency);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: isNoDecimal ? 0 : 2,
    maximumFractionDigits: isNoDecimal ? 0 : 2,
  }).format(amount || 0);
}

/** Always send explicit currency code (including INR and ALL). */
export function toCurrencyApiParam(selectedCurrency) {
  const value = normalizeCurrencyCode(selectedCurrency);
  return value || DEFAULT_CURRENCY;
}

export function buildCurrencyQueryParams(selectedCurrency, extraParams = {}) {
  return { ...extraParams, currency: toCurrencyApiParam(selectedCurrency) };
}

export const FALLBACK_CURRENCIES = ["INR", "USD", "EUR", "GBP"];
