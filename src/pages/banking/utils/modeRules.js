import { PAYOUT_MODES } from "../constants";

const MODE_LIMITS = {
  IMPS: { min: 1, max: 500000, label: "IMPS" },
  NEFT: { min: 1, max: null, label: "NEFT" },
  RTGS: { min: 200000, max: null, label: "RTGS" },
  INEFT: { min: 1, max: 100000, label: "iNEFT" },
};

export const STANDARD_PAYOUT_MODES = ["IMPS", "NEFT", "RTGS"];

export const getModeLimits = (mode) => MODE_LIMITS[String(mode || "").toUpperCase()] || null;

export const suggestPayoutMode = (amount) => {
  const value = Number(amount || 0);
  if (value >= 1000000) return "RTGS";
  if (value > 500000) return "NEFT";
  return "IMPS";
};

export const validateAmountForMode = (amount, mode) => {
  const limits = getModeLimits(mode);
  if (!limits) return { valid: false, message: "Invalid payment mode" };

  const value = Number(amount || 0);
  if (value < limits.min) {
    return {
      valid: false,
      message: `Minimum amount for ${limits.label} is ₹${limits.min.toLocaleString("en-IN")}`,
    };
  }
  if (limits.max != null && value > limits.max) {
    return {
      valid: false,
      message: `Maximum amount for ${limits.label} is ₹${limits.max.toLocaleString("en-IN")}`,
    };
  }
  return { valid: true, message: "" };
};

export const getModeCutoffNotice = (mode) => {
  const normalized = String(mode || "").toUpperCase();
  if (normalized === "NEFT") {
    return "NEFT post-cutoff (7pm–1am / holidays): per-transaction cap may be ₹10,00,000.";
  }
  if (normalized === "RTGS") {
    return "RTGS is unavailable 12am–1am, Sundays, and holidays. Post-cutoff cap may be ₹1,00,00,000.";
  }
  if (normalized === "INEFT") {
    return "iNEFT is rejected 7pm-1am and is for interbank transfers only.";
  }
  return null;
};

export const sanitizeRemarks = (value = "") =>
  String(value).replace(/[^a-zA-Z0-9\s.,/-]/g, "").slice(0, 100);

export const isValidRemarks = (value = "") => {
  const trimmed = String(value).trim();
  return trimmed.length > 0 && trimmed === sanitizeRemarks(trimmed);
};

export const filterEnabledModes = (enabledModes = PAYOUT_MODES) => {
  const allowed = new Set(
    (Array.isArray(enabledModes) ? enabledModes : PAYOUT_MODES).map((m) =>
      String(m).toUpperCase(),
    ),
  );
  return PAYOUT_MODES.filter((mode) => allowed.has(mode));
};

const toFiniteAmount = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const getPayrunItemPaymentAmount = (item = {}) =>
  toFiniteAmount(
    item.paymentAmount ??
      item.payment_amount ??
      item.netPayableAmount ??
      item.net_payable_amount ??
      item.requestedAmount ??
      item.requested_amount ??
      item.payableAmount ??
      item.payable_amount ??
      item.amount,
  );

const getBackendModeEligibility = (payrun = {}) =>
  payrun?.modeEligibility ||
  payrun?.mode_eligibility ||
  payrun?.paymentModeEligibility ||
  payrun?.payment_mode_eligibility ||
  null;

const getBackendAllowedModes = (payrun = {}) => {
  const allowedModes =
    payrun?.allowedPaymentModes ||
    payrun?.allowed_payment_modes ||
    payrun?.enabledPaymentModes ||
    payrun?.enabled_payment_modes;
  return Array.isArray(allowedModes)
    ? allowedModes.map((mode) => String(mode || "").toUpperCase()).filter(Boolean)
    : null;
};

const getBackendRecommendedMode = (payrun = {}) =>
  String(payrun?.recommendedPaymentMode || payrun?.recommended_payment_mode || "").toUpperCase();

const normalizeBackendEligibility = (payrun = {}, modes = STANDARD_PAYOUT_MODES) => {
  const backendEligibility = getBackendModeEligibility(payrun);
  const allowedModes = getBackendAllowedModes(payrun);
  const recommendedMode = getBackendRecommendedMode(payrun);

  if (!backendEligibility && !allowedModes && !recommendedMode) return null;

  const eligibility = modes.reduce((acc, mode) => {
    const backendMode =
      backendEligibility?.[mode] ||
      backendEligibility?.[mode.toLowerCase()] ||
      {};
    const explicitlyEnabled =
      backendMode.enabled ??
      backendMode.canUse ??
      backendMode.can_use ??
      backendMode.available ??
      null;
    const enabled =
      explicitlyEnabled !== null && explicitlyEnabled !== undefined
        ? Boolean(explicitlyEnabled)
        : allowedModes
          ? allowedModes.includes(mode)
          : true;

    acc[mode] = {
      enabled,
      reason:
        backendMode.reason ||
        backendMode.disabledReason ||
        backendMode.disabled_reason ||
        (!enabled ? "This mode is currently unavailable for the selected bank account/provider." : null),
      source: "backend",
    };
    return acc;
  }, {});

  const enabledModes = modes.filter((mode) => eligibility[mode]?.enabled);
  return {
    modeEligibility: eligibility,
    enabledModes,
    recommendedMode: enabledModes.includes(recommendedMode)
      ? recommendedMode
      : getRecommendedPaymentMode(eligibility),
    reason: "Backend eligibility",
    source: "backend",
  };
};

const summarizeAffectedCount = (count, suffix) => (count > 0 ? `${count} ${count === 1 ? "item is" : "items are"} ${suffix}` : "");

export const getRecommendedPaymentMode = (modeEligibility = {}) => {
  const enabled = (mode) => modeEligibility[mode]?.enabled;
  const everyItemAtLeastTenLakh = Boolean(modeEligibility.RTGS?.allItemsAtLeastTenLakh);

  if (enabled("RTGS") && everyItemAtLeastTenLakh) return "RTGS";
  if (enabled("NEFT") && modeEligibility.IMPS?.itemsAboveMax > 0) return "NEFT";
  if (enabled("IMPS")) return "IMPS";
  if (enabled("NEFT")) return "NEFT";
  if (enabled("RTGS")) return "RTGS";
  return "";
};

export const getPayrunPaymentModeEligibility = ({
  payrun = {},
  items = [],
  currency = "INR",
  modes = STANDARD_PAYOUT_MODES,
} = {}) => {
  const backendEligibility = normalizeBackendEligibility(payrun, modes);
  if (backendEligibility) return backendEligibility;

  const normalizedCurrency = String(currency || "INR").toUpperCase();
  const amounts = (Array.isArray(items) ? items : []).map(getPayrunItemPaymentAmount);
  const missingAmountCount = amounts.filter((amount) => amount === null || amount < 0).length;
  const nonPositiveAmountCount = amounts.filter((amount) => amount !== null && amount <= 0).length;
  const hasMissingAmount = amounts.length === 0 || missingAmountCount > 0;
  const hasInvalidPositiveAmount = hasMissingAmount || nonPositiveAmountCount > 0;
  const values = amounts.filter((amount) => amount !== null && amount >= 0);
  const belowRtgsMin = values.filter((amount) => amount < MODE_LIMITS.RTGS.min).length;
  const aboveImpsMax = values.filter((amount) => amount > MODE_LIMITS.IMPS.max).length;
  const allItemsAtLeastTenLakh = values.length > 0 && values.every((amount) => amount >= 1000000);

  if (normalizedCurrency !== "INR") {
    const reason = "Payment mode eligibility for non-INR payruns must be confirmed by backend.";
    const modeEligibility = modes.reduce((acc, mode) => {
      acc[mode] = { enabled: false, reason, source: "frontend-fallback" };
      return acc;
    }, {});
    return {
      modeEligibility,
      enabledModes: [],
      recommendedMode: "",
      reason,
      source: "frontend-fallback",
    };
  }

  const missingReason =
    "Payment mode eligibility could not be determined because one or more item amounts are missing.";
  const positiveReason =
    "Payment mode eligibility requires each payrun item to have a positive payable amount.";
  const modeEligibility = {
    NEFT: {
      enabled: !hasInvalidPositiveAmount,
      reason: hasMissingAmount ? missingReason : nonPositiveAmountCount > 0 ? positiveReason : null,
      source: "frontend-fallback",
    },
    IMPS: {
      enabled: !hasInvalidPositiveAmount && aboveImpsMax === 0,
      reason: hasMissingAmount
        ? missingReason
        : nonPositiveAmountCount > 0
          ? positiveReason
          : aboveImpsMax > 0
            ? `This payrun contains item(s) above ₹5,00,000. IMPS supports item amounts up to ₹5,00,000. ${summarizeAffectedCount(aboveImpsMax, "above ₹5,00,000.")}`
            : null,
      itemsAboveMax: aboveImpsMax,
      source: "frontend-fallback",
    },
    RTGS: {
      enabled: !hasInvalidPositiveAmount && belowRtgsMin === 0,
      reason: hasMissingAmount
        ? missingReason
        : nonPositiveAmountCount > 0
          ? positiveReason
          : belowRtgsMin > 0
            ? `This payrun contains item(s) below ₹2,00,000. RTGS requires each item to be at least ₹2,00,000 because payments are processed item-wise. ${summarizeAffectedCount(belowRtgsMin, "below ₹2,00,000.")}`
            : null,
      itemsBelowMin: belowRtgsMin,
      allItemsAtLeastTenLakh,
      source: "frontend-fallback",
    },
  };

  const enabledModes = modes.filter((mode) => modeEligibility[mode]?.enabled);
  const recommendedMode = getRecommendedPaymentMode(modeEligibility);

  return {
    modeEligibility,
    enabledModes,
    recommendedMode,
    reason:
      recommendedMode === "RTGS"
        ? "All items are high-value payments"
        : recommendedMode === "NEFT"
          ? "Safest eligible option for this payrun"
          : recommendedMode === "IMPS"
            ? "Fastest eligible option"
            : missingReason,
    source: "frontend-fallback",
  };
};

export const getPaymentModeDisabledReason = (mode, modeEligibility = {}) =>
  modeEligibility[String(mode || "").toUpperCase()]?.reason || "This payment mode is unavailable.";

export const generateClientReference = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AP-${timestamp}-${random}`;
};
