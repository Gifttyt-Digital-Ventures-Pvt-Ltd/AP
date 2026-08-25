export const toMoney = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const getGrossPayableAmount = (payable = {}) =>
  toMoney(
    payable.grossPayableAmount ??
      payable.gross_payable_amount ??
      payable.netPayableAmount ??
      payable.net_payable_amount ??
      payable.payableAmount ??
      payable.payable_amount ??
      payable.amount,
  );

export const getAvailableVendorAdvance = (payable = {}) =>
  toMoney(payable.availableVendorAdvance ?? payable.available_vendor_advance);

export const canAdjustFromVendorAdvance = (payable = {}) =>
  payable.canAdjustFromVendorAdvance === true ||
  payable.can_adjust_from_vendor_advance === true;

export const getVendorAdvanceAdjustmentPreview = ({
  payable = {},
  enabled = false,
  amount = null,
  grossPayable = null,
} = {}) => {
  const gross = Math.max(0, toMoney(grossPayable ?? getGrossPayableAmount(payable)));
  const available = Math.max(0, getAvailableVendorAdvance(payable));
  const maxApplicable = Math.min(available, gross);
  const requestedAmount = amount === "" || amount === null || amount === undefined
    ? maxApplicable
    : toMoney(amount);
  const shouldApply = enabled && canAdjustFromVendorAdvance(payable) && requestedAmount > 0;
  const applied = shouldApply ? Math.min(requestedAmount, maxApplicable) : 0;
  const bankPaymentAmount = Math.max(0, gross - applied);
  return {
    grossPayableAmount: gross,
    availableVendorAdvance: available,
    maxApplicableAdvance: maxApplicable,
    vendorAdvanceAppliedAmount: applied,
    advanceAppliedAmount: applied,
    bankPaymentAmount,
    remainingVendorAdvance: Math.max(0, available - applied),
    adjustFromVendorAdvance: applied > 0,
  };
};
