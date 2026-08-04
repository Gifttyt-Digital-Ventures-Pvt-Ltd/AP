import { parseNumericInput } from "./numericInput";

const FUNDING_AMOUNT_TOLERANCE = 0.01;

const roundMoney = (value) =>
  Math.round((Number(value) || 0) * 100) / 100;

export const getInvoiceFundingSplitError = (
  invoiceData = {},
  invoiceTotal = 0,
  { enabled = true } = {},
) => {
  if (!enabled || !invoiceData?.isFunded) return "";

  const totalAmount = roundMoney(invoiceTotal);
  const orgAmount = roundMoney(parseNumericInput(invoiceData.orgAmount, 0));
  const financierAmount = roundMoney(
    parseNumericInput(invoiceData.financierAmount, 0),
  );
  const fundedTotal = roundMoney(orgAmount + financierAmount);

  if (Math.abs(fundedTotal - totalAmount) <= FUNDING_AMOUNT_TOLERANCE) {
    return "";
  }

  return "Organization funded amount + financier funded amount must equal the invoice total amount.";
};

export const isInvoiceFundingSplitValid = (
  invoiceData = {},
  invoiceTotal = 0,
  options = {},
) => !getInvoiceFundingSplitError(invoiceData, invoiceTotal, options);
