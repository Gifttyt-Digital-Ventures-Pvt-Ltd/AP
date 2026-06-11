import { PAYOUT_MODES } from "../constants";

const MODE_LIMITS = {
  IMPS: { min: 1, max: 500000, label: "IMPS" },
  NEFT: { min: 1, max: null, label: "NEFT" },
  RTGS: { min: 200000, max: null, label: "RTGS" },
  INEFT: { min: 1, max: 100000, label: "iNEFT" },
};

export const getModeLimits = (mode) => MODE_LIMITS[String(mode || "").toUpperCase()] || null;

export const suggestPayoutMode = (amount) => {
  const value = Number(amount || 0);
  if (value <= 500000) return "IMPS";
  if (value >= 200000) return "RTGS";
  return "NEFT";
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
    return "iNEFT is rejected 7pm–1am and is for interbank transfers only (not ICICI→ICICI).";
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

export const generateClientReference = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AP-${timestamp}-${random}`;
};
