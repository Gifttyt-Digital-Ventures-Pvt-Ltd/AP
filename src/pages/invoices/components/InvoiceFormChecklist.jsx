import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardList,
} from "lucide-react";
import { DEFAULT_CURRENCY } from "../../../utils/currency";
import {
  INVOICE_LEVEL,
  LINE_ITEM_MODE_SUMMARY_ONLY,
  isInrInvoiceCurrency,
} from "../utils/invoiceTax";

export const buildInvoiceFormChecklist = (
  formData,
  {
    departmentMandatory = false,
    categoryMandatory = false,
    showCategoryField = true,
    showCampaignField = false,
  } = {},
) => {
  if (!formData) return [];

  const extractedSnapshot = formData.extractedSnapshot || null;
  // True unless OCR extracted a value for this field AND the user has since
  // changed it to something else — i.e. only flags a real divergence.
  const matchesExtracted = (field, currentValue) => {
    if (!extractedSnapshot) return true;
    const extractedValue = String(extractedSnapshot[field] ?? "").trim();
    if (!extractedValue) return true;
    return String(currentValue ?? "").trim() === extractedValue;
  };
  const extractedMismatchHint = "differs from scanned invoice";

  const item = ({
    label,
    done,
    required = false,
    optional,
    hint,
    hidden = false,
    warn,
  }) => {
    const isOptional = optional ?? !required;
    const resolvedHint = hint ?? (isOptional ? "optional" : "required");

    return {
      label,
      done,
      required: !isOptional,
      optional: isOptional,
      hint: resolvedHint,
      hidden,
      warn: warn !== undefined ? warn : !isOptional && !done,
    };
  };

  const validLineItems = (formData.lineItems || []).filter(
    (item) => item.description?.trim() && Number(item.unitRate) > 0,
  );
  const allLineItemsValid =
    (formData.lineItems || []).length > 0 &&
    (formData.lineItems || []).every(
      (item) => item.description?.trim() && Number(item.unitRate) > 0,
    );
  const isSummaryOnlyInvoice =
    formData.lineItemMode === LINE_ITEM_MODE_SUMMARY_ONLY;
  const summaryAmountsValid =
    Number(formData.subTotal) >= 0 && Number(formData.totalTaxAmount) >= 0;

  const hasVendorName = !!formData.vendorName?.trim();
  const vendorUnmatched =
    hasVendorName &&
    !formData.vendorMatched &&
    !formData.vendorRequestSubmitted;
  const vendorResolved =
    !!formData.vendorMatched || !!formData.vendorRequestSubmitted;

  const useInrTax = isInrInvoiceCurrency(formData.currency);
  const isGstinRequired = useInrTax && formData.gstTreatment !== "N/A";
  const isInvoiceLevelTax = formData.taxesLevel === INVOICE_LEVEL; 

  const vendorNameMatches = matchesExtracted("vendorName", formData.vendorName);
  const vendorChecklistItems = [
    item({
      label: "Vendor name",
      done: hasVendorName && vendorNameMatches,
      required: true,
      hint: hasVendorName && !vendorNameMatches ? extractedMismatchHint : undefined,
    }),
  ];

  if (showCampaignField) {
    vendorChecklistItems.push(
      item({
        label: "Campaign",
        done: !!(formData.campaignId || formData.campaignName?.trim()),
        optional: true,
      }),
      item({
        label: "UAC/Reference No./Coupon Code",
        done: !!String(formData.referenceNumber ?? "").trim(),
        optional: true,
      }),
    );
  }

  if (hasVendorName) {
    vendorChecklistItems.push(
      item({
        label: vendorUnmatched
          ? "Vendor Name not matched"
          : "Vendor matched in system",
        done: vendorResolved,
        required: true,
        warn: vendorUnmatched,
        hint: vendorUnmatched ? "action needed" : undefined,
      }),
    );
  }

  const gstTreatmentMatches = matchesExtracted("gstTreatment", formData.gstTreatment);
  const gstinMatches = matchesExtracted("gstin", formData.gstin);
  const sourceOfSupplyMatches = matchesExtracted("sourceOfSupply", formData.sourceOfSupply);
  const destinationOfSupplyMatches = matchesExtracted(
    "destinationOfSupply",
    formData.destinationOfSupply,
  );
  const hasSourceOfSupply = !!String(formData.sourceOfSupply ?? "").trim();
  const hasDestinationOfSupply = !!String(formData.destinationOfSupply ?? "").trim();

  const taxComplianceItems = [
    item({
      label: "GST treatment",
      done: !!formData.gstTreatment && gstTreatmentMatches,
      required: true,
      hint: formData.gstTreatment && !gstTreatmentMatches ? extractedMismatchHint : undefined,
    }),
    item({
      label: useInrTax ? "GSTIN" : "GSTIN / Tax ID",
      done: !!formData.gstin?.trim() && gstinMatches,
      required: isGstinRequired,
      hint: formData.gstin?.trim() && !gstinMatches ? extractedMismatchHint : undefined,
      warn: (formData.gstin?.trim() && !gstinMatches) || undefined,
    }),
    item({
      label: "Source of supply",
      done: hasSourceOfSupply && sourceOfSupplyMatches,
      hint: hasSourceOfSupply && !sourceOfSupplyMatches ? extractedMismatchHint : undefined,
      warn: (hasSourceOfSupply && !sourceOfSupplyMatches) || undefined,
    }),
    item({
      label: "Destination",
      done: hasDestinationOfSupply && destinationOfSupplyMatches,
      hint: hasDestinationOfSupply && !destinationOfSupplyMatches ? extractedMismatchHint : undefined,
      warn: (hasDestinationOfSupply && !destinationOfSupplyMatches) || undefined,
    }),
  ];

  if (isInvoiceLevelTax) {
    if (useInrTax) {
      const invoiceTaxMatches = matchesExtracted("invoiceTax", formData.invoiceTax);
      taxComplianceItems.push(
        item({
          label: "Invoice tax",
          done: !!formData.invoiceTax?.trim() && invoiceTaxMatches,
          required: true,
          hint: formData.invoiceTax?.trim() && !invoiceTaxMatches ? extractedMismatchHint : undefined,
        }),
      );
    } else {
      const invoiceTaxNameMatches = matchesExtracted("invoiceTaxName", formData.invoiceTaxName);
      const invoiceTaxRateMatches = matchesExtracted("invoiceTaxRate", formData.invoiceTaxRate);
      const hasInvoiceTaxRate =
        formData.invoiceTaxRate !== "" &&
        formData.invoiceTaxRate !== null &&
        formData.invoiceTaxRate !== undefined;
      taxComplianceItems.push(
        item({
          label: "Tax name",
          done: !!String(formData.invoiceTaxName ?? "").trim() && invoiceTaxNameMatches,
          required: true,
          hint:
            String(formData.invoiceTaxName ?? "").trim() && !invoiceTaxNameMatches
              ? extractedMismatchHint
              : undefined,
        }),
        item({
          label: "Tax rate %",
          done: hasInvoiceTaxRate && invoiceTaxRateMatches,
          required: true,
          hint: hasInvoiceTaxRate && !invoiceTaxRateMatches ? extractedMismatchHint : undefined,
        }),
      );
    }
  }

  const invoiceNumberMatches = matchesExtracted("invoiceNumber", formData.invoiceNumber);
  const invoiceDateMatches = matchesExtracted("invoiceDate", formData.invoiceDate);
  const currencyValue = (formData.currency || DEFAULT_CURRENCY).trim();
  const currencyMatches = matchesExtracted("currency", currencyValue);

  return [
    {
      group: "Vendor",
      items: vendorChecklistItems,
    },
    {
      group: "Invoice details",
      items: [
        item({
          label: "Bill number",
          done: !!formData.invoiceNumber?.trim() && invoiceNumberMatches,
          required: true,
          hint:
            formData.invoiceNumber?.trim() && !invoiceNumberMatches
              ? extractedMismatchHint
              : undefined,
        }),
        item({
          label: "Billing date",
          done: !!formData.invoiceDate && invoiceDateMatches,
          required: true,
          hint: formData.invoiceDate && !invoiceDateMatches ? extractedMismatchHint : undefined,
        }),
        item({
          label: "Due date",
          done: !!formData.dueDate,
          required: false,
        }),
        item({
          label: "Currency",
          done: !!currencyValue && currencyMatches,
          required: true,
          hint: currencyValue && !currencyMatches ? extractedMismatchHint : undefined,
        }),
        /* Department checklist hidden during create/edit — restore when needed
        item({
          label: "Department",
          done: !!formData.departmentId,
          required: departmentMandatory,
        }),
        */
        item({
          label: "Category",
          done: !!(formData.categoryId || formData.category?.id),
          required: categoryMandatory,
          hidden: !showCategoryField,
        }),
      ],
    },
    {
      group: "Tax & compliance",
      items: taxComplianceItems,
    },
    {
      group: "Source",
      items: [
        item({
          label: "Source",
          done: !!formData.source,
          required: true,
        }),
      ],
    },
    {
      group: "Line items",
      items: [
        item({
          label:
            isSummaryOnlyInvoice
              ? "Summary amounts"
              : validLineItems.length === 0
              ? "At least one line item"
              : `${validLineItems.length} of ${formData.lineItems.length} item${formData.lineItems.length !== 1 ? "s" : ""} complete`,
          done: isSummaryOnlyInvoice ? summaryAmountsValid : allLineItemsValid,
          required: true,
        }),
      ],
    },
  ];
};

export const InvoiceChecklist = ({
  formData,
  departmentMandatory = false,
  categoryMandatory = false,
  showCategoryField = true,
  showCampaignField = false,
}) => {
  const [open, setOpen] = useState(true);

  const groups = useMemo(
    () =>
      buildInvoiceFormChecklist(formData, {
        departmentMandatory,
        categoryMandatory,
        showCategoryField,
        showCampaignField,
      }),
    [
      formData,
      departmentMandatory,
      categoryMandatory,
      showCategoryField,
      showCampaignField,
    ],
  );

  const allItems = groups.flatMap((group) =>
    group.items.filter((item) => !item.hidden && !item.optional),
  );
  const doneCount = allItems.filter((item) => item.done).length;
  const totalCount = allItems.length;
  const allDone = totalCount > 0 && doneCount === totalCount;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div
      className={`shrink-0 sticky top-0 transition-all duration-300 ease-in-out border border-border bg-card rounded-lg relative flex flex-col h-full ${
        open ? "w-[260px]" : "w-10 border-none bg-transparent"
      }`}
      style={{ minHeight: "200px" }}
    >
      {/* Collapse/Expand Toggle Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`absolute top-3 z-10 flex h-6 w-6 items-center justify-center rounded-md border border-border bg-white shadow-sm hover:bg-muted text-muted-foreground transition-all ${
          open ? "-left-3" : "left-2"
        }`}
        title={open ? "Collapse checklist" : "Expand checklist"}
      >
        {open ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="h-3 w-3"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="h-3 w-3"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        )}
      </button>

      {open ? (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
            <span className="text-xs font-semibold text-foreground">
              Invoice Checklist
            </span>
            <span
              className={`text-[10px] font-medium ${allDone ? "text-green-600" : "text-muted-foreground"}`}
            >
              {doneCount}/{totalCount}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-1 w-full bg-muted">
            <div
              className={`h-full transition-all duration-300 ${allDone ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Checklist Groups */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin-muted">
            {groups.map((group) => {
              const visibleItems = group.items.filter((item) => !item.hidden);
              if (visibleItems.length === 0) return null;
              return (
                <div key={group.group} className="space-y-1">
                  <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                    {group.group}
                  </span>
                  <div className="space-y-1">
                    {visibleItems.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-start gap-2 text-xs py-0.5"
                      >
                        {item.warn ? (
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        ) : item.done ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 mt-0.5" />
                        )}
                        <span
                          className={`leading-tight ${item.warn ? "text-amber-800" : item.done ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {item.label}
                          {item.hint && (
                            <span className="text-[9px] ml-1 text-muted-foreground">
                              ({item.hint})
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center pt-12 gap-2 text-foreground select-none">
          <ClipboardList className="h-4 w-4 text-primary animate-bounce" />
          <span className="text-[10px] font-black uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">
            Checklist ({doneCount}/{totalCount})
          </span>
        </div>
      )}
    </div>
  );
};

export default InvoiceChecklist;
