import React, { useMemo } from "react";
import { format } from "date-fns";
import { Label } from "../../../components/ui/label";
import { formatCurrency, normalizeCurrencyCode } from "../../../utils/currency";
import { TAX_RATES } from "../constants";
import { buildInvoiceEditFormData } from "../utils/invoiceFormData";
import {
  calculateInvoiceTotals,
  INVOICE_LEVEL,
  isInrInvoiceCurrency,
  resolveLineItemSubtotal,
} from "../utils/invoiceTax";
import { parseNumericInput } from "../utils/numericInput";

const formatDisplayDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "MMMM do, yyyy");
};

const DetailField = ({ label, value, mono = false, className = "" }) => (
  <div className={className}>
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <p className={`text-sm font-medium break-words ${mono ? " " : ""}`}>
      {value || "-"}
    </p>
  </div>
);

const computeTdsAmount = (lineItems = [], tdsValue = "", subTotalOverride) => {
  const tdsRate = Number.parseFloat(String(tdsValue || "").replace("%", "")) || 0;
  if (!tdsRate) return 0;
  const subTotal =
    subTotalOverride ??
    (lineItems || []).reduce((sum, item) => sum + resolveLineItemSubtotal(item), 0);
  return Math.round(((subTotal * tdsRate) / 100) * 100) / 100;
};

const InvoiceReadOnlyDetails = ({
  invoice,
  showCategoryField = true,
  findVendorByName,
  findVendorById,
  isCategoryFeatureEnabled = true,
}) => {
  const formData = useMemo(
    () =>
      buildInvoiceEditFormData(invoice, {
        isCategoryFeatureEnabled,
        findVendorByName,
        findVendorById,
      }),
    [invoice, isCategoryFeatureEnabled, findVendorByName, findVendorById],
  );

  if (!formData) return null;

  const invoiceCurrency = normalizeCurrencyCode(formData.currency);
  const useInrTax = isInrInvoiceCurrency(invoiceCurrency);
  const isInvoiceLevelDiscount = formData.discountsLevel === INVOICE_LEVEL;
  const isInvoiceLevelTax = formData.taxesLevel === INVOICE_LEVEL;
  const formatAmount = (amount) => formatCurrency(amount, invoiceCurrency);

  const calculateLineItemSubtotal = (item) => {
    if (isInvoiceLevelDiscount) {
      const lineTotal = parseNumericInput(item.lineTotal ?? item.amount, 0);
      if (lineTotal > 0) return lineTotal;
      return (
        parseNumericInput(item.quantity, 0) * parseNumericInput(item.unitRate, 0)
      );
    }
    return resolveLineItemSubtotal(item);
  };

  const totals = calculateInvoiceTotals({
    lineItems: formData.lineItems,
    currency: invoiceCurrency,
    calculateLineItemSubtotal,
    taxRates: TAX_RATES,
    invoiceTaxAmount: formData.scannedTaxAmount ?? invoice.gstAmount,
    invoiceTaxName:
      isInvoiceLevelTax
        ? formData.invoiceTaxName
        : formData.scannedTaxName ?? "Tax",
    invoiceTaxRate:
      isInvoiceLevelTax
        ? formData.invoiceTaxRate
        : formData.scannedTaxRate,
    invoiceTax: formData.invoiceTax,
    taxesLevel: formData.taxesLevel,
    discountsLevel: formData.discountsLevel,
    invoiceDiscount: formData.invoiceDiscount,
    invoiceDiscountType: formData.invoiceDiscountType,
  });

  const tdsAmountFromRate = computeTdsAmount(
    formData.lineItems,
    formData.tds,
    isInvoiceLevelDiscount ? totals.subTotalBeforeDiscount : totals.subTotal,
  );
  const tdsAmount =
    tdsAmountFromRate ||
    Number(invoice.tdsAmount ?? 0) ||
    0;
  const netPayable =
    Number(invoice.netAmount) ||
    Math.max(Math.round((totals.total - tdsAmount) * 100) / 100, 0);

  const showCategory =
    showCategoryField &&
    isCategoryFeatureEnabled &&
    (formData.categoryId || formData.categoryName);

  const formatLineItemTax = (item) => {
    if (useInrTax) return item.tax || "-";
    const name = item.taxName || item.tax || "Tax";
    const rate = item.taxRate;
    if (rate === "" || rate === undefined || rate === null) return name;
    return `${name} ${rate}%`;
  };

  const formatLineItemDiscount = (item) => {
    if (isInvoiceLevelDiscount) return "-";
    const discount = parseNumericInput(item.discount, 0);
    if (!discount) return "-";
    return item.discountType === "%"
      ? `${discount}%`
      : formatAmount(discount);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Vendor Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Vendor Name" value={formData.vendorName} />
          <DetailField label="Bill Number" value={formData.invoiceNumber} mono />
          <DetailField label="Billing Date" value={formatDisplayDate(formData.invoiceDate)} />
          <DetailField label="Due Date" value={formatDisplayDate(formData.dueDate)} />
          <DetailField label="Currency" value={invoiceCurrency} mono />
          <DetailField label="Department" value={formData.departmentName} />
          {showCategory && (
            <DetailField label="Category" value={formData.categoryName} />
          )}
        </div>

        {formData.billingAddress && (
          <DetailField label="Billing Address" value={formData.billingAddress} />
        )}

        <div className="grid grid-cols-2 gap-3">
          <DetailField label="GST Treatment" value={formData.gstTreatment} />
          <DetailField label="GSTIN / Tax ID" value={formData.gstin} mono />
          <DetailField label="Source of Supply" value={formData.sourceOfSupply} />
          <DetailField label="Destination" value={formData.destinationOfSupply} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Source" value={formData.source} />
          {formData.source === "Email" && (
            <DetailField label="Source Email" value={formData.sourceEmail} />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Discounts" value={formData.discountsLevel} />
          <DetailField label="Taxes" value={formData.taxesLevel} />
        </div>
      </div>

      {formData.lineItems?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Line Items</h3>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin-muted">
              <table className="min-w-[760px] w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-2 text-left font-medium min-w-[180px]">Item Description</th>
                    {!isInvoiceLevelTax && (
                      <th className="p-2 text-left font-medium w-[130px]">Tax</th>
                    )}
                    <th className="p-2 text-left font-medium w-[50px]">Qty</th>
                    <th className="p-2 text-left font-medium w-[80px]">Rate</th>
                    {!isInvoiceLevelDiscount && (
                      <th className="p-2 text-left font-medium w-[80px]">Discount</th>
                    )}
                    <th className="p-2 text-left font-medium w-[90px]">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.lineItems.map((item, index) => (
                    <tr key={index} className="border-b last:border-b-0 align-top">
                      <td className="p-2">
                        <p>{item.description || "-"}</p>
                        {item.hsnSac && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            HSN: {item.hsnSac}
                          </p>
                        )}
                      </td>
                      {!isInvoiceLevelTax && (
                        <td className="p-2">{formatLineItemTax(item)}</td>
                      )}
                      <td className="p-2  ">{item.quantity ?? "-"}</td>
                      <td className="p-2  ">
                        {formatAmount(item.unitRate ?? item.unitPrice ?? 0)}
                      </td>
                      {!isInvoiceLevelDiscount && (
                        <td className="p-2">{formatLineItemDiscount(item)}</td>
                      )}
                      <td className="p-2   font-semibold">
                        {formatAmount(calculateLineItemSubtotal(item))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {formData.description && (
        <DetailField label="Description" value={formData.description} />
      )}

      <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span>Sub Total</span>
          <span className="font-medium  ">
            {formatAmount(
              isInvoiceLevelDiscount ? totals.subTotalBeforeDiscount : totals.subTotal,
            )}
          </span>
        </div>
        {isInvoiceLevelDiscount && totals.invoiceDiscountAmount > 0 && (
          <div className="flex justify-between text-xs">
            <span>
              Discount
              {formData.invoiceDiscount
                ? ` (${formData.invoiceDiscount}${formData.invoiceDiscountType === "%" ? "%" : ""})`
                : ""}
            </span>
            <span className=" ">
              -{formatAmount(totals.invoiceDiscountAmount)}
            </span>
          </div>
        )}
        {useInrTax && totals.cgst > 0 && (
          <div className="flex justify-between text-xs">
            <span>CGST</span>
            <span className=" ">{formatAmount(totals.cgst)}</span>
          </div>
        )}
        {useInrTax && totals.sgst > 0 && (
          <div className="flex justify-between text-xs">
            <span>SGST</span>
            <span className=" ">{formatAmount(totals.sgst)}</span>
          </div>
        )}
        {useInrTax && totals.igst > 0 && (
          <div className="flex justify-between text-xs">
            <span>IGST</span>
            <span className=" ">{formatAmount(totals.igst)}</span>
          </div>
        )}
        {!useInrTax &&
          totals.foreignTaxes?.map((entry) => (
            <div key={`${entry.name}-${entry.rate}`} className="flex justify-between text-xs">
              <span>
                {entry.name}
                {entry.rate > 0 ? ` ${entry.rate}%` : ""}
              </span>
              <span className=" ">{formatAmount(entry.amount)}</span>
            </div>
          ))}
        <div className="flex justify-between items-center pt-1.5 border-t text-xs">
          <span>TDS{formData.tds ? ` (${formData.tds})` : ""}</span>
          <span className=" ">{formatAmount(tdsAmount)}</span>
        </div>
        <div className="flex justify-between text-sm pt-1.5 border-t">
          <span>Total</span>
          <span className=" ">{formatAmount(totals.total)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold pt-1.5 border-t">
          <span>Net Payable</span>
          <span className="  text-primary">
            {formatAmount(netPayable)}
          </span>
        </div>
      </div>

      {/* <div className="pt-2 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4 shrink-0" />
          <span>
            Created by {invoice.created_by_name || "-"}
            {invoice.created_at
              ? ` on ${format(new Date(invoice.created_at), "dd MMM yyyy, hh:mm a")}`
              : ""}
          </span>
        </div>
      </div> */}
    </div>
  );
};

export default InvoiceReadOnlyDetails;
