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
  LINE_ITEM_MODE_SUMMARY_ONLY,
  isInrInvoiceCurrency,
  isInvoiceLevelSelection,
} from "../utils/invoiceTax";
import { EXTRACTED_MISMATCH_HINT, matchesExtracted as matchesExtractedField } from "../utils/extractionComparison";

export const buildInvoiceFormChecklist = (
  formData,
  {
    departmentMandatory = false,
    categoryMandatory = false,
    showDepartmentField = true,
    showCategoryField = true,
    showBillingGst = false,
    billingGstRequired = false,
    canShowBranchField = false,
  } = {},
) => {
  if (!formData) return [];

  const extractedSnapshot = formData.extractedSnapshot || null;
  // True unless OCR extracted a value for this field AND the user has since
  // changed it to something else — i.e. only flags a real divergence.
  const matchesExtracted = (field, currentValue) =>
    matchesExtractedField(extractedSnapshot, field, currentValue);
  const extractedMismatchHint = EXTRACTED_MISMATCH_HINT;

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
  const hasVendorId = !!String(formData.vendorId ?? "").trim();
  const vendorUnmatched =
    hasVendorName &&
    !hasVendorId &&
    !formData.vendorMatched &&
    !formData.vendorRequestSubmitted;
  const vendorResolved =
    hasVendorId || !!formData.vendorMatched || !!formData.vendorRequestSubmitted;

  const useInrTax = isInrInvoiceCurrency(formData.currency);
  const isGstinRequired = useInrTax && formData.gstTreatment !== "N/A";
  const isInvoiceLevelTax = isInvoiceLevelSelection(formData.taxesLevel);

  // "Organization Name", "Vendor Selection & Matching", and "Vendor GST" all
  // suppress their hint tag (hint: "") to match the reference design showing
  // no (required)/(optional) label on those three — but Vendor GST still
  // carries real required/warn logic underneath (isGstinRequired, mismatch
  // detection), only the visible tag text is hidden. Organization Name has
  // no backing field at all, so it stays a pure placeholder (always done),
  // per explicit instruction not to validate it until a real field exists.
  const organizationChecklistItems = [
    item({ label: "Organization Name", done: true, hint: "" }),
    item({
      label: "Organization GST",
      done: !!String(formData.billingGstin ?? "").trim(),
      required: billingGstRequired,
      hidden: !showBillingGst,
    }),
    item({
      label: "Organization Branch",
      done: !!String(formData.branchCode ?? "").trim(),
      optional: true,
      hidden: !canShowBranchField,
    }),
    item({
      label: "Document Type",
      done: !!formData.documentType,
      required: true,
    }),
  ];

  const vendorNameMatches = matchesExtracted("vendorName", formData.vendorName);
  const gstTreatmentMatches = matchesExtracted("gstTreatment", formData.gstTreatment);
  const gstinMatches = matchesExtracted("gstin", formData.gstin);
  const hasVendorBranch =
    !!formData.vendorBranchCode?.trim() || !!formData.vendorBranchName?.trim();

  const vendorChecklistItems = [
    item({
      label: "Vendor Selection & Matching",
      done: vendorResolved,
      hint: "",
      warn: hasVendorName && vendorUnmatched,
    }),
    item({
      label: "Vendor Name",
      done: hasVendorName && vendorNameMatches,
      required: true,
      hint: hasVendorName && !vendorNameMatches ? extractedMismatchHint : undefined,
    }),
    item({
      label: "Vendor GST",
      done: !!formData.gstin?.trim() && gstinMatches,
      required: isGstinRequired,
      hint: formData.gstin?.trim() && !gstinMatches ? extractedMismatchHint : "",
      warn: (formData.gstin?.trim() && !gstinMatches) || undefined,
    }),
    item({
      label: "Vendor Branch",
      done: hasVendorBranch,
      optional: true,
    }),
    item({
      label: "GST Treatment",
      done: !!formData.gstTreatment && gstTreatmentMatches,
      required: true,
      hint: formData.gstTreatment && !gstTreatmentMatches ? extractedMismatchHint : undefined,
    }),
  ];

  const sourceOfSupplyMatches = matchesExtracted("sourceOfSupply", formData.sourceOfSupply);
  const destinationOfSupplyMatches = matchesExtracted(
    "destinationOfSupply",
    formData.destinationOfSupply,
  );
  const hasSourceOfSupply = !!String(formData.sourceOfSupply ?? "").trim();
  const hasDestinationOfSupply = !!String(formData.destinationOfSupply ?? "").trim();

  const taxComplianceItems = [];

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
  } else {
    // Tax defined per line item rather than once for the whole invoice —
    // without this branch taxComplianceItems stays empty and the whole
    // "Tax & Compliance" group disappears (AppDataTable-style groups hide
    // themselves when they have zero visible items). Still labeled
    // "Invoice tax" (matching the invoice-level branch above) even though
    // the underlying check is per line item, per explicit instruction to
    // keep one consistent label regardless of tax mode.
    //
    // Field checked mirrors InvoiceForm.jsx's own line-item tax column
    // exactly: INR invoices use a single `tax` dropdown (TAX_RATES options),
    // non-INR invoices split it into `taxName` + `taxRate` inputs instead —
    // these are two different fields, not two names for the same one.
    const lineItemsWithTax = validLineItems.filter((lineItem) =>
      useInrTax
        ? !!String(lineItem.tax ?? "").trim()
        : !!String(lineItem.taxName ?? "").trim() &&
          lineItem.taxRate !== "" &&
          lineItem.taxRate !== null &&
          lineItem.taxRate !== undefined,
    );
    const allLineItemTaxesValid =
      validLineItems.length > 0 && lineItemsWithTax.length === validLineItems.length;
    taxComplianceItems.push(
      item({
        label: "Invoice tax",
        done: allLineItemTaxesValid,
        required: true,
      }),
    );
  }

  const invoiceNumberMatches = matchesExtracted("invoiceNumber", formData.invoiceNumber);
  const invoiceDateMatches = matchesExtracted("invoiceDate", formData.invoiceDate);
  const currencyValue = (formData.currency || DEFAULT_CURRENCY).trim();
  const currencyMatches = matchesExtracted("currency", currencyValue);

  return [
    {
      group: "Org. Details",
      items: organizationChecklistItems,
    },
    {
      group: "Vendor Details",
      items: vendorChecklistItems,
    },
    {
      group: "Billing Details",
      items: [
        item({
          label: "Invoice/Bill Number",
          done: !!formData.invoiceNumber?.trim() && invoiceNumberMatches,
          required: true,
          hint:
            formData.invoiceNumber?.trim() && !invoiceNumberMatches
              ? extractedMismatchHint
              : undefined,
        }),
        item({
          label: "Billing Date",
          done: !!formData.invoiceDate && invoiceDateMatches,
          required: true,
          hint: formData.invoiceDate && !invoiceDateMatches ? extractedMismatchHint : undefined,
        }),
        item({
          label: "Due Date",
          done: !!formData.dueDate,
          optional: true,
        }),
        item({
          label: "Billing Address",
          done: !!String(formData.billingAddress ?? "").trim(),
          optional: true,
        }),
        item({
          label: "Shipping Address",
          done: !!String(formData.shippingAddress ?? "").trim(),
          optional: true,
        }),
        item({
          label: "Source of supply",
          done: hasSourceOfSupply && sourceOfSupplyMatches,
          optional: true,
          hint: hasSourceOfSupply && !sourceOfSupplyMatches ? extractedMismatchHint : undefined,
          warn: (hasSourceOfSupply && !sourceOfSupplyMatches) || undefined,
        }),
        item({
          label: "Destination",
          done: hasDestinationOfSupply && destinationOfSupplyMatches,
          optional: true,
          hint: hasDestinationOfSupply && !destinationOfSupplyMatches ? extractedMismatchHint : undefined,
          warn: (hasDestinationOfSupply && !destinationOfSupplyMatches) || undefined,
        }),
        item({
          label: "Category",
          done: !!(formData.categoryId || formData.category?.id),
          required: categoryMandatory,
          hidden: !showCategoryField,
        }),
        item({
          label: "Department",
          done: !!formData.departmentId,
          required: departmentMandatory,
          hidden: !showDepartmentField,
        }),
      ],
    },
    {
      group: "Line items",
      items: [
        item({
          label: "Currency",
          done: !!currencyValue && currencyMatches,
          required: true,
          hint: currencyValue && !currencyMatches ? extractedMismatchHint : undefined,
        }),
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
    {
      group: "Tax & Compliance",
      items: taxComplianceItems,
    },
  ];
};

export const InvoiceChecklist = ({
  formData,
  departmentMandatory = false,
  categoryMandatory = false,
  showDepartmentField = true,
  showCategoryField = true,
  showBillingGst = false,
  billingGstRequired = false,
  canShowBranchField = false,
}) => {
  const [open, setOpen] = useState(true);

  const groups = useMemo(
    () =>
      buildInvoiceFormChecklist(formData, {
        departmentMandatory,
        categoryMandatory,
        showDepartmentField,
        showCategoryField,
        showBillingGst,
        billingGstRequired,
        canShowBranchField,
      }),
    [
      formData,
      departmentMandatory,
      categoryMandatory,
      showDepartmentField,
      showCategoryField,
      showBillingGst,
      billingGstRequired,
      canShowBranchField,
    ],
  );

  const allItems = groups.flatMap((group) =>
    group.items.filter((item) => !item.hidden),
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
