import React, { useMemo } from "react";
import { format } from "date-fns";
import { User } from "lucide-react";
import { Label } from "../../../components/ui/label";
import { formatCurrency, normalizeCurrencyCode } from "../../../utils/currency";
import { TAX_RATES } from "../constants";
import { buildInvoiceEditFormData } from "../utils/invoiceFormData";
import {
  calculateInvoiceTotals,
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
  const isInvoiceLevelDiscount = formData.discounts_level === "At Invoice Level";
  const formatAmount = (amount) => formatCurrency(amount, invoiceCurrency);

  const calculateLineItemSubtotal = (item) => {
    if (isInvoiceLevelDiscount) {
      const lineTotal = parseNumericInput(item.line_total ?? item.amount, 0);
      if (lineTotal > 0) return lineTotal;
      return (
        parseNumericInput(item.quantity, 0) * parseNumericInput(item.unit_rate, 0)
      );
    }
    return resolveLineItemSubtotal(item);
  };

  const totals = calculateInvoiceTotals({
    lineItems: formData.line_items,
    currency: invoiceCurrency,
    calculateLineItemSubtotal,
    taxRates: TAX_RATES,
    invoiceTaxAmount: formData.scanned_tax_amount ?? invoice.gst_amount ?? invoice.gstAmount,
    invoiceTaxName: formData.scanned_tax_name ?? "Tax",
    invoiceTaxRate: formData.scanned_tax_rate,
    discountsLevel: formData.discounts_level,
    invoiceDiscount: formData.invoice_discount,
    invoiceDiscountType: formData.invoice_discount_type,
  });

  const tdsAmountFromRate = computeTdsAmount(
    formData.line_items,
    formData.tds,
    isInvoiceLevelDiscount ? totals.subTotalBeforeDiscount : totals.subTotal,
  );
  const tdsAmount =
    tdsAmountFromRate ||
    Number(invoice.tds_amount ?? invoice.tdsAmount ?? 0) ||
    0;
  const netPayable =
    Number(invoice.net_amount ?? invoice.netAmount) ||
    Math.max(Math.round((totals.total - tdsAmount) * 100) / 100, 0);

  const showCategory =
    showCategoryField &&
    isCategoryFeatureEnabled &&
    (formData.category_id || formData.category_name);

  const formatLineItemTax = (item) => {
    if (useInrTax) return item.tax || "-";
    const name = item.tax_name || item.tax || "Tax";
    const rate = item.tax_rate;
    if (rate === "" || rate === undefined || rate === null) return name;
    return `${name} ${rate}%`;
  };

  const formatLineItemDiscount = (item) => {
    if (isInvoiceLevelDiscount) return "-";
    const discount = parseNumericInput(item.discount, 0);
    if (!discount) return "-";
    return item.discount_type === "%"
      ? `${discount}%`
      : formatAmount(discount);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Vendor Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Vendor Name" value={formData.vendor_name} />
          <DetailField label="Bill Number" value={formData.invoice_number} mono />
          <DetailField label="Billing Date" value={formatDisplayDate(formData.invoice_date)} />
          <DetailField label="Due Date" value={formatDisplayDate(formData.due_date)} />
          <DetailField label="Currency" value={invoiceCurrency} mono />
          <DetailField label="Department" value={formData.department_name} />
          {showCategory && (
            <DetailField label="Category" value={formData.category_name} />
          )}
        </div>

        {formData.billing_address && (
          <DetailField label="Billing Address" value={formData.billing_address} />
        )}

        <div className="grid grid-cols-2 gap-3">
          <DetailField label="GST Treatment" value={formData.gst_treatment} />
          <DetailField label="GSTIN / Tax ID" value={formData.gstin} mono />
          <DetailField label="Source of Supply" value={formData.source_of_supply} />
          <DetailField label="Destination" value={formData.destination_of_supply} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Source" value={formData.source} />
          {formData.source === "Email" && (
            <DetailField label="Source Email" value={formData.source_email} />
          )}
        </div>

        <DetailField label="Discounts" value={formData.discounts_level} />
      </div>

      {formData.line_items?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Line Items</h3>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin-muted">
              <table className="min-w-[760px] w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-2 text-left font-medium min-w-[180px]">Item Description</th>
                    <th className="p-2 text-left font-medium w-[130px]">Tax</th>
                    <th className="p-2 text-left font-medium w-[50px]">Qty</th>
                    <th className="p-2 text-left font-medium w-[80px]">Rate</th>
                    {!isInvoiceLevelDiscount && (
                      <th className="p-2 text-left font-medium w-[80px]">Discount</th>
                    )}
                    <th className="p-2 text-left font-medium w-[90px]">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.line_items.map((item, index) => (
                    <tr key={index} className="border-b last:border-b-0 align-top">
                      <td className="p-2">
                        <p>{item.description || "-"}</p>
                        {item.hsn_sac && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            HSN: {item.hsn_sac}
                          </p>
                        )}
                      </td>
                      <td className="p-2">{formatLineItemTax(item)}</td>
                      <td className="p-2  ">{item.quantity ?? "-"}</td>
                      <td className="p-2  ">
                        {formatAmount(item.unit_rate ?? item.unit_price ?? 0)}
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
              {formData.invoice_discount
                ? ` (${formData.invoice_discount}${formData.invoice_discount_type === "%" ? "%" : ""})`
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

      <div className="pt-2 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4 shrink-0" />
          <span>
            Created by {invoice.created_by_name || "-"}
            {invoice.created_at
              ? ` on ${format(new Date(invoice.created_at), "dd MMM yyyy, hh:mm a")}`
              : ""}
          </span>
        </div>
      </div>
    </div>
  );
};

export default InvoiceReadOnlyDetails;
