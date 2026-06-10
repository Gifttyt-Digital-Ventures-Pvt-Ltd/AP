import { parseTaxRateFromLabel } from './invoiceTax';

/** UI preference: true = line items table visible, false = summary only. Defaults to true. */
export const resolveLineItemsExpanded = (source = {}) => {
  const value = source.lineItemsExpanded ?? source.line_items_expanded;
  if (value === undefined || value === null) return true;
  return value !== false;
};

export const computeLineItemsSummary = ({
  lineItems = [],
  calculateLineItemSubtotal,
  isInvoiceLevelTax = false,
  useInrTax = true,
} = {}) => {
  const items = Array.isArray(lineItems) ? lineItems : [];
  let subTotal = 0;
  let lineTaxTotal = 0;
  let linesNetTotal = 0;

  items.forEach((item) => {
    const taxable = calculateLineItemSubtotal
      ? calculateLineItemSubtotal(item)
      : 0;
    subTotal += taxable;

    if (isInvoiceLevelTax) {
      linesNetTotal += taxable;
      return;
    }

    const rate = useInrTax
      ? parseTaxRateFromLabel(item.tax)
      : Number(item.taxRate) || parseTaxRateFromLabel(item.tax) || 0;
    const taxAmount = (taxable * rate) / 100;
    lineTaxTotal += taxAmount;
    linesNetTotal += taxable + taxAmount;
  });

  const round = (value) => Math.round(value * 100) / 100;

  return {
    itemCount: items.length,
    subTotal: round(subTotal),
    lineTaxTotal: round(lineTaxTotal),
    linesNetTotal: round(linesNetTotal),
  };
};
