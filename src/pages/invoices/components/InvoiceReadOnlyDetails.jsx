import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Label } from "../../../components/ui/label";
import { formatCurrency, normalizeCurrencyCode } from "../../../utils/currency";
import { useGetInvoiceTdsPreviewQuery } from "../../../Services/apis/taxApi";
import useTdsSubscription from "../../../hooks/useTdsSubscription";
import { TAX_RATES } from "../constants";
import { buildInvoiceEditFormData } from "../utils/invoiceFormData";
import {
  calculateInvoiceTotals,
  formatInrTaxPercent,
  INVOICE_LEVEL,
  isInrInvoiceCurrency,
  isInvoiceLevelSelection,
  isLineItemLevelSelection,
  LINE_ITEM_MODE_SUMMARY_ONLY,
  parseTaxRateFromLabel,
  resolveLineItemSubtotal,
} from "../utils/invoiceTax";
import { parseNumericInput } from "../utils/numericInput";
import { formatTdsDisplayLabel, resolveTdsRate } from "../utils/tds";
import LineItemsSummary, { LineItemsSectionHeader } from "./LineItemsSummary";
import MsmePaymentDueBadge from "./MsmePaymentDueBadge";
import InvoiceDueDateIndicators from "./InvoiceDueDateIndicators";
import {
  normalizeMsmePaymentDue,
} from "../utils/msmePaymentDue";
import { computeLineItemsSummary, resolveLineItemsExpanded } from "../utils/lineItemsSummary";
import { Button } from "../../../components/ui/button";
import { Link2 } from "lucide-react";
import {
  canMapTaxInvoiceToProforma,
  getDocumentTypeLabel,
  isProformaInvoice,
} from "../constants/proformaInvoice";
import { resolveLinkedTaxInvoiceRecords } from "../utils/proformaInvoiceListing";
import InvoiceLinkedTaxInvoicesPanel from "./InvoiceLinkedTaxInvoicesPanel";
import {
  getTdsPreviewAmount,
  getTdsPreviewNetPayable,
} from "./TdsBreakdownPanel";
import AppDataTable from "../../../components/common/AppDataTable";
import { TableCell, TableRow } from "../../../components/ui/table";
import { cn } from "../../../lib/utils";

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

const computeTdsAmount = (lineItems = [], tdsValue = "", subTotalOverride, tdsRateOverride = null) => {
  const tdsRate = resolveTdsRate(tdsValue, tdsRateOverride);
  if (!tdsRate) return 0;
  const subTotal =
    subTotalOverride ??
    (lineItems || []).reduce((sum, item) => sum + resolveLineItemSubtotal(item), 0);
  return Math.round(((subTotal * tdsRate) / 100) * 100) / 100;
};

const InvoiceReadOnlyDetails = ({
  invoice,
  showCategoryField = true,
  showCampaignField = false,
  showRefNoField = false,
  findVendorByName,
  findVendorById,
  isCategoryFeatureEnabled = true,
  isCampaignFeatureEnabled = false,
  showProformaInvoiceFields = false,
  showErpIntegrationFields = false,
  onMapTaxInvoice,
  onViewLinkedInvoice,
  allInvoices = [],
  getStatusBadgeClass,
  canCancelLinkedInvoice = false,
  onCancelLinkedInvoice,
}) => {
  const formData = useMemo(
    () =>
      buildInvoiceEditFormData(invoice, {
        isCategoryFeatureEnabled,
        isCampaignFeatureEnabled,
        findVendorByName,
        findVendorById,
      }),
    [
      invoice,
      isCategoryFeatureEnabled,
      isCampaignFeatureEnabled,
      findVendorByName,
      findVendorById,
    ],
  );

  const persistedShowLineItems = resolveLineItemsExpanded(formData ?? invoice ?? {});
  const [showLineItems, setShowLineItems] = useState(persistedShowLineItems);

  useEffect(() => {
    setShowLineItems(resolveLineItemsExpanded(formData ?? {}));
  }, [invoice?.id, formData?.lineItemsExpanded]);

  const { isTdsSubscriptionEnabled } = useTdsSubscription();
  const invoiceIdForTdsPreview = invoice?.id ?? invoice?.invoiceId;
  const readOnlyTdsSectionCode =
    invoice?.tdsSectionCode ??
    invoice?.tds_section_code ??
    invoice?.sectionCode ??
    invoice?.section_code;
  const readOnlyTdsRate = invoice?.tdsRate ?? invoice?.tds_rate;
  const {
    data: tdsPreview,
    isFetching: tdsPreviewLoading,
    isError: tdsPreviewError,
    refetch: refetchTdsPreview,
  } = useGetInvoiceTdsPreviewQuery(
    {
      invoiceId: invoiceIdForTdsPreview,
      sectionCode: readOnlyTdsSectionCode,
      rateOverride: readOnlyTdsRate,
    },
    { skip: !isTdsSubscriptionEnabled || !invoiceIdForTdsPreview || !readOnlyTdsSectionCode },
  );

  if (!formData) return null;

  const msmePaymentDue = normalizeMsmePaymentDue(invoice);
  const invoiceCurrency = normalizeCurrencyCode(formData.currency);
  const useInrTax = isInrInvoiceCurrency(invoiceCurrency);
  const isSummaryOnlyInvoice =
    formData.lineItemMode === LINE_ITEM_MODE_SUMMARY_ONLY;
  const isInvoiceLevelDiscount = isInvoiceLevelSelection(formData.discountsLevel);
  const isInvoiceLevelTax = isInvoiceLevelSelection(formData.taxesLevel);
  const showLineItemDiscount = isLineItemLevelSelection(formData.discountsLevel);
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

  const summarySubTotal = parseNumericInput(formData.subTotal, 0);
  const summaryTaxAmount = parseNumericInput(formData.totalTaxAmount, 0);
  const summaryRoundOff = parseNumericInput(
    formData.roundOff ??
      formData.round_off ??
      formData.roundoff ??
      invoice.roundOff ??
      invoice.round_off ??
      invoice.roundoff,
    0,
  );
  const summaryDiscountValue = parseNumericInput(formData.invoiceDiscount, 0);
  const summaryInvoiceDiscountAmount =
    isInvoiceLevelSelection(formData.discountsLevel)
      ? formData.invoiceDiscountType === "%"
        ? (summarySubTotal * summaryDiscountValue) / 100
        : summaryDiscountValue
      : 0;
  const boundedSummaryDiscountAmount = Math.max(
    0,
    Math.min(summaryInvoiceDiscountAmount, summarySubTotal),
  );
  const summaryTaxableSubTotal = summarySubTotal - boundedSummaryDiscountAmount;
  const totals = isSummaryOnlyInvoice
    ? {
        subTotal: summaryTaxableSubTotal,
        subTotalBeforeDiscount: summarySubTotal,
        cgst: 0,
        sgst: 0,
        igst: useInrTax ? summaryTaxAmount : 0,
        inrTaxes: useInrTax && summaryTaxAmount > 0
          ? [{ name: "Total Tax", rate: 0, amount: summaryTaxAmount }]
          : [],
        foreignTax: useInrTax ? 0 : summaryTaxAmount,
        foreignTaxes: !useInrTax && summaryTaxAmount > 0
          ? [{ name: formData.invoiceTaxName || "Tax", rate: 0, amount: summaryTaxAmount }]
          : [],
        invoiceDiscountAmount: boundedSummaryDiscountAmount,
        roundOff: summaryRoundOff,
        total: summaryTaxableSubTotal + summaryTaxAmount + summaryRoundOff,
      }
    : calculateInvoiceTotals({
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
        roundOff:
          formData.roundOff ??
          formData.round_off ??
          formData.roundoff ??
          invoice.roundOff ??
          invoice.round_off ??
          invoice.roundoff,
        invoiceTotal:
          formData.scannedTotal ??
          formData.invoiceTotal ??
          invoice.totalAmount ??
          invoice.total_amount,
      });

  const tdsAmountFromRate = computeTdsAmount(
    formData.lineItems,
    formData.tds,
    isInvoiceLevelDiscount ? totals.subTotalBeforeDiscount : totals.subTotal,
    formData.tdsRate,
  );
  const fallbackTdsAmount =
    tdsAmountFromRate ||
    Number(invoice.tdsAmount ?? invoice.tds_amount ?? 0) ||
    0;
  const tdsAmount = getTdsPreviewAmount(tdsPreview, fallbackTdsAmount);
  const totalTax = useInrTax
    ? (Number(totals.cgst) || 0) + (Number(totals.sgst) || 0) + (Number(totals.igst) || 0)
    : (totals.foreignTaxes || []).reduce(
        (sum, entry) => sum + (Number(entry.amount) || 0),
        0,
      );
  const roundOffValue =
    formData.roundOff ??
    formData.round_off ??
    formData.roundoff ??
    invoice.roundOff ??
    invoice.round_off ??
    invoice.roundoff;
  const hasRoundOff =
    roundOffValue !== undefined &&
    roundOffValue !== null &&
    roundOffValue !== "" &&
    Number.isFinite(Number(roundOffValue));
  const fallbackNetPayable =
    Number(
      invoice.netAmount ??
        invoice.net_amount ??
        invoice.totalAmount ??
        invoice.total_amount,
    ) ||
    Math.max(Math.round((totals.total - tdsAmount) * 100) / 100, 0);
  const netPayable = getTdsPreviewNetPayable(tdsPreview, fallbackNetPayable);
  const tdsLabel = formatTdsDisplayLabel({
    tds: formData.tds,
    tdsSectionCode: formData.tdsSectionCode,
    tdsRate: formData.tdsRate,
  });

  const showCategory =
    showCategoryField &&
    isCategoryFeatureEnabled &&
    (formData.categoryId || formData.categoryName);

  const showCampaign =
    showCampaignField &&
    isCampaignFeatureEnabled &&
    (formData.campaignId || formData.campaignName || formData.referenceNumber);

  const getInrTaxDisplayLabel = (taxValue) =>
    TAX_RATES.find((entry) => entry.value === taxValue)?.label || taxValue || "-";

  const formatLineItemTax = (item) => {
    if (useInrTax) return getInrTaxDisplayLabel(item.tax);
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

  const hasLineAmountValue = (value) =>
    value !== undefined && value !== null && value !== "";

  const getLineItemTaxAmount = (item) => {
    if (hasLineAmountValue(item.taxAmount)) return parseNumericInput(item.taxAmount, 0);
    const taxableAmount = calculateLineItemSubtotal(item);
    const rate = useInrTax
      ? parseTaxRateFromLabel(item.tax)
      : (Number(item.taxRate) || parseTaxRateFromLabel(item.tax) || 0);
    return (taxableAmount * rate) / 100;
  };

  const getLineItemNetAmount = (item) => {
    if (hasLineAmountValue(item.netAmount)) return parseNumericInput(item.netAmount, 0);
    const taxableAmount = calculateLineItemSubtotal(item);
    const taxAmount = isInvoiceLevelTax ? 0 : getLineItemTaxAmount(item);
    return taxableAmount + taxAmount;
  };

  const readOnlyLineItemHeaders = (() => {
    const headers = [
      {
        key: "description",
        title: "Item Description",
        headerClassName: "w-[300px]",
        cellClassName: "w-[300px] align-top",
      },
    ];
    if (showErpIntegrationFields) {
      headers.push(
        {
          key: "accountGroup",
          title: "Group / Branch",
          headerClassName: "w-[160px]",
          cellClassName: "w-[160px] align-top",
        },
        {
          key: "expenseType",
          title: "Expense Type",
          headerClassName: "w-[130px]",
          cellClassName: "w-[130px] align-top",
        },
      );
    }
    if (!isInvoiceLevelTax) {
      headers.push({
        key: "tax",
        title: "Tax",
        headerClassName: "w-[130px]",
        cellClassName: "w-[130px] align-top",
      });
    }
    headers.push(
      {
        key: "quantity",
        title: "Qty",
        headerClassName: "w-[50px]",
        cellClassName: "w-[50px] align-top",
      },
      {
        key: "unitRate",
        title: "Rate",
        headerClassName: "w-[80px]",
        cellClassName: "w-[80px] align-top",
      },
    );
    if (showLineItemDiscount) {
      headers.push({
        key: "discount",
        title: "Discount",
        headerClassName: "w-[80px]",
        cellClassName: "w-[80px] align-top",
      });
    }
    headers.push({
      key: "subtotal",
      title: isInvoiceLevelTax ? "Net Amount" : "Taxable Amount",
      headerClassName: "w-[90px]",
      cellClassName: "w-[90px] align-top font-semibold",
    });
    if (!isInvoiceLevelTax) {
      headers.push(
        {
          key: "taxAmount",
          title: "Tax Amount",
          headerClassName: "w-[90px]",
          cellClassName: "w-[90px] align-top",
        },
        {
          key: "netAmount",
          title: "Net Amount",
          headerClassName: "w-[90px]",
          cellClassName: "w-[90px] align-top",
        },
      );
    }
    return headers;
  })();

  const renderReadOnlyLineItemRow = (item, index, headers) => (
    <TableRow key={item.id ?? index} className="border-b last:border-b-0 align-top">
      {headers.map((header) => {
        let value;
        switch (header.key) {
          case "description":
            value = (
              <div>
                <p>{item.description || "-"}</p>
                {item.hsnSac && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    HSN: {item.hsnSac}
                  </p>
                )}
              </div>
            );
            break;
          case "accountGroup":
            value = item.accountGroupName || item.groupName || item.ledger || "-";
            break;
          case "expenseType":
            value = item.expenseType || "-";
            break;
          case "tax":
            value = formatLineItemTax(item);
            break;
          case "quantity":
            value = item.quantity ?? "-";
            break;
          case "unitRate":
            value = formatAmount(item.unitRate ?? item.unitPrice ?? 0);
            break;
          case "discount":
            value = formatLineItemDiscount(item);
            break;
          case "subtotal":
            value = formatAmount(calculateLineItemSubtotal(item));
            break;
          case "taxAmount":
            value = formatAmount(getLineItemTaxAmount(item));
            break;
          case "netAmount":
            value = formatAmount(getLineItemNetAmount(item));
            break;
          default:
            value = item?.[header.key] ?? "-";
        }
        return (
          <TableCell
            key={header.key}
            className={cn("border border-border px-2 py-2 text-xs", header.cellClassName)}
          >
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  const lineItemsSummary = computeLineItemsSummary({
    lineItems: formData.lineItems,
    calculateLineItemSubtotal,
    isInvoiceLevelTax,
    useInrTax,
  });
  const removedLineItemsCount = Number(formData.removedLineItemsCount || 0);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Vendor Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Vendor Name" value={formData.vendorName} />
          <DetailField label="Bill Number" value={formData.invoiceNumber} mono />
          {showRefNoField && (
            <DetailField label="Ref No" value={invoice?.refNo} mono />
          )}
          <DetailField label="Billing Date" value={formatDisplayDate(formData.invoiceDate)} />
          <div>
            <DetailField label="Due Date" value={formatDisplayDate(formData.dueDate)} />
            <InvoiceDueDateIndicators invoice={invoice} className="mt-1" />
            {msmePaymentDue.vendorIsMsme && msmePaymentDue.msmeMaxDueDate ? (
              <p className="mt-1 text-xs text-muted-foreground">
                MSME max due date: {formatDisplayDate(msmePaymentDue.msmeMaxDueDate)}
              </p>
            ) : null}
          </div>
          <DetailField label="Currency" value={invoiceCurrency} mono />
          <DetailField label="Department" value={formData.departmentName} />
          {showCategory && (
            <DetailField label="Category" value={formData.categoryName} />
          )}
          {showCampaign && (
            <>
              <DetailField label="Campaign" value={formData.campaignName} />
              <DetailField
                label="UAC/Reference No./Coupon Code"
                value={formData.referenceNumber}
                mono
              />
            </>
          )}
        </div>

        {formData.billingAddress && (
          <DetailField label="Billing Address" value={formData.billingAddress} />
        )}

        <div className="grid grid-cols-2 gap-3">
          <DetailField label="GST Treatment" value={formData.gstTreatment} />
          <DetailField
            label="Branch"
            value={
              formData.branchName && formData.branchCode
                ? `${formData.branchName} (${formData.branchCode})`
                : formData.branchName || formData.branchCode
            }
          />
          {(formData.vendorBranchName || formData.vendorBranchCode) && (
            <DetailField
              label="Vendor Branch"
              value={
                formData.vendorBranchName && formData.vendorBranchCode
                  ? `${formData.vendorBranchName} (${formData.vendorBranchCode})`
                  : formData.vendorBranchName || formData.vendorBranchCode
              }
            />
          )}
          <DetailField label="Billing GSTIN" value={formData.billingGstin} mono />
          <DetailField label="GSTIN / Tax ID" value={formData.gstin} mono />
          <DetailField label="Source of Supply" value={formData.sourceOfSupply} />
          <DetailField label="Destination" value={formData.destinationOfSupply} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Source" value={formData.source} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Discounts" value={formData.discountsLevel} />
          <DetailField label="Taxes" value={formData.taxesLevel} />
        </div>
      </div>

      {(formData.lineItems?.length > 0 || isSummaryOnlyInvoice) && (
        <div className="space-y-3">
          <LineItemsSectionHeader
            showLineItems={showLineItems}
            onToggle={() => setShowLineItems((prev) => !prev)}
            itemCount={formData.lineItems.length}
            summaryOnly={isSummaryOnlyInvoice}
          />
          {isSummaryOnlyInvoice ? (
            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="text-xs text-muted-foreground">
                Individual line items have been removed.
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-xs text-muted-foreground">Total Line Items</Label>
                  <p className="text-sm font-medium text-right">{removedLineItemsCount}</p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-xs text-muted-foreground">Subtotal</Label>
                  <p className="text-sm font-medium text-right">
                    {formatAmount(totals.subTotalBeforeDiscount ?? totals.subTotal)}
                  </p>
                </div>
                {(isSummaryOnlyInvoice || isInvoiceLevelDiscount) && (
                  <div className="flex items-center justify-between gap-4">
                    <Label className="text-xs text-muted-foreground">Discount</Label>
                    <p className="text-sm font-medium text-right">
                      -{formatAmount(totals.invoiceDiscountAmount || 0)}
                    </p>
                  </div>
                )}
                {!isInvoiceLevelTax && (
                  <div className="flex items-center justify-between gap-4">
                    <Label className="text-xs text-muted-foreground">Total Tax Amount</Label>
                    <p className="text-sm font-medium text-right">{formatAmount(totalTax)}</p>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-xs text-muted-foreground">Invoice Total</Label>
                  <p className="text-sm font-semibold text-right">{formatAmount(totals.total)}</p>
                </div>
              </div>
            </div>
          ) : showLineItems ? (
            <div className="border rounded-lg overflow-hidden">
              <AppDataTable
                tableHeader={readOnlyLineItemHeaders}
                tableData={formData.lineItems}
                renderRow={renderReadOnlyLineItemRow}
                tableClassName="min-w-[980px] table-fixed border-separate border-spacing-0 text-xs"
                tableContainerClassName="overflow-x-auto scrollbar-thin-muted"
                headClassName="border-b bg-gray-50"
                stickyHeader={false}
                striped={false}
                bordered
                emptyMessage="No line items found"
              />
            </div>
          ) : (
            <LineItemsSummary
              summary={lineItemsSummary}
              formatAmount={formatAmount}
              isInvoiceLevelTax={isInvoiceLevelTax}
            />
          )}
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
        {!isSummaryOnlyInvoice && useInrTax &&
          totals.inrTaxes?.map((entry) => (
            <div key={`${entry.name}-${entry.rate}`} className="flex justify-between text-xs">
              <span>
                {entry.name}
                {entry.rate > 0 ? ` ${formatInrTaxPercent(entry.rate)}` : ""}
              </span>
              <span className=" ">{formatAmount(entry.amount)}</span>
            </div>
          ))}
        {!isSummaryOnlyInvoice && !useInrTax &&
          totals.foreignTaxes?.map((entry) => (
            <div key={`${entry.name}-${entry.rate}`} className="flex justify-between text-xs">
              <span>
                {entry.name}
                {entry.rate > 0 ? ` ${entry.rate}%` : ""}
              </span>
              <span className=" ">{formatAmount(entry.amount)}</span>
            </div>
          ))}
        <div className="flex justify-between text-xs">
          <span>Total Tax</span>
          <span className="font-medium">{formatAmount(totalTax)}</span>
        </div>
        {hasRoundOff && (
          <div className="flex justify-between text-xs">
            <span>Round Off</span>
            <span className=" ">{formatAmount(Number(roundOffValue))}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-1.5 border-t text-xs">
          <span>TDS{tdsLabel ? ` (${tdsLabel})` : ""}</span>
          <span className=" ">{formatAmount(tdsAmount)}</span>
        </div>
        <div className="flex justify-between text-sm pt-1.5 border-t">
          <span>{isSummaryOnlyInvoice ? "Line Items Total" : "Total"}</span>
          <span className=" ">{formatAmount(totals.total)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold pt-1.5 border-t">
          <span>Net Payable</span>
          <span className="  text-primary">
            {formatAmount(netPayable)}
          </span>
        </div>
      </div>

      {showProformaInvoiceFields && isProformaInvoice(invoice) && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Linked Tax Invoices</h3>
            {onMapTaxInvoice && canMapTaxInvoiceToProforma(invoice) && (
              <Button size="sm" variant="outline" onClick={() => onMapTaxInvoice(invoice)}>
                <Link2 className="h-4 w-4 mr-2" />
                Map Tax Invoice
              </Button>
            )}
          </div>
          {onMapTaxInvoice &&
            isProformaInvoice(invoice) &&
            !canMapTaxInvoiceToProforma(invoice) && (
              <p className="text-sm text-amber-700">
                This Proforma Invoice must be Approved before you can map tax invoices.
              </p>
            )}
          <InvoiceLinkedTaxInvoicesPanel
            linkedInvoices={resolveLinkedTaxInvoiceRecords(invoice, allInvoices)}
            onViewInvoice={onViewLinkedInvoice}
            onCancelLinkedInvoice={
              onCancelLinkedInvoice
                ? (linkedInvoice) => onCancelLinkedInvoice(linkedInvoice)
                : undefined
            }
            canCancelLinkedInvoice={canCancelLinkedInvoice}
            getStatusBadgeClass={getStatusBadgeClass}
            title=""
          />
          <DetailField label="Document Type" value={getDocumentTypeLabel(invoice)} />
          {invoice.piRemainingBalance != null && (
            <DetailField
              label="Remaining PI Balance"
              value={formatCurrency(invoice.piRemainingBalance, formData.currency)}
            />
          )}
        </div>
      )}

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
