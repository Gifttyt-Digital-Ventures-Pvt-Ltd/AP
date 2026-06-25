import React, { useEffect, useMemo, useRef, useState } from "react";
import { Building2, CheckCircle2, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "../../../components/ui/popover";
import { cn } from "../../../lib/utils";
import { TableCell, TableRow } from "../../../components/ui/table";
import AppDataTable from "../../../components/common/AppDataTable";
import AppSelect from "../../../components/common/AppSelect";
import {
  DEFAULT_CURRENCY,
  FALLBACK_CURRENCIES,
  formatCurrency,
  mergeCurrencyOptions,
  normalizeCurrencyCode,
} from "../../../utils/currency";
import {
  DEFAULT_INR_TAX,
  INVOICE_LEVEL,
  isInrInvoiceCurrency,
  LINE_ITEM_LEVEL,
  parseTaxRateFromLabel,
  remapLineItemsForCurrencyChange,
} from "../utils/invoiceTax";
import {
  formatNumericInputValue,
  sanitizeNumericInput,
} from "../utils/numericInput";
import InvoiceChecklist from "./InvoiceFormChecklist";
import InvoiceCampaignFields from "./InvoiceCampaignFields";
import LineItemsSummary, { LineItemsSectionHeader } from "./LineItemsSummary";
import {
  computeLineItemsSummary,
  resolveLineItemsExpanded,
} from "../utils/lineItemsSummary";
import {
  useGetOrganisationGstCredentialsQuery,
} from "../../../Services/apis/taxApi";
import {
  useGetAvailableGrnsQuery,
  useGetAvailablePurchaseOrdersQuery,
} from "../../../Services/apis/invoiceMatchingApi";
import {
  formatTdsDisplayLabel,
  resolveTdsRate,
} from "../utils/tds";
import { buildInvoiceTdsStateFromVendor } from "../../vendors/utils/vendorTds";
import TdsSelectionField from "./TdsSelectionField";
import InvoiceDueDateIndicators from "./InvoiceDueDateIndicators";
import {
  computeMsmeMaxDueDate,
  normalizeDueDateForInvoice,
  normalizeMsmePaymentDue,
} from "../utils/msmePaymentDue";

const lineItemTableHeader = [
  {
    key: "description",
    title: "Item Description",
    headerClassName: "min-w-[190px]",
    cellClassName: "min-w-[190px] align-top",
  },
  // { key: "ledger", title: "Ledger", headerClassName: "w-[160px]", cellClassName: "w-[200px]" },
  {
    key: "tax",
    title: "Tax",
    headerClassName: "w-[150px]",
    cellClassName: "w-[200px] align-top",
  },
  {
    key: "quantity",
    title: "Qty",
    headerClassName: "w-[60px] text-left",
    cellClassName: "w-[60px] align-top min-w-[60px]",
  },
  {
    key: "unitRate",
    title: "Rate",
    headerClassName: "w-[100px] text-left",
    cellClassName: "w-[100px] align-top min-w-[100px]",
  },
  {
    key: "discount",
    title: "Discount",
    headerClassName: "w-[120px] text-left",
    cellClassName: "w-[120px] align-top",
  },
  {
    key: "subtotal",
    title: "Taxable Amount",
    headerClassName: "w-[100px] text-left",
    cellClassName: "w-[100px] text-left align-top pt-3.5",
  },
  {
    key: "taxAmount",
    title: "Tax Amount",
    headerClassName: "w-[100px] text-left",
    cellClassName: "w-[100px] text-left align-top pt-3.5",
  },
  {
    key: "netAmount",
    title: "Net Amount",
    headerClassName: "w-[100px] text-left",
    cellClassName: "w-[100px] text-left align-top pt-3.5",
  },
  {
    key: "actions",
    title: "",
    headerClassName: "w-[32px]",
    cellClassName: "w-[32px] text-center pt-3.5 align-top",
  },
];

const lineItemSelectClassName =
  "h-7 w-full rounded border bg-white pl-2 pr-7 text-xs";

const RequiredLabel = ({ children, required = false, className = "" }) => (
  <Label className={cn("text-xs", required && "text-blue-400", className)}>
    {required ? "* " : ""}
    {children}
  </Label>
);

const resolveRoundOff = (data = {}) =>
  data.roundOff ?? data.round_off ?? data.roundoff;

const getPageContent = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.purchaseOrders)) return response.purchaseOrders;
  if (Array.isArray(response?.grns)) return response.grns;
  return [];
};

const normalizePurchaseOrderOption = (po = {}) => ({
  ...po,
  id: po.id ?? po.poId ?? po.po_id ?? po.purchaseOrderId ?? po.purchase_order_id,
  poNumber: po.poNumber ?? po.po_number ?? po.number ?? "",
  amount: Number(po.amount ?? po.poAmount ?? po.po_amount ?? 0),
  currency: po.currency ?? DEFAULT_CURRENCY,
});

const normalizeGrnOption = (grn = {}) => ({
  ...grn,
  id: grn.id ?? grn.grnId ?? grn.grn_id,
  grnNumber: grn.grnNumber ?? grn.grn_number ?? grn.number ?? "",
  amount: Number(grn.amount ?? grn.grnAmount ?? grn.grn_amount ?? 0),
  currency: grn.currency ?? DEFAULT_CURRENCY,
});

export const InvoiceForm = ({
  formData,
  setFormData,
  isEdit = false,
  hideActions = false,
  isSavedDraft = false,
  calculateTotals,
  findVendorByName,
  findVendorById,
  handleAddVendorFromInvoice,
  updateLineItem,
  removeLineItem,
  addLineItem,
  calculateLineItemSubtotal,
  setEditDialogOpen,
  setUploadedFile,
  setUploadedFileURL,
  setActiveTab,
  handleUpdateInvoice,
  handleAddInvoice,
  isSubmitting = false,
  canAddVendor = true,
  canSubmit = true,
  vendorOptions = [],
  departments = [],
  invoiceCategories = [],
  invoiceCategoriesLoading = false,
  showCategoryField = true,
  showCampaignField = false,
  lockedCampaign = false,
  lockedCampaignPrefill = null,
  departmentMandatory = false,
  categoryMandatory = false,
  currencyOptions = [],
  GST_TREATMENTS,
  INDIAN_STATES,
  INVOICE_SOURCES,
  LEDGER_OPTIONS,
  TAX_RATES,
  showBillingGst = false,
  requireBillingGst = false,
  showInvoiceMatching = false,
  canUseThreeWayMatching = false,
}) => {
  const {
    data: organisationGstCredentials = [],
    isLoading: organisationGstLoading,
    isFetching: organisationGstFetching,
    isError: organisationGstError,
  } = useGetOrganisationGstCredentialsQuery(undefined, {
    skip: !showBillingGst,
  });
  const [vendorPickerOpen, setVendorPickerOpen] = useState(false);
  const [vendorQuery, setVendorQuery] = useState("");
  const vendorAnchorRef = useRef(null);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [currencyQuery, setCurrencyQuery] = useState("");

  const filteredVendorOptions = useMemo(() => {
    const query = String(vendorQuery || "")
      .toLowerCase()
      .trim();
    const options = Array.isArray(vendorOptions) ? vendorOptions : [];
    if (!query) return options;
    return options.filter((vendor) =>
      String(vendor?.name || "")
        .toLowerCase()
        .includes(query),
    );
  }, [vendorOptions, vendorQuery]);

  const selectedVendor = useMemo(() => {
    if (formData?.vendorId && typeof findVendorById === "function") {
      return findVendorById(formData.vendorId);
    }
    if (formData?.vendorName && typeof findVendorByName === "function") {
      return findVendorByName(formData.vendorName);
    }
    return null;
  }, [formData?.vendorId, formData?.vendorName, findVendorById, findVendorByName]);

  const msmePaymentDue = normalizeMsmePaymentDue(formData);
  const vendorIsMsme = Boolean(selectedVendor?.msme) || msmePaymentDue.vendorIsMsme;
  const msmeMaxDueDate = vendorIsMsme ? computeMsmeMaxDueDate(formData?.invoiceDate) : "";

  const resolvedCurrencyOptions = useMemo(
    () =>
      mergeCurrencyOptions(
        currencyOptions,
        FALLBACK_CURRENCIES,
        formData?.currency,
      ),
    [currencyOptions, formData?.currency],
  );

  const filteredCurrencyOptions = useMemo(() => {
    const query = String(currencyQuery || "")
      .toUpperCase()
      .trim();
    if (!query) return resolvedCurrencyOptions;
    return resolvedCurrencyOptions.filter((code) => code.includes(query));
  }, [currencyQuery, resolvedCurrencyOptions]);

  const applyInvoiceCurrencyChange = (currency) => {
    const normalized = normalizeCurrencyCode(currency);
    setFormData((prev) => {
      if (!prev) return prev;
      const currentCurrency = prev.currency || DEFAULT_CURRENCY;
      const switchingTaxMode =
        isInrInvoiceCurrency(currentCurrency) !==
        isInrInvoiceCurrency(normalized);
      const nextUseInrTax = isInrInvoiceCurrency(normalized);
      return {
        ...prev,
        currency: normalized,
        gstTreatment: nextUseInrTax
          ? prev.gstTreatment === "N/A"
            ? "Regular"
            : prev.gstTreatment
          : "N/A",
        scannedTaxAmount: undefined,
        scannedTaxName: undefined,
        scannedTaxRate: undefined,
        scannedTotal: undefined,
        lineItems: switchingTaxMode
          ? remapLineItemsForCurrencyChange(prev.lineItems, normalized)
          : prev.lineItems,
      };
    });
    setCurrencyQuery(normalized);
  };

  useEffect(() => {
    setCurrencyQuery(formData?.currency || DEFAULT_CURRENCY);
  }, [formData?.currency]);

  const billingGstOptions = useMemo(
    () =>
      organisationGstCredentials.map((entry) => ({
        value: entry.gst,
        label: entry.gst,
      })),
    [organisationGstCredentials],
  );

  const organisationGstBusy = organisationGstLoading || organisationGstFetching;

  useEffect(() => {
    if (!showBillingGst || organisationGstBusy || !formData) return;
    if (organisationGstError || organisationGstCredentials.length === 0) {
      if (formData.billingGstin) {
        setFormData((prev) => ({
          ...prev,
          billingGstin: "",
        }));
      }
      return;
    }

    const currentBillingGst = String(formData.billingGstin || "").trim().toUpperCase();
    const matchedCurrent = organisationGstCredentials.find((entry) => entry.gst === currentBillingGst);
    if (matchedCurrent) {
      if (formData.billingGstin !== matchedCurrent.gst) {
        setFormData((prev) => ({
          ...prev,
          billingGstin: matchedCurrent.gst,
        }));
      }
      return;
    }

    if (currentBillingGst) {
      setFormData((prev) => ({
        ...prev,
        billingGstin: "",
      }));
      return;
    }

    if (organisationGstCredentials.length === 1) {
      setFormData((prev) => ({
        ...prev,
        billingGstin: organisationGstCredentials[0].gst,
      }));
    }
  }, [
    formData,
    organisationGstError,
    organisationGstBusy,
    organisationGstCredentials,
    showBillingGst,
    setFormData,
  ]);

  const showLineItems = resolveLineItemsExpanded(formData || {});
  const invoiceCurrency = formData?.currency || DEFAULT_CURRENCY;
  const useInrTax = isInrInvoiceCurrency(invoiceCurrency);
  const isGstinRequired = useInrTax && formData?.gstTreatment !== "N/A";
  const selectedBillingGst = organisationGstCredentials.find(
    (entry) => entry.gst === String(formData?.billingGstin || "").trim().toUpperCase(),
  );
  const billingGstSatisfied = !requireBillingGst || Boolean(selectedBillingGst?.gst);
  const isInvoiceLevelDiscount = formData?.discountsLevel === INVOICE_LEVEL;
  const isInvoiceLevelTax = formData?.taxesLevel === INVOICE_LEVEL;
  const lineItemHeaders = lineItemTableHeader
    .filter(
      (column) =>
        (isInvoiceLevelDiscount ? column.key !== "discount" : true) &&
        (isInvoiceLevelTax
          ? column.key !== "tax" &&
            column.key !== "taxAmount" &&
            column.key !== "netAmount"
          : true),
    )
    .map((column) => {
      if (column.key === "subtotal") {
        return {
          ...column,
          title: isInvoiceLevelTax ? "Net Amount" : "Taxable Amount",
        };
      }
      return column;
    });
  const formatAmount = (amount) => formatCurrency(amount, invoiceCurrency);
  const totals = calculateTotals(formData?.lineItems || [], invoiceCurrency);
  const invoiceMatchingPoQuery = useMemo(
    () => ({
      vendorName: String(formData?.vendorName || "").trim(),
      amount: Number(totals.total || 0),
    }),
    [formData?.vendorName, totals.total],
  );
  const shouldLoadPurchaseOrders =
    showInvoiceMatching &&
    Boolean(invoiceMatchingPoQuery.vendorName) &&
    invoiceMatchingPoQuery.amount > 0;
  const {
    data: availablePurchaseOrdersData = {},
    isFetching: purchaseOrdersLoading,
  } = useGetAvailablePurchaseOrdersQuery(invoiceMatchingPoQuery, {
    skip: !shouldLoadPurchaseOrders,
  });
  const selectedMatchingPoId = formData?.matchingPurchaseOrderId || "";
  const {
    data: availableGrnsData = {},
    isFetching: grnsLoading,
  } = useGetAvailableGrnsQuery(selectedMatchingPoId, {
    skip:
      !showInvoiceMatching ||
      !canUseThreeWayMatching ||
      !selectedMatchingPoId,
  });
  const availablePurchaseOrders = useMemo(
    () => getPageContent(availablePurchaseOrdersData).map(normalizePurchaseOrderOption),
    [availablePurchaseOrdersData],
  );
  const availableGrns = useMemo(
    () => getPageContent(availableGrnsData).map(normalizeGrnOption),
    [availableGrnsData],
  );
  const roundOffValue = resolveRoundOff(formData || {});
  const totalTax = useInrTax
    ? (Number(totals.cgst) || 0) + (Number(totals.sgst) || 0) + (Number(totals.igst) || 0)
    : (totals.foreignTaxes || []).reduce(
        (sum, entry) => sum + (Number(entry.amount) || 0),
        0,
      );
  const hasRoundOff =
    roundOffValue !== undefined &&
    roundOffValue !== null &&
    roundOffValue !== "" &&
    Number.isFinite(Number(roundOffValue));
  const tdsRate = resolveTdsRate(formData.tds, formData.tdsRate);
  const tdsLabel = formatTdsDisplayLabel({
    tds: formData.tds,
    tdsSectionCode: formData.tdsSectionCode,
    tdsRate: formData.tdsRate,
  });
  const tdsAmount = Math.round(((totals.subTotal * tdsRate) / 100) * 100) / 100;
  const netPayable = Math.max(
    Math.round((totals.total - tdsAmount) * 100) / 100,
    0,
  );
  const lineItemsSummary = computeLineItemsSummary({
    lineItems: formData?.lineItems || [],
    calculateLineItemSubtotal,
    isInvoiceLevelTax,
    useInrTax,
  });

  if (!formData) return null;

  const applyVendorNameChange = (newName) => {
    const matched = findVendorByName(newName);
    const matchedIsMsme = Boolean(matched?.msme);
    setFormData({
      ...formData,
      vendorName: newName,
      vendorId: matched?.id || "",
      vendorMatched: !!matched,
      vendorRequestPending: Boolean(matched?.isPendingApproval),
      vendorRequestSubmitted: matched ? formData.vendorRequestSubmitted : false,
      gstin: matched?.gstin
        ? String(matched.gstin).trim().toUpperCase()
        : formData.gstin,
      dueDate: normalizeDueDateForInvoice({
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        vendorIsMsme: matchedIsMsme,
      }),
      campaignId: "",
      campaignName: "",
      referenceNumber: "",
      campaignReferenceNumber: "",
      matchingPurchaseOrderId: "",
      matchingGrnId: "",
      ...buildInvoiceTdsStateFromVendor(matched),
    });
  };

  const clearVendorSelection = () => {
    setVendorQuery("");
    setFormData({
      ...formData,
      vendorName: "",
      vendorId: "",
      vendorMatched: false,
      vendorRequestPending: false,
      vendorRequestSubmitted: false,
      campaignId: "",
      campaignName: "",
      referenceNumber: "",
      campaignReferenceNumber: "",
      matchingPurchaseOrderId: "",
      matchingGrnId: "",
      tds: "",
      tdsSectionId: null,
      tdsSectionCode: null,
      tdsRate: null,
    });
  };

  const renderLineItemRow = (item, index, headers) => (
    <TableRow key={index} className="border-b last:border-b-0">
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case "description":
            value = (
              <div>
                <Input
                  value={item.description}
                  onChange={(e) =>
                    updateLineItem(index, "description", e.target.value)
                  }
                  placeholder="Description"
                  className="h-7 text-xs"
                />
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-gray-400">HSN:</span>
                  <Input
                    value={item.hsnSac}
                    onChange={(e) =>
                      updateLineItem(index, "hsnSac", e.target.value)
                    }
                    placeholder="Code"
                    className="h-5 text-[10px] w-16 px-1"
                  />
                </div>
              </div>
            );
            break;
          case "ledger":
            value = (
              <AppSelect
                value={item.ledger}
                onChange={(e) =>
                  updateLineItem(index, "ledger", e.target.value)
                }
                options={LEDGER_OPTIONS}
                className={lineItemSelectClassName}
              />
            );
            break;
          case "tax":
            value = useInrTax ? (
              <AppSelect
                value={item.tax}
                onChange={(e) => updateLineItem(index, "tax", e.target.value)}
                options={TAX_RATES}
                className={lineItemSelectClassName}
              />
            ) : (
              <div className="flex flex-col gap-1">
                <Input
                  value={item.taxName || ""}
                  onChange={(e) =>
                    updateLineItem(index, "taxName", e.target.value)
                  }
                  placeholder="Tax name"
                  className="h-7 text-xs"
                />
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formatNumericInputValue(item.taxRate)}
                    onChange={(e) =>
                      updateLineItem(
                        index,
                        "taxRate",
                        sanitizeNumericInput(e.target.value),
                      )
                    }
                    placeholder="Rate"
                    className="h-7 text-xs text-right pr-6"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            );
            break;
          case "quantity":
            value = (
              <Input
                type="text"
                inputMode="decimal"
                value={formatNumericInputValue(item.quantity)}
                onChange={(e) =>
                  updateLineItem(
                    index,
                    "quantity",
                    sanitizeNumericInput(e.target.value),
                  )
                }
                className="h-7 text-xs text-right px-1"
              />
            );
            break;
          case "unitRate":
            value = (
              <Input
                type="text"
                inputMode="decimal"
                value={formatNumericInputValue(item.unitRate)}
                onChange={(e) =>
                  updateLineItem(
                    index,
                    "unitRate",
                    sanitizeNumericInput(e.target.value, {
                      maxDecimalPlaces: 2,
                    }),
                  )
                }
                className="h-7 text-xs text-right px-1"
              />
            );
            break;
          case "discount":
            if (isInvoiceLevelDiscount) {
              value = "-";
              break;
            }
            value = (
              <div className="flex items-center gap-0.5">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatNumericInputValue(item.discount)}
                  onChange={(e) =>
                    updateLineItem(
                      index,
                      "discount",
                      sanitizeNumericInput(e.target.value),
                    )
                  }
                  className="h-7 text-xs text-right w-12 px-1"
                />
                <AppSelect
                  value={item.discountType}
                  onChange={(e) =>
                    updateLineItem(index, "discountType", e.target.value)
                  }
                  options={[
                    "%",
                    invoiceCurrency === DEFAULT_CURRENCY
                      ? "₹"
                      : invoiceCurrency,
                  ]}
                  className="h-7 w-14 rounded border text-xs bg-white pl-2 pr-6"
                />
              </div>
            );
            break;
          case "subtotal":
            value = formatAmount(calculateLineItemSubtotal(item));
            break;
          case "taxAmount":
            {
              const taxableAmount = calculateLineItemSubtotal(item);
              const rate = useInrTax
                ? parseTaxRateFromLabel(item.tax)
                : (Number(item.taxRate) || parseTaxRateFromLabel(item.tax) || 0);
              const taxAmount = (taxableAmount * rate) / 100;
              value = formatAmount(taxAmount);
            }
            break;
          case "netAmount":
            {
              const taxableAmount = calculateLineItemSubtotal(item);
              const rate = useInrTax
                ? parseTaxRateFromLabel(item.tax)
                : (Number(item.taxRate) || parseTaxRateFromLabel(item.tax) || 0);
              const taxAmount = isInvoiceLevelTax ? 0 : (taxableAmount * rate) / 100;
              value = formatAmount(taxableAmount + taxAmount);
            }
            break;
          case "actions":
            value = formData.lineItems.length > 1 && (
              <button
                type="button"
                onClick={() => removeLineItem(index)}
                className="text-red-500 hover:text-red-700 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            );
            break;
          default:
            value = item?.[header.key] || "-";
        }

        return (
          <TableCell
            key={header.key}
            className={`px-2 py-1.5 align-start text-xs ${header.cellClassName || ""}`}
          >
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div className="flex flex-row items-stretch gap-4 w-full h-full min-h-0 min-w-0">
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto space-y-4 pr-3 pb-2 scrollbar-thin-muted">
          {formData.vendorName &&
            formData.vendorRequestSubmitted &&
            !formData.vendorMatched && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <p className="text-xs text-blue-700">
                  <span className="font-medium">Vendor request submitted:</span>{" "}
                  "{formData.vendorName}" (you can{" "}
                  {isEdit ? "save this invoice" : "add this invoice"} while
                  approval is pending)
                </p>
              </div>
            )}

          {formData.vendorName &&
            !formData.vendorMatched &&
            !formData.vendorRequestSubmitted && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800 text-xs">
                      Vendor does not match
                    </p>
                    <p className="text-[11px] text-amber-600">
                      "{formData.vendorName}" does not match any vendor in the
                      system
                    </p>
                  </div>
                </div>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddVendorFromInvoice();
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs"
                  size="sm"
                  data-testid="request-vendor-from-invoice-btn"
                  disabled={!canAddVendor}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Request Vendor
                </Button>
              </div>
            )}

          {formData.vendorName && formData.vendorMatched && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-xs text-emerald-700">
                <span className="font-medium">
                  {formData.vendorRequestPending
                    ? "Vendor linked (pending approval):"
                    : "Vendor matched:"}
                </span>{" "}
                "{formData.vendorName}"
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">
              Vendor Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <RequiredLabel required>Vendor Name</RequiredLabel>
                <Popover
                  open={vendorPickerOpen}
                  onOpenChange={setVendorPickerOpen}
                >
                  <PopoverAnchor asChild>
                    <div className="relative" ref={vendorAnchorRef}>
                      <Input
                        value={formData.vendorName || ""}
                        onChange={(e) => {
                          setVendorQuery(e.target.value);
                          applyVendorNameChange(e.target.value);
                          setVendorPickerOpen(true);
                        }}
                        onFocus={() => {
                          setVendorQuery("");
                          setVendorPickerOpen(true);
                        }}
                        placeholder="Select or enter vendor"
                        className="pr-16 h-8 text-sm"
                        autoComplete="off"
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        {formData.vendorName && (
                          <button
                            type="button"
                            onClick={clearVendorSelection}
                            className="text-gray-400 hover:text-gray-600 p-1"
                            aria-label="Clear vendor"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setVendorQuery("");
                            setVendorPickerOpen(true);
                          }}
                          className="text-gray-400 hover:text-gray-600 p-1"
                          aria-label="Show vendor list"
                        >
                          <ChevronsUpDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </PopoverAnchor>
                  <PopoverContent
                    className="z-[120] min-w-[260px] overflow-y-auto w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                    onInteractOutside={(event) => {
                      if (vendorAnchorRef.current?.contains(event.target)) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <div
                      className="max-h-56 overflow-y-auto overscroll-contain py-1"
                      onWheel={(event) => {
                        event.currentTarget.scrollTop += event.deltaY;
                        event.stopPropagation();
                      }}
                    >
                      {filteredVendorOptions.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                          {vendorOptions.length === 0
                            ? "No vendors available"
                            : "No matching vendors — you can still enter a new name"}
                        </p>
                      ) : (
                        filteredVendorOptions.map((vendor) => (
                          <button
                            key={vendor.id}
                            type="button"
                            className={cn(
                              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                              formData.vendorName === vendor.name &&
                                "bg-accent",
                            )}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              applyVendorNameChange(vendor.name);
                              setVendorQuery("");
                              setVendorPickerOpen(false);
                            }}
                          >
                            <span className="truncate">{vendor.name}</span>
                            {vendor.isPendingApproval && (
                              <span className="ml-auto shrink-0 text-[10px] text-amber-600">
                                Pending
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
                <div>
                  <RequiredLabel required>Inovoice/Bill Number</RequiredLabel>
                  <Input
                    value={formData.invoiceNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoiceNumber: e.target.value,
                      })
                    }
                    placeholder="Invoice number"
                    className="h-8 text-sm"
                  />
                </div>
              <div className="col-span-2">
                <InvoiceCampaignFields
                  formData={formData}
                  setFormData={setFormData}
                  showCampaignField={showCampaignField}
                  lockedCampaign={lockedCampaign}
                  lockedCampaignPrefill={lockedCampaignPrefill}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <RequiredLabel required>Billing Date</RequiredLabel>
                <Input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => {
                    const invoiceDate = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      invoiceDate,
                      dueDate: normalizeDueDateForInvoice({
                        invoiceDate,
                        dueDate: prev.dueDate,
                        vendorIsMsme,
                      }),
                    }));
                  }}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <RequiredLabel>Due Date</RequiredLabel>
                <Input
                  type="date"
                  value={formData.dueDate}
                  min={formData.invoiceDate || undefined}
                  max={msmeMaxDueDate || undefined}
                  onChange={(e) => {
                    const dueDate = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      dueDate: normalizeDueDateForInvoice({
                        invoiceDate: prev.invoiceDate,
                        dueDate,
                        vendorIsMsme,
                      }),
                    }));
                  }}
                  className="h-8 text-sm"
                />
                {isEdit ? <InvoiceDueDateIndicators invoice={formData} className="mt-2" /> : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <RequiredLabel required>Currency</RequiredLabel>
                <Popover
                  open={currencyPickerOpen}
                  onOpenChange={setCurrencyPickerOpen}
                >
                  <PopoverAnchor asChild>
                    <div className="relative">
                      <Input
                        id="invoice-form-currency"
                        value={currencyQuery}
                        onChange={(e) => {
                          const next = e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z]/g, "")
                            .slice(0, 3);
                          setCurrencyQuery(next);
                          setCurrencyPickerOpen(true);
                          if (next.length === 3) {
                            applyInvoiceCurrencyChange(next);
                          }
                        }}
                        onFocus={() => setCurrencyPickerOpen(true)}
                        onBlur={() => {
                          const normalized =
                            normalizeCurrencyCode(currencyQuery);
                          if (String(currencyQuery || "").trim().length === 3) {
                            applyInvoiceCurrencyChange(normalized);
                          } else {
                            setCurrencyQuery(
                              formData.currency || DEFAULT_CURRENCY,
                            );
                          }
                        }}
                        placeholder="Select or type code (e.g. USD)"
                        className="pr-10 h-8 text-sm uppercase"
                        autoComplete="off"
                        maxLength={3}
                      />
                      <button
                        type="button"
                        onClick={() => setCurrencyPickerOpen((open) => !open)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        aria-label="Show currency list"
                      >
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </PopoverAnchor>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                  >
                    <div className="max-h-56 overflow-y-auto py-1">
                      {filteredCurrencyOptions.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                          {String(currencyQuery || "").trim().length === 3
                            ? `Use ${normalizeCurrencyCode(currencyQuery)} (press Tab to apply)`
                            : "No matching currencies — type a 3-letter ISO code"}
                        </p>
                      ) : (
                        filteredCurrencyOptions.map((code) => (
                          <button
                            key={code}
                            type="button"
                            className={cn(
                              "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent",
                              invoiceCurrency === code && "bg-accent",
                            )}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              applyInvoiceCurrencyChange(code);
                              setCurrencyPickerOpen(false);
                            }}
                          >
                            {code}
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <RequiredLabel required={departmentMandatory}>
                  Department
                </RequiredLabel>
                <AppSelect
                  value={formData.departmentId || ""}
                  onChange={(e) => {
                    const selectedDepartment = departments.find(
                      (department) => {
                        const departmentId =
                          department?.id ??
                          department?.departmentId ??
                          department?.departmentId;
                        return String(departmentId ?? "") === e.target.value;
                      },
                    );
                    setFormData({
                      ...formData,
                      departmentId: e.target.value,
                      departmentName:
                        selectedDepartment?.name ||
                        selectedDepartment?.departmentName ||
                        selectedDepartment?.departmentName ||
                        "",
                    });
                  }}
                  className="h-8 text-sm"
                  data-testid="invoice-department-select"
                  required={departmentMandatory}
                  placeholder="Select department"
                  options={departments.map((department) => ({
                    value:
                      department?.id ??
                      department?.departmentId ??
                      department?.departmentId,
                    label:
                      department?.name ??
                      department?.departmentName ??
                      department?.departmentName,
                  }))}
                />
              </div>
              {showCategoryField && (
                <div>
                  <RequiredLabel required={categoryMandatory}>
                    Category
                  </RequiredLabel>
                  <AppSelect
                    value={formData.categoryId || ""}
                    onChange={(e) => {
                      const selectedCategory = invoiceCategories.find(
                        (category) =>
                          String(category.id ?? "") === e.target.value,
                      );
                      setFormData({
                        ...formData,
                        categoryId: e.target.value,
                        categoryName: selectedCategory?.name || "",
                        category: selectedCategory
                          ? {
                              id: selectedCategory.id,
                              name: selectedCategory.name,
                            }
                          : null,
                      });
                    }}
                    className="h-8 text-sm"
                    data-testid="invoice-category-select"
                    required={categoryMandatory}
                    placeholder={
                      invoiceCategoriesLoading
                        ? "Loading categories..."
                        : "Select category"
                    }
                    disabled={invoiceCategoriesLoading}
                    options={invoiceCategories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
                  />
                </div>
              )}
            </div>

            <div>
              {showBillingGst ? (
                <div className="mb-3">
                  <RequiredLabel required={requireBillingGst}>Billing GSTIN</RequiredLabel>
                  <AppSelect
                    value={formData.billingGstin || ""}
                    onChange={(event) => {
                      const nextGst = event.target.value;
                      const matched = organisationGstCredentials.find((entry) => entry.gst === nextGst);
                      setFormData({
                        ...formData,
                        billingGstin: matched?.gst || "",
                      });
                    }}
                    options={billingGstOptions}
                    placeholder={
                      organisationGstBusy
                        ? "Loading organisation GSTINs..."
                        : "Select billing GSTIN"
                    }
                    className="h-8 text-sm"
                    disabled={organisationGstBusy || billingGstOptions.length === 0}
                    data-testid="invoice-preview-billing-gst-select"
                  />
                  {organisationGstError ? (
                    <p className="mt-1 text-xs text-destructive">
                      Failed to load organisation GSTINs. Add invoice is blocked until this loads.
                    </p>
                  ) : billingGstOptions.length === 0 && !organisationGstBusy ? (
                    <p className="mt-1 text-xs text-destructive">
                      Add GSTIN and GST portal username in Settings &gt; Organisation Details before proceeding.
                    </p>
                  ) : !billingGstSatisfied ? (
                    <p className="mt-1 text-xs text-destructive">
                      Select a billing GSTIN configured in Organisation Details.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Billing GSTIN must be one of this organisation's configured GST registrations.
                    </p>
                  )}
                </div>
              ) : null}

              <Label className="text-xs">Billing Address</Label>
              <textarea
                value={formData.billingAddress}
                onChange={(e) =>
                  setFormData({ ...formData, billingAddress: e.target.value })
                }
                placeholder="Enter billing address"
                className="w-full min-h-[50px] rounded-md border border-input bg-background px-2 py-1.5 text-xs resize-none"
              />
            </div>

            {showInvoiceMatching && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-xs font-medium">Invoice Matching</Label>
                    <p className="text-xs text-muted-foreground">
                      Optional. Select a PO for 2-way matching; add a GRN for 3-way matching.
                    </p>
                  </div>
                  {selectedMatchingPoId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          matchingPurchaseOrderId: "",
                          matchingGrnId: "",
                        })
                      }
                    >
                      <X className="mr-1 h-3 w-3" />
                      Clear
                    </Button>
                  ) : null}
                </div>
                <div className={canUseThreeWayMatching ? "grid gap-3 md:grid-cols-2" : "grid gap-3"}>
                  <div>
                    <Label className="text-xs">Purchase Order</Label>
                    <AppSelect
                      value={selectedMatchingPoId}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          matchingPurchaseOrderId: event.target.value,
                          matchingGrnId: "",
                        })
                      }
                      options={availablePurchaseOrders.map((po) => ({
                        value: po.id,
                        label: `${po.poNumber || "PO"} - ${formatAmount(po.amount)}`,
                      }))}
                      placeholder={
                        !invoiceMatchingPoQuery.vendorName
                          ? "Select vendor first"
                          : purchaseOrdersLoading
                            ? "Loading purchase orders..."
                            : "Select purchase order"
                      }
                      className="h-8 text-sm"
                      disabled={!shouldLoadPurchaseOrders || purchaseOrdersLoading}
                    />
                    {shouldLoadPurchaseOrders && !purchaseOrdersLoading && availablePurchaseOrders.length === 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        No available purchase orders found for this vendor and invoice amount.
                      </p>
                    ) : null}
                  </div>
                  {canUseThreeWayMatching ? (
                    <div>
                      <Label className="text-xs">GRN</Label>
                      <AppSelect
                        value={formData.matchingGrnId || ""}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            matchingGrnId: event.target.value,
                          })
                        }
                        options={availableGrns.map((grn) => ({
                          value: grn.id,
                          label: `${grn.grnNumber || "GRN"} - ${formatAmount(grn.amount)}`,
                        }))}
                        placeholder={
                          !selectedMatchingPoId
                            ? "Select PO first"
                            : grnsLoading
                              ? "Loading GRNs..."
                              : "Select GRN"
                        }
                        className="h-8 text-sm"
                        disabled={!selectedMatchingPoId || grnsLoading}
                      />
                      {selectedMatchingPoId && !grnsLoading && availableGrns.length === 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          No available GRNs found for the selected purchase order.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <RequiredLabel required>GST Treatment</RequiredLabel>
                <AppSelect
                  value={formData.gstTreatment}
                  onChange={(e) =>
                    setFormData({ ...formData, gstTreatment: e.target.value })
                  }
                  options={GST_TREATMENTS}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <RequiredLabel required={isGstinRequired}>
                  {isGstinRequired ? "Vendor GSTIN" : "Vendor GSTIN / Tax ID"}
                </RequiredLabel>
                <Input
                  value={formData.gstin}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gstin: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder={
                    isGstinRequired
                      ? "Enter GSTIN"
                      : "Enter GSTIN / Tax ID (Optional)"
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <RequiredLabel>Source of Supply</RequiredLabel>
                {useInrTax ? (
                  <AppSelect
                    value={formData.sourceOfSupply || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sourceOfSupply: e.target.value,
                      })
                    }
                    options={INDIAN_STATES}
                    placeholder="Select source of supply"
                    className="h-8 text-xs"
                  />
                ) : (
                  <Input
                    value={formData.sourceOfSupply || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sourceOfSupply: e.target.value,
                      })
                    }
                    placeholder="Enter source of supply"
                    className="h-8 text-xs"
                  />
                )}
              </div>
              <div>
                <RequiredLabel>Destination</RequiredLabel>
                {useInrTax ? (
                  <AppSelect
                    value={formData.destinationOfSupply || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        destinationOfSupply: e.target.value,
                      })
                    }
                    options={INDIAN_STATES}
                    placeholder="Select destination"
                    className="h-8 text-xs"
                  />
                ) : (
                  <Input
                    value={formData.destinationOfSupply || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        destinationOfSupply: e.target.value,
                      })
                    }
                    placeholder="Enter destination"
                    className="h-8 text-xs"
                  />
                )}
              </div>
            </div>

            <div>
              <RequiredLabel required>Source</RequiredLabel>
              <AppSelect
                value={formData.source}
                onChange={(e) =>
                  setFormData({ ...formData, source: e.target.value })
                }
                options={INVOICE_SOURCES}
                className="h-8 text-sm"
                data-testid="source-select"
              />
            </div>
            {formData.source === "Email" && (
              <div>
                <RequiredLabel required>Source Email</RequiredLabel>
                <Input
                  type="email"
                  value={formData.sourceEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, sourceEmail: e.target.value })
                  }
                  placeholder="vendor@example.com"
                  className="w-full h-8 text-sm"
                  data-testid="source-email-input"
                />
              </div>
            )}

            <div className="flex gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600">Discounts:</span>
                <AppSelect
                  value={formData.discountsLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, discountsLevel: e.target.value })
                  }
                  options={[LINE_ITEM_LEVEL, INVOICE_LEVEL]}
                  className="h-6 w-auto border-none bg-transparent pl-0 pr-6 text-xs text-blue-600 shadow-none"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600">Taxes:</span>
                <AppSelect
                  value={formData.taxesLevel || LINE_ITEM_LEVEL}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      taxesLevel: e.target.value,
                      invoiceTax: formData.invoiceTax || DEFAULT_INR_TAX,
                      invoiceTaxName: formData.invoiceTaxName || "Tax",
                      invoiceTaxRate: formData.invoiceTaxRate ?? "",
                      scannedTaxAmount: undefined,
                      scannedTaxName: undefined,
                      scannedTaxRate: undefined,
                      scannedTotal: undefined,
                    })
                  }
                  options={[LINE_ITEM_LEVEL, INVOICE_LEVEL]}
                  className="h-6 w-auto border-none bg-transparent pl-0 pr-6 text-xs text-blue-600 shadow-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <LineItemsSectionHeader
              showLineItems={showLineItems}
              onToggle={() =>
                setFormData({
                  ...formData,
                  lineItemsExpanded: !showLineItems,
                })
              }
              itemCount={formData.lineItems?.length || 0}
            />
            {showLineItems ? (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto scrollbar-thin-muted">
                    <AppDataTable
                      tableHeader={lineItemHeaders}
                      tableData={formData.lineItems}
                      renderRow={renderLineItemRow}
                      tableClassName="min-w-[890px] border-separate border-spacing-0"
                      headClassName="bg-gray-50 border-b"
                      stickyHeader={false}
                      striped={false}
                      emptyMessage="No line items found"
                    />
                  </div>
                </div>
                <div className="h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-yellow-400 rounded" />
                <Button
                  variant="outline"
                  onClick={addLineItem}
                  className="text-blue-600 h-7 text-xs"
                  size="sm"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Line Item
                </Button>
              </>
            ) : (
              <LineItemsSummary
                summary={lineItemsSummary}
                formatAmount={formatAmount}
                isInvoiceLevelTax={isInvoiceLevelTax}
              />
            )}
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter Description (Optional)"
              className="w-full min-h-[50px] rounded-md border border-input bg-background px-2 py-1.5 text-xs resize-none"
            />
          </div>

          {isInvoiceLevelTax && (
            <div className="grid grid-cols-2 gap-3">
              {useInrTax ? (
                <div className="max-w-xs">
                  <RequiredLabel>Invoice Tax</RequiredLabel>
                  <AppSelect
                    value={formData.invoiceTax || DEFAULT_INR_TAX}
                    onChange={(e) =>
                      setFormData({ ...formData, invoiceTax: e.target.value })
                    }
                    options={TAX_RATES}
                    className="h-8 max-w-[220px] text-sm"
                  />
                </div>
              ) : (
                <div className="col-span-2 grid max-w-md grid-cols-[minmax(180px,1fr)_120px] gap-3">
                  <div>
                    <RequiredLabel>Tax Name</RequiredLabel>
                    <Input
                      value={formData.invoiceTaxName || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          invoiceTaxName: e.target.value,
                        })
                      }
                      placeholder="Tax name"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <RequiredLabel>Tax Rate %</RequiredLabel>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formatNumericInputValue(formData.invoiceTaxRate)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          invoiceTaxRate: sanitizeNumericInput(e.target.value),
                        })
                      }
                      placeholder="Rate"
                      className="h-8 text-sm text-right"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span>Sub Total</span>
              <span className="font-medium">
                {formatAmount(
                  isInvoiceLevelDiscount
                    ? totals.subTotalBeforeDiscount
                    : totals.subTotal,
                )}
              </span>
            </div>
            {isInvoiceLevelDiscount && (
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  <span>Discount</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formatNumericInputValue(formData.invoiceDiscount)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoiceDiscount: sanitizeNumericInput(e.target.value),
                      })
                    }
                    className="h-6 w-16 text-xs text-right px-1"
                  />
                  <AppSelect
                    value={formData.invoiceDiscountType || "%"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoiceDiscountType: e.target.value,
                      })
                    }
                    options={[
                      "%",
                      invoiceCurrency === DEFAULT_CURRENCY
                        ? "₹"
                        : invoiceCurrency,
                    ]}
                    className="h-6 w-16 rounded border text-xs bg-white pl-2 pr-6"
                  />
                </div>
                <span>-{formatAmount(totals.invoiceDiscountAmount || 0)}</span>
              </div>
            )}
            {useInrTax && totals.cgst > 0 && (
              <div className="flex justify-between text-xs">
                <span>CGST 9%</span>
                <span>{formatAmount(totals.cgst)}</span>
              </div>
            )}
            {useInrTax && totals.sgst > 0 && (
              <div className="flex justify-between text-xs">
                <span>SGST 9%</span>
                <span>{formatAmount(totals.sgst)}</span>
              </div>
            )}
            {useInrTax && totals.igst > 0 && (
              <div className="flex justify-between text-xs">
                <span>IGST</span>
                <span>{formatAmount(totals.igst)}</span>
              </div>
            )}
            {!useInrTax &&
              totals.foreignTaxes?.map((entry) => (
                <div
                  key={`${entry.name}-${entry.rate}`}
                  className="flex justify-between text-xs"
                >
                  <span>
                    {entry.name}
                    {entry.rate > 0 ? ` ${entry.rate}%` : ""}
                  </span>
                  <span>{formatAmount(entry.amount)}</span>
                </div>
              ))}
            <div className="flex justify-between text-xs">
              <span>Total Tax</span>
              <span className="font-medium">{formatAmount(totalTax)}</span>
            </div>
            {hasRoundOff && (
              <div className="flex justify-between text-xs">
                <span>Round Off</span>
                <span>{formatAmount(Number(roundOffValue))}</span>
              </div>
            )}
            <div className="flex justify-between items-start pt-1.5 border-t text-xs gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <span>TDS{tdsLabel ? ` (${tdsLabel})` : ""}</span>
                <TdsSelectionField
                  value={formData.tds || ""}
                  onChange={(selection) =>
                    setFormData({
                      ...formData,
                      tds: selection.tds,
                      tdsSectionId: selection.tdsSectionId,
                      tdsSectionCode: selection.tdsSectionCode,
                      tdsRate: selection.tdsRate,
                    })
                  }
                  showLabel={false}
                  selectClassName="h-6 w-full max-w-[220px] rounded border pl-1 pr-6 text-xs"
                  inputClassName="h-6 w-16 px-1 text-xs"
                  testIdPrefix="invoice-tds"
                />
              </div>
              <span className="shrink-0 pt-1">{formatAmount(tdsAmount)}</span>
            </div>
            <div className="flex justify-between text-sm pt-1.5 border-t">
              <span>Total</span>
              <span>{formatAmount(totals.total)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1.5 border-t">
              <span>Net Payable</span>
              <span>{formatAmount(netPayable)}</span>
            </div>
          </div>
        </div>

        {!hideActions && (
          <div className="flex gap-3 pt-4 border-t shrink-0 bg-white">
            <Button
              variant="outline"
              onClick={() => {
                if (isEdit) {
                  setEditDialogOpen(false);
                } else {
                  setUploadedFile(null);
                  setUploadedFileURL(null);
                  setFormData(null);
                  setActiveTab("list");
                }
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={isEdit ? handleUpdateInvoice : handleAddInvoice}
              className="flex-1"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit
                    ? isSavedDraft
                      ? "Saving..."
                      : "Updating..."
                    : "Creating..."}
                </>
              ) : isEdit ? (
                isSavedDraft ? (
                  "Save Draft"
                ) : (
                  "Update Invoice"
                )
              ) : (
                "Add Invoice"
              )}
            </Button>
          </div>
        )}
      </div>

      <InvoiceChecklist
        formData={formData}
        departmentMandatory={departmentMandatory}
        categoryMandatory={categoryMandatory}
        showCategoryField={showCategoryField}
        showCampaignField={showCampaignField}
      />
    </div>
  );
};

export default InvoiceForm;
