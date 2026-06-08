export const sanitizeNumericInput = (
  value = "",
  { allowDecimal = true, maxDecimalPlaces } = {},
) => {
  let next = String(value ?? "");

  if (!allowDecimal) {
    return next.replace(/\D/g, "");
  }

  next = next.replace(/[^\d.]/g, "");
  const firstDot = next.indexOf(".");
  if (firstDot === -1) return next;

  const head = next.slice(0, firstDot + 1);
  const tail = next.slice(firstDot + 1).replace(/\./g, "");
  const normalizedTail =
    Number.isInteger(maxDecimalPlaces) && maxDecimalPlaces >= 0
      ? tail.slice(0, maxDecimalPlaces)
      : tail;
  return head + normalizedTail;
};

export const parseNumericInput = (value, fallback = 0) => {
  if (value === "" || value === null || value === undefined) return fallback;
  const parsed = Number.parseFloat(String(value).trim());
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const formatNumericInputValue = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  return String(value);
};
