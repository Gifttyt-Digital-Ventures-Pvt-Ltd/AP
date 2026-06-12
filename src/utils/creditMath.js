/** Token/credit amounts support up to 2 decimal places (matches backend NUMERIC(18,2)). */

export const parseCreditAmount = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const normalized = String(value).trim().replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const roundCreditAmount = (value) =>
  Math.round(parseCreditAmount(value) * 100) / 100;

export const formatCredits = (value) => {
  const amount = roundCreditAmount(value);
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const multiplyCreditCost = (rate, unitCount = 1) =>
  roundCreditAmount(parseCreditAmount(rate) * Math.max(Number(unitCount) || 0, 0));

export const subtractCreditBalance = (balance, cost) =>
  roundCreditAmount(parseCreditAmount(balance) - parseCreditAmount(cost));

export const canAffordCreditCost = (balance, cost) =>
  parseCreditAmount(balance) >= parseCreditAmount(cost);
