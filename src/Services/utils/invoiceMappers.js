import { DEFAULT_CURRENCY, normalizeCurrencyCode } from "../../utils/currency";
import {
  isGmailInvoiceSource,
  normalizeInvoiceSource,
} from "../../pages/invoices/constants";
import { normalizeMsmePaymentDue } from "../../pages/invoices/utils/msmePaymentDue";
import { normalizeInvoiceOverdueFields } from "../../pages/invoices/utils/invoiceDueDate";
import { normalizeExpenseType } from "../../pages/invoices/utils/invoiceAccountingFields";

const toLocalDateTimeString = (value) => {
  if (!value) return value;
  if (typeof value !== "string") return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00`;
  return value;
};

const roundMoney = (value) => {
  if (value === null || value === undefined || value === "") return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : value;
};

const normalizeDepartmentId = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : numeric;
};

const resolveTdsSelection = (value) => {
  if (!value || value === "__NO_TDS__") {
    return {
      tdsSectionId: null,
      tdsSectionCode: null,
      tdsRate: null,
    };
  }

  const [rawId, rawLabel = rawId] = String(value).split("::");
  const label = rawLabel.trim();
  const match = label.match(/^(.+)-(\d+(?:\.\d+)?)%$/);

  return {
    tdsSectionId: rawId || null,
    tdsSectionCode: match?.[1] || null,
    tdsRate: match ? Number(match[2]) : null,
  };
};

/** Mirrors invoice form TAX_RATES — used to map UI tax labels to API gstRate */
const INVOICE_TAX_RATE_OPTIONS = [
  { value: "CGST + SGST 5%", cgst: 2.5, sgst: 2.5 },
  { value: "CGST + SGST 12%", cgst: 6, sgst: 6 },
  { value: "CGST + SGST 18%", cgst: 9, sgst: 9 },
  { value: "CGST + SGST 28%", cgst: 14, sgst: 14 },
  { value: "IGST 5%", igst: 5 },
  { value: "IGST 12%", igst: 12 },
  { value: "IGST 18%", igst: 18 },
  { value: "IGST 28%", igst: 28 },
  { value: "Exempt", cgst: 0, sgst: 0 },
];

export const pickInvoiceField = (invoice, camelKey, snakeKey, fallback = undefined) => {
  if (invoice?.[camelKey] !== undefined && invoice?.[camelKey] !== null && invoice?.[camelKey] !== "") {
    return invoice[camelKey];
  }
  if (invoice?.[snakeKey] !== undefined && invoice?.[snakeKey] !== null && invoice?.[snakeKey] !== "") {
    return invoice[snakeKey];
  }
  return fallback;
};

export const resolveGstRateFromLineItem = (item = {}) => {
  const direct = item.gstRate ?? item.gst_rate;
  if (direct !== null && direct !== undefined && direct !== "") {
    const numeric = Number(direct);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  const explicitRate = item.taxRate ?? item.tax_rate;
  if (explicitRate !== null && explicitRate !== undefined && explicitRate !== "") {
    const numeric = Number(explicitRate);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  const taxLabel = String(item.tax ?? "").trim();
  if (!taxLabel) return undefined;

  const match = INVOICE_TAX_RATE_OPTIONS.find((option) => option.value === taxLabel);
  if (match) {
    if (match.igst != null) return match.igst;
    if (match.cgst != null && match.sgst != null) return match.cgst + match.sgst;
    return 0;
  }

  if (/exempt/i.test(taxLabel)) return 0;

  const percentMatch = taxLabel.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) {
    const numeric = Number(percentMatch[1]);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  return undefined;
};

const inferTaxLabelFromGstRate = (gstRate) => {
  const rate = Number(gstRate);
  if (!Number.isFinite(rate)) return "";
  if (rate === 0) return "Exempt";

  const match = INVOICE_TAX_RATE_OPTIONS.find((option) => {
    if (option.igst != null) return option.igst === rate;
    if (option.cgst != null && option.sgst != null) return option.cgst + option.sgst === rate;
    return false;
  });

  return match?.value ?? "";
};

export const normalizeInvoiceLineItem = (item = {}) => {
  const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
  const unitRate =
    Number(item.unitRate ?? item.unit_rate ?? item.unitPrice ?? item.unit_price ?? item.price ?? 0) || 0;
  const lineTotal = Number(item.lineTotal ?? item.line_total ?? item.amount ?? quantity * unitRate) || 0;
  const amount = Number(item.amount ?? lineTotal) || lineTotal;
  const gstRate = item.gstRate ?? item.gst_rate;

  return {
    ...item,
    description: item.description ?? item.name ?? "",
    quantity,
    unitRate,
    unitPrice: unitRate,
    amount,
    lineTotal,
    hsnSac: item.hsnSac ?? item.hsn_sac ?? "",
    gstRate,
    tax: item.tax ?? inferTaxLabelFromGstRate(gstRate),
    taxName: item.taxName ?? item.tax_name ?? "",
    taxRate: item.taxRate ?? item.tax_rate ?? "",
    ledger:
      item.ledger ??
      item.ledgerName ??
      item.ledger_name ??
      "",
    ledgerId: item.ledgerId ?? item.ledger_id ?? item.accountId ?? item.account_id ?? "",
    accountGroupId:
      item.accountGroupId ??
      item.account_group_id ??
      item.groupId ??
      item.group_id ??
      "",
    accountGroupName:
      item.accountGroupName ??
      item.account_group_name ??
      item.groupName ??
      item.group_name ??
      "",
    groupId:
      item.groupId ??
      item.group_id ??
      item.accountGroupId ??
      item.account_group_id ??
      "",
    groupName:
      item.groupName ??
      item.group_name ??
      item.accountGroupName ??
      item.account_group_name ??
      "",
    expenseType: normalizeExpenseType(item.expenseType ?? item.expense_type ?? ""),
    discount: Number(item.discount ?? 0) || 0,
    discountType: item.discountType ?? item.discount_type ?? "%",
    eligibleForItc: item.eligibleForItc ?? item.eligible_for_itc ?? true,
  };
};

const toInvoiceLineItemDiscountTypeApiValue = (discountType = "") => {
  const normalized = String(discountType || "").trim().toLowerCase();
  if (!normalized || normalized === "%") return "percentage";
  if (normalized === "percent" || normalized === "percentage") {
    return "percentage";
  }
  return "amount";
};

const toInvoiceLineItemApiPayload = (item = {}, options = {}) => {
  const { erpIntegrationEnabled = true } = options;
  const normalized = normalizeInvoiceLineItem(item);
  const gstRate = resolveGstRateFromLineItem(normalized);
  const hsnSac = String(normalized.hsnSac ?? "").trim();
  const itemCode = String(item.itemCode ?? item.item_code ?? "").trim();
  const uom = String(item.uom ?? item.unit_of_measure ?? item.unitOfMeasure ?? "").trim();

  const payload = {
    description: normalized.description,
    quantity: normalized.quantity,
    unitPrice: normalized.unitRate,
    amount: normalized.amount,
  };

  if (normalized.discount > 0) {
    payload.discount = normalized.discount;
    payload.discountType = toInvoiceLineItemDiscountTypeApiValue(
      normalized.discountType,
    );
  }
  if (hsnSac) payload.hsnSac = hsnSac;
  if (gstRate !== undefined) payload.gstRate = gstRate;
  if (itemCode) payload.itemCode = itemCode;
  if (uom) payload.uom = uom;
  if (erpIntegrationEnabled) {
    if (normalized.ledger) {
      payload.ledger = normalized.ledger;
      payload.ledgerName = normalized.ledger;
    }
    if (normalized.ledgerId) payload.ledgerId = normalized.ledgerId;
    if (normalized.accountGroupId) payload.accountGroupId = normalized.accountGroupId;
    if (normalized.accountGroupName) payload.accountGroupName = normalized.accountGroupName;
    if (normalized.groupId) payload.groupId = normalized.groupId;
    if (normalized.groupName) payload.groupName = normalized.groupName;
    if (normalized.expenseType) payload.expenseType = normalized.expenseType;
  }

  return payload;
};

const resolveInvoiceCategoryPayload = (invoice = {}) => {
  const category = invoice.category;
  const categoryId = category?.id ?? invoice.categoryId ?? invoice.category_id ?? undefined;
  if (categoryId === undefined || categoryId === null || categoryId === "") {
    return undefined;
  }
  const numericId = Number(categoryId);
  return {
    id: Number.isNaN(numericId) ? categoryId : numericId,
    name: category?.name ?? invoice.categoryName ?? invoice.category_name ?? "",
  };
};

/** Normalizes API/list responses into camelCase invoice objects for the UI. */
export const normalizeInvoiceResponse = (invoice = {}) => {
  const lineItemsSource = invoice.lineItems ?? invoice.line_items ?? [];
  const lineItemMode = pickInvoiceField(invoice, "lineItemMode", "line_item_mode", "DETAILED");
  const lineItemsRemoved = Boolean(
    invoice.lineItemsRemoved ?? invoice.line_items_removed ?? false,
  );
  const removedLineItemsCount = Number(
    pickInvoiceField(invoice, "removedLineItemsCount", "removed_line_items_count") ??
      pickInvoiceField(invoice, "previousLineItemCount", "previous_line_item_count") ??
      0,
  ) || 0;
  const category = invoice.category;
  const categoryId = category?.id ?? invoice.categoryId ?? invoice.category_id;
  const totalAmount = pickInvoiceField(invoice, "totalAmount", "total_amount");

  return {
    ...invoice,
    currency: normalizeCurrencyCode(invoice.currency ?? invoice.currencyCode ?? DEFAULT_CURRENCY),
    invoiceNumber: pickInvoiceField(invoice, "invoiceNumber", "invoice_number", ""),
    refNo: pickInvoiceField(invoice, "refNo", "ref_no", "") || null,
    vendorId: pickInvoiceField(invoice, "vendorId", "vendor_id", ""),
    vendorName: pickInvoiceField(invoice, "vendorName", "vendor_name", ""),
    lineItems: Array.isArray(lineItemsSource)
      ? lineItemsSource.map(normalizeInvoiceLineItem)
      : [],
    lineItemMode,
    lineItemsRemoved,
    removedLineItemsCount,
    subTotal:
      pickInvoiceField(invoice, "subTotal", "sub_total") ??
      pickInvoiceField(invoice, "subtotal", "subtotal"),
    totalTaxAmount:
      pickInvoiceField(invoice, "totalTaxAmount", "total_tax_amount") ??
      pickInvoiceField(invoice, "gstAmount", "gst_amount"),
    invoiceDate: pickInvoiceField(invoice, "invoiceDate", "invoice_date"),
    dueDate: pickInvoiceField(invoice, "dueDate", "due_date"),
    ...normalizeInvoiceOverdueFields(invoice),
    totalAmount,
    amount: totalAmount ?? invoice.netAmount ?? invoice.net_amount,
    memo: invoice.memo ?? invoice.description,
    billingAddress:
      pickInvoiceField(invoice, "billingAddress", "billing_address") ??
      pickInvoiceField(invoice, "vendorAddress", "vendor_address"),
    billingGstin: pickInvoiceField(invoice, "billingGstin", "billing_gstin", ""),
    vendorAddress: pickInvoiceField(invoice, "vendorAddress", "vendor_address"),
    gstTreatment: pickInvoiceField(invoice, "gstTreatment", "gst_treatment"),
    gstin: invoice.gstin ?? invoice.vendorGstin ?? invoice.vendor_gstin,
    sourceOfSupply:
      pickInvoiceField(invoice, "sourceOfSupply", "source_of_supply") ??
      pickInvoiceField(invoice, "placeOfSupply", "place_of_supply"),
    destinationOfSupply:
      pickInvoiceField(invoice, "destinationOfSupply", "destination_of_supply") ??
      pickInvoiceField(invoice, "placeOfSupply", "place_of_supply"),
    location:
      invoice.location ?? pickInvoiceField(invoice, "placeOfSupply", "place_of_supply"),
    placeOfSupply: pickInvoiceField(invoice, "placeOfSupply", "place_of_supply"),
    reverseCharges: pickInvoiceField(invoice, "reverseCharges", "reverse_charges"),
    discountsLevel: pickInvoiceField(invoice, "discountsLevel", "discounts_level"),
    taxesLevel: pickInvoiceField(invoice, "taxesLevel", "taxes_level"),
    invoiceTax: pickInvoiceField(invoice, "invoiceTax", "invoice_tax"),
    invoiceTaxName: pickInvoiceField(invoice, "invoiceTaxName", "invoice_tax_name"),
    invoiceTaxRate: pickInvoiceField(invoice, "invoiceTaxRate", "invoice_tax_rate"),
    source: normalizeInvoiceSource(invoice.source),
    sourceEmail: pickInvoiceField(invoice, "sourceEmail", "source_email"),
    voucherType:
      pickInvoiceField(invoice, "voucherType", "voucher_type") ??
      pickInvoiceField(invoice, "accountingVoucherType", "accounting_voucher_type"),
    tdsNarration:
      pickInvoiceField(invoice, "tdsNarration", "tds_narration") ??
      pickInvoiceField(invoice, "narration", "narration"),
    fileId: pickInvoiceField(invoice, "fileId", "file_id"),
    fileHash: pickInvoiceField(invoice, "fileHash", "file_hash"),
    originalFileName:
      pickInvoiceField(invoice, "originalFileName", "original_file_name") ??
      pickInvoiceField(invoice, "originalFileName", "original_filename"),
    fileCategory: pickInvoiceField(invoice, "fileCategory", "file_category"),
    workItemId: pickInvoiceField(invoice, "workItemId", "work_item_id"),
    branchName: pickInvoiceField(invoice, "branchName", "branch_name"),
    branchCode: pickInvoiceField(invoice, "branchCode", "branch_code"),
    branchId: pickInvoiceField(invoice, "branchId", "branch_id"),
    vendorBranchName: pickInvoiceField(invoice, "vendorBranchName", "vendor_branch_name"),
    vendorBranchCode: pickInvoiceField(invoice, "vendorBranchCode", "vendor_branch_code"),
    vendorBranchGstin: pickInvoiceField(invoice, "vendorBranchGstin", "vendor_branch_gstin"),
    poNumber: pickInvoiceField(invoice, "poNumber", "po_number"),
    poId: pickInvoiceField(invoice, "poId", "po_id"),
    grnNumber: pickInvoiceField(invoice, "grnNumber", "grn_number"),
    grnId: pickInvoiceField(invoice, "grnId", "grn_id"),
    receiptFileUrl: pickInvoiceField(invoice, "receiptFileUrl", "receipt_file_url"),
    invoiceFileUrl: pickInvoiceField(invoice, "invoiceFileUrl", "invoice_file_url"),
    paymentDate: pickInvoiceField(invoice, "paymentDate", "payment_date"),
    createdByName: pickInvoiceField(invoice, "createdByName", "created_by_name"),
    createdByEmail: pickInvoiceField(invoice, "createdByEmail", "created_by_email"),
    createdById: pickInvoiceField(invoice, "createdById", "created_by_id"),
    createdBy: pickInvoiceField(invoice, "createdBy", "created_by"),
    createdAt: pickInvoiceField(invoice, "createdAt", "created_at"),
    matchingStatus: pickInvoiceField(invoice, "matchingStatus", "matching_status"),
    approvalRecords: invoice.approvalRecords ?? invoice.approval_records,
    grossAmount: pickInvoiceField(invoice, "grossAmount", "gross_amount"),
    gstAmount: pickInvoiceField(invoice, "gstAmount", "gst_amount"),
    roundOff:
      pickInvoiceField(invoice, "roundOff", "round_off") ??
      invoice.roundoff,
    tdsAmount: pickInvoiceField(invoice, "tdsAmount", "tds_amount"),
    tdsSectionId: pickInvoiceField(invoice, "tdsSectionId", "tds_section_id"),
    tdsSectionCode: pickInvoiceField(invoice, "tdsSectionCode", "tds_section_code"),
    tdsRate: pickInvoiceField(invoice, "tdsRate", "tds_rate"),
    netAmount: pickInvoiceField(invoice, "netAmount", "net_amount"),
    approvalWorkflowName:
      pickInvoiceField(invoice, "approvalWorkflowName", "approval_workflow_name") ??
      pickInvoiceField(invoice, "workflowName", "workflow_name"),
    approvalWorkflowId: pickInvoiceField(invoice, "approvalWorkflowId", "approval_workflow_id"),
    departmentId: pickInvoiceField(invoice, "departmentId", "department_id"),
    departmentName: pickInvoiceField(invoice, "departmentName", "department_name"),
    category,
    categoryId,
    categoryName: invoice.categoryName ?? invoice.category_name ?? category?.name,
    currentFileName: pickInvoiceField(invoice, "currentFileName", "current_file_name"),
    matchingId: pickInvoiceField(invoice, "matchingId", "matching_id"),
    documentType: pickInvoiceField(invoice, "documentType", "document_type", "TAX_INVOICE"),
    linkedProformaInvoiceId: pickInvoiceField(
      invoice,
      "linkedProformaInvoiceId",
      "linked_proforma_invoice_id",
    ),
    linkedProformaInvoiceNumber: pickInvoiceField(
      invoice,
      "linkedProformaInvoiceNumber",
      "linked_proforma_invoice_number",
    ),
    isLinkedToProforma: Boolean(
      invoice.isLinkedToProforma ??
        invoice.is_linked_to_proforma ??
        pickInvoiceField(invoice, "linkedProformaInvoiceId", "linked_proforma_invoice_id"),
    ),
    linkedTaxInvoices: Array.isArray(invoice.linkedTaxInvoices)
      ? invoice.linkedTaxInvoices
      : Array.isArray(invoice.linked_tax_invoices)
        ? invoice.linked_tax_invoices
        : [],
    linkedTaxInvoiceCount: Number(
      invoice.linkedTaxInvoiceCount ??
        invoice.linked_tax_invoice_count ??
        (Array.isArray(invoice.linkedTaxInvoices)
          ? invoice.linkedTaxInvoices.length
          : Array.isArray(invoice.linked_tax_invoices)
            ? invoice.linked_tax_invoices.length
            : 0),
    ),
    piTotalAmount: Number(
      invoice.piTotalAmount ?? invoice.pi_total_amount ?? invoice.netAmount ?? invoice.net_amount ?? 0,
    ),
    piLinkedAmount: Number(invoice.piLinkedAmount ?? invoice.pi_linked_amount ?? 0),
    piRemainingBalance: Number(
      invoice.piRemainingBalance ??
        invoice.pi_remaining_balance ??
        invoice.remainingBalance ??
        invoice.remaining_balance ??
        0,
    ),
    piFullyInvoiced: Boolean(
      invoice.piFullyInvoiced ??
        invoice.pi_fully_invoiced ??
        Number(invoice.piRemainingBalance ?? invoice.pi_remaining_balance ?? 1) <= 0,
    ),
    workflowId:
      pickInvoiceField(invoice, "workflowId", "workflow_id") ??
      pickInvoiceField(invoice, "approvalWorkflowId", "approval_workflow_id"),
    workflowName:
      pickInvoiceField(invoice, "workflowName", "workflow_name") ??
      pickInvoiceField(invoice, "approvalWorkflowName", "approval_workflow_name"),
    requiredApprovalLevels:
      invoice.requiredApprovalLevels ?? invoice.required_approval_levels,
    currentApprovalLevel:
      invoice.currentApprovalLevel ?? invoice.current_approval_level,
    isSequentialApproval:
      invoice.isSequentialApproval ?? invoice.is_sequential_approval,
    isDuplicate: invoice.isDuplicate ?? invoice.is_duplicate ?? invoice.duplicate ?? false,
    invoiceDiscount: pickInvoiceField(invoice, "invoiceDiscount", "invoice_discount"),
    invoiceDiscountType:
      pickInvoiceField(invoice, "invoiceDiscountType", "invoice_discount_type"),
    campaignId: pickInvoiceField(invoice, "campaignId", "campaign_id", ""),
    campaignName: pickInvoiceField(invoice, "campaignName", "campaign_name", ""),
    referenceNumber:
      pickInvoiceField(invoice, "referenceNumber", "reference_number") ||
      pickInvoiceField(invoice, "referenceCode", "reference_code", ""),
    lineItemsExpanded:
      invoice.lineItemsExpanded ??
      invoice.line_items_expanded ??
      true,
    canCancel:
      invoice.canCancel ??
      invoice.can_cancel ??
      invoice.cancellable ??
      invoice.isCancellable ??
      false,
    cancelDisabledReason:
      invoice.cancelDisabledReason ??
      invoice.cancel_disabled_reason ??
      invoice.cancellationDisabledReason ??
      "",
    ...normalizeMsmePaymentDue(invoice),
  };
};

export const toInvoiceUiPayload = normalizeInvoiceResponse;

/** Builds camelCase API payload from camelCase form/list state. */
export const buildInvoiceApiPayload = (invoice = {}, options = {}) => {
  const {
    totals,
    tdsAmount,
    uploadedFileName,
    categoryEnabled = true,
    campaignEnabled = true,
    erpIntegrationEnabled = true,
  } = options;
  const lineItemsSource = invoice.lineItems ?? invoice.line_items ?? [];
  const lineItemMode = pickInvoiceField(invoice, "lineItemMode", "line_item_mode", "DETAILED");
  const isSummaryOnly = lineItemMode === "SUMMARY_ONLY";
  const lineItemsRemoved = Boolean(
    invoice.lineItemsRemoved ?? invoice.line_items_removed ?? false,
  );
  const normalizedLineItems = Array.isArray(lineItemsSource)
    ? lineItemsSource.map(normalizeInvoiceLineItem)
    : [];
  const removedLineItemsCount = Number(
    pickInvoiceField(invoice, "removedLineItemsCount", "removed_line_items_count") ??
      pickInvoiceField(invoice, "previousLineItemCount", "previous_line_item_count") ??
      0,
  ) || 0;

  const subTotalFromLines = isSummaryOnly
    ? Number(
        pickInvoiceField(invoice, "subTotal", "sub_total") ??
          pickInvoiceField(invoice, "subtotal", "subtotal", 0),
      ) || 0
    : normalizedLineItems.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0,
      );
  const gstAmount = roundMoney(
    isSummaryOnly
      ? Number(
          pickInvoiceField(invoice, "totalTaxAmount", "total_tax_amount") ??
            pickInvoiceField(invoice, "gstAmount", "gst_amount", 0),
        ) || 0
      : totals != null
      ? (Number(totals.cgst) || 0) +
        (Number(totals.sgst) || 0) +
        (Number(totals.igst) || 0) +
        (Number(totals.foreignTax) || 0)
      : Number(pickInvoiceField(invoice, "gstAmount", "gst_amount", 0)),
  );
  const totalAmount =
    totals?.total != null
      ? roundMoney(totals.total)
      : roundMoney(Number(
          invoice.totalAmount ?? invoice.total_amount ?? subTotalFromLines + gstAmount,
        ) || 0);
  const resolvedTdsAmount =
    tdsAmount !== undefined
      ? tdsAmount === null
        ? null
        : roundMoney(tdsAmount)
      : roundMoney(Number(pickInvoiceField(invoice, "tdsAmount", "tds_amount", 0)));
  const explicitNetAmount = pickInvoiceField(invoice, "netAmount", "net_amount");
  const explicitNetPayable = pickInvoiceField(invoice, "netPayable", "net_payable");
  const resolvedNetAmount =
    explicitNetAmount !== undefined && explicitNetAmount !== null && explicitNetAmount !== ""
      ? roundMoney(explicitNetAmount)
      : explicitNetPayable !== undefined && explicitNetPayable !== null && explicitNetPayable !== ""
        ? roundMoney(explicitNetPayable)
        : roundMoney(Math.max(totalAmount - (Number(resolvedTdsAmount) || 0), 0));
  const parsedTdsSelection = resolveTdsSelection(
    pickInvoiceField(invoice, "tds", "tds", ""),
  );
  const tdsSelection = {
    tdsSectionId:
      pickInvoiceField(invoice, "tdsSectionId", "tds_section_id") ??
      parsedTdsSelection.tdsSectionId,
    tdsSectionCode:
      pickInvoiceField(invoice, "tdsSectionCode", "tds_section_code") ??
      parsedTdsSelection.tdsSectionCode,
    tdsRate:
      pickInvoiceField(invoice, "tdsRate", "tds_rate") ??
      parsedTdsSelection.tdsRate,
  };

  const source = normalizeInvoiceSource(invoice.source);
  const originalFileName =
    pickInvoiceField(invoice, "originalFileName", "original_file_name") ??
    pickInvoiceField(invoice, "originalFileName", "original_filename") ??
    null;
  const currentFileName =
    pickInvoiceField(invoice, "currentFileName", "current_file_name") ??
    uploadedFileName ??
    originalFileName;

  const category = categoryEnabled ? resolveInvoiceCategoryPayload(invoice) : undefined;
  const normalizedSource = source;
  const dueDate = toLocalDateTimeString(pickInvoiceField(invoice, "dueDate", "due_date", ""));

  return {
    invoiceNumber: pickInvoiceField(invoice, "invoiceNumber", "invoice_number", ""),
    vendorId: pickInvoiceField(invoice, "vendorId", "vendor_id", ""),
    vendorName: pickInvoiceField(invoice, "vendorName", "vendor_name", ""),
    lineItemMode,
    lineItemsRemoved,
    removedLineItemsCount: isSummaryOnly ? removedLineItemsCount : 0,
    lineItems: isSummaryOnly
      ? []
      : normalizedLineItems.map((item) =>
          toInvoiceLineItemApiPayload(item, { erpIntegrationEnabled }),
        ),
    subTotal: roundMoney(subTotalFromLines),
    totalTaxAmount: gstAmount,
    invoiceDate: toLocalDateTimeString(
      pickInvoiceField(invoice, "invoiceDate", "invoice_date", ""),
    ),
    dueDate: dueDate || null,
    totalAmount,
    amount: resolvedNetAmount,
    netAmount: resolvedNetAmount,
    netPayable: resolvedNetAmount,
    gstAmount,
    tdsAmount: resolvedTdsAmount,
    tdsSectionId: tdsSelection.tdsSectionId,
    tdsSectionCode: tdsSelection.tdsSectionCode,
    tdsRate: tdsSelection.tdsRate,
    ...(erpIntegrationEnabled
      ? {
          voucherType: pickInvoiceField(invoice, "voucherType", "voucher_type", ""),
          tdsNarration:
            pickInvoiceField(invoice, "tdsNarration", "tds_narration") ??
            pickInvoiceField(invoice, "narration", "narration", ""),
          narration:
            pickInvoiceField(invoice, "tdsNarration", "tds_narration") ??
            pickInvoiceField(invoice, "narration", "narration", ""),
        }
      : {}),
    currency:
      normalizeCurrencyCode(
        pickInvoiceField(invoice, "currency", "currency_code", ""),
      ) || DEFAULT_CURRENCY,
    memo:
      invoice.memo ??
      invoice.description ??
      (Array.isArray(invoice.notes) ? invoice.notes.join("\n") : "") ??
      "",
    source: normalizedSource,
    sourceEmail:
      isGmailInvoiceSource(normalizedSource)
        ? pickInvoiceField(invoice, "sourceEmail", "source_email", null)
        : null,
    fileId: pickInvoiceField(invoice, "fileId", "file_id", null),
    fileHash: pickInvoiceField(invoice, "fileHash", "file_hash", null),
    originalFileName,
    currentFileName,
    invoiceFileUrl: pickInvoiceField(invoice, "invoiceFileUrl", "invoice_file_url", null),
    receiptFileUrl: pickInvoiceField(invoice, "receiptFileUrl", "receipt_file_url", null),
    fileCategory:
      pickInvoiceField(invoice, "fileCategory", "file_category", "Expense Invoice"),
    branchName: pickInvoiceField(invoice, "branchName", "branch_name", ""),
    branchCode: pickInvoiceField(invoice, "branchCode", "branch_code", ""),
    branchId: pickInvoiceField(invoice, "branchId", "branch_id", ""),
    vendorBranchName: pickInvoiceField(invoice, "vendorBranchName", "vendor_branch_name", ""),
    vendorBranchCode: pickInvoiceField(invoice, "vendorBranchCode", "vendor_branch_code", ""),
    vendorBranchGstin: pickInvoiceField(invoice, "vendorBranchGstin", "vendor_branch_gstin", ""),
    workItemId: pickInvoiceField(invoice, "workItemId", "work_item_id", ""),
    departmentId: normalizeDepartmentId(
      pickInvoiceField(invoice, "departmentId", "department_id"),
    ),
    departmentName: pickInvoiceField(invoice, "departmentName", "department_name", ""),
    poId: pickInvoiceField(invoice, "poId", "po_id", ""),
    poNumber: pickInvoiceField(invoice, "poNumber", "po_number", ""),
    grnId: pickInvoiceField(invoice, "grnId", "grn_id", ""),
    grnNumber: pickInvoiceField(invoice, "grnNumber", "grn_number", ""),
    matchingId: pickInvoiceField(invoice, "matchingId", "matching_id", ""),
    documentType: pickInvoiceField(invoice, "documentType", "document_type", "TAX_INVOICE"),
    ...(pickInvoiceField(invoice, "linkedProformaInvoiceId", "linked_proforma_invoice_id")
      ? {
          linkedProformaInvoiceId: pickInvoiceField(
            invoice,
            "linkedProformaInvoiceId",
            "linked_proforma_invoice_id",
          ),
        }
      : {}),
    workflowId:
      pickInvoiceField(invoice, "workflowId", "workflow_id") ??
      pickInvoiceField(invoice, "approvalWorkflowId", "approval_workflow_id"),
    workflowName:
      pickInvoiceField(invoice, "workflowName", "workflow_name") ??
      pickInvoiceField(invoice, "approvalWorkflowName", "approval_workflow_name"),
    ...(category ? { category, categoryId: category.id, categoryName: category.name } : {}),
    gstTreatment: pickInvoiceField(invoice, "gstTreatment", "gst_treatment", ""),
    billingGstin: pickInvoiceField(invoice, "billingGstin", "billing_gstin", ""),
    gstin: invoice.gstin ?? invoice.vendorGstin ?? invoice.vendor_gstin ?? "",
    sourceOfSupply: pickInvoiceField(invoice, "sourceOfSupply", "source_of_supply", ""),
    destinationOfSupply:
      pickInvoiceField(invoice, "destinationOfSupply", "destination_of_supply", ""),
    billingAddress: pickInvoiceField(invoice, "billingAddress", "billing_address", ""),
    shippingAddress: pickInvoiceField(invoice, "shippingAddress", "shipping_address", ""),
    discountsLevel: pickInvoiceField(invoice, "discountsLevel", "discounts_level", ""),
    invoiceDiscount: roundMoney(Number(
      pickInvoiceField(invoice, "invoiceDiscount", "invoice_discount", 0),
    )),
    invoiceDiscountType:
      pickInvoiceField(invoice, "invoiceDiscountType", "invoice_discount_type", "%"),
    taxesLevel: pickInvoiceField(invoice, "taxesLevel", "taxes_level", ""),
    invoiceTax: pickInvoiceField(invoice, "invoiceTax", "invoice_tax", ""),
    invoiceTaxName: pickInvoiceField(invoice, "invoiceTaxName", "invoice_tax_name", ""),
    invoiceTaxRate: pickInvoiceField(invoice, "invoiceTaxRate", "invoice_tax_rate", ""),
    roundOff: roundMoney(pickInvoiceField(invoice, "roundOff", "round_off") ?? invoice.roundoff),
    ...(invoice.status != null && invoice.status !== ""
      ? { status: invoice.status }
      : {}),
    ...(invoice.action != null && invoice.action !== ""
      ? { action: invoice.action }
      : {}),
    ...(campaignEnabled && pickInvoiceField(invoice, "campaignId", "campaign_id")
      ? {
          campaignId: pickInvoiceField(invoice, "campaignId", "campaign_id"),
          campaignName: pickInvoiceField(invoice, "campaignName", "campaign_name", ""),
          referenceNumber:
            pickInvoiceField(invoice, "referenceNumber", "reference_number") ||
            pickInvoiceField(invoice, "referenceCode", "reference_code", ""),
        }
      : {}),
    lineItemsExpanded:
      invoice.lineItemsExpanded ??
      invoice.line_items_expanded ??
      true,
  };
};

export const buildCreateInvoiceRequestBody = buildInvoiceApiPayload;
export const toInvoiceApiPayload = buildInvoiceApiPayload;

export const EMPTY_INVOICE_LIST_RESPONSE = {
  items: [],
  total: 0,
  offset: 0,
  limit: 0,
  hasMore: false,
  statusCounts: null,
};

export const EMPTY_INVOICE_FILTER_OPTIONS = {
  vendors: [],
  branches: [],
  statuses: [],
  quickFilters: [],
};

const unwrapInvoiceFilterList = (response, keys = []) => {
  if (Array.isArray(response)) return response;
  const payload = response?.data ?? response ?? {};
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const normalizeInvoiceFilterVendorOptions = (vendors = []) =>
  vendors
    .map((vendor) => {
      const value = vendor?.id ?? vendor?.vendorId ?? vendor?.vendor_id;
      const label = vendor?.name ?? vendor?.vendorName ?? vendor?.vendor_name ?? "";
      if (value === undefined || value === null || !String(label).trim()) {
        return null;
      }
      return {
        value: String(value),
        label: String(label),
        isPendingApproval: Boolean(
          vendor?.isPendingApproval ?? vendor?.is_pending_approval,
        ),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));

const normalizeInvoiceFilterBranchOptions = (branches = []) =>
  branches
    .map((branch) => {
      const branchCode = String(
        branch?.branchCode ?? branch?.branch_code ?? branch?.code ?? "",
      ).trim();
      const branchName = String(
        branch?.branchName ?? branch?.branch_name ?? branch?.name ?? "",
      ).trim();
      const value = branchCode || branchName;
      if (!value) return null;
      const label =
        branchName && branchCode
          ? `${branchName} (${branchCode})`
          : branchName || branchCode;
      return { value, label };
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));

const normalizeInvoiceFilterSelectOptions = (options = []) =>
  options
    .map((option) => {
      if (typeof option === "string") {
        const value = option.trim();
        return value ? { value, label: value } : null;
      }
      const value = option?.value ?? option?.id ?? option?.status ?? "";
      const label = option?.label ?? option?.name ?? value;
      if (!String(value).trim()) return null;
      return {
        value: String(value),
        label: String(label),
        ...(option?.count !== undefined && option?.count !== null
          ? { count: Number(option.count) || 0 }
          : {}),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));

export const normalizeInvoiceFilterOptions = (response) => {
  const payload = response?.data ?? response ?? {};

  return {
    vendors: normalizeInvoiceFilterVendorOptions(
      unwrapInvoiceFilterList(payload, ["vendors", "items", "content"]),
    ),
    branches: normalizeInvoiceFilterBranchOptions(
      unwrapInvoiceFilterList(payload, ["branches", "items", "content"]),
    ),
    statuses: normalizeInvoiceFilterSelectOptions(
      unwrapInvoiceFilterList(payload, ["statuses", "items", "content"]),
    ),
    quickFilters: normalizeInvoiceFilterSelectOptions(
      unwrapInvoiceFilterList(payload, ["quickFilters", "quick_filters", "items", "content"]),
    ),
  };
};

const normalizeInvoiceStatusCounts = (statusCounts) => {
  if (!statusCounts || typeof statusCounts !== "object") {
    return null;
  }

  return {
    saved: Number(statusCounts.SAVED ?? statusCounts.saved ?? 0) || 0,
    pending: Number(statusCounts.PENDING ?? statusCounts.pending ?? 0) || 0,
    approved: Number(statusCounts.APPROVED ?? statusCounts.approved ?? 0) || 0,
    total: Number(statusCounts.TOTAL ?? statusCounts.total ?? 0) || 0,
  };
};

const buildInvoiceListResponse = ({
  rawItems = [],
  total,
  offset = 0,
  limit,
  hasMore = false,
  statusCounts = null,
} = {}) => {
  const items = rawItems.map(toInvoiceUiPayload);

  return {
    items,
    total: Number(total ?? items.length) || 0,
    offset: Number(offset) || 0,
    limit: Number(limit ?? items.length) || 0,
    hasMore: Boolean(hasMore),
    statusCounts: normalizeInvoiceStatusCounts(statusCounts),
  };
};

export const normalizeInvoiceListResponse = (response) => {
  if (Array.isArray(response)) {
    return buildInvoiceListResponse({
      rawItems: response,
      total: response.length,
      limit: response.length,
    });
  }

  if (response && typeof response === "object") {
    const rawItems = Array.isArray(response.invoices)
      ? response.invoices
      : Array.isArray(response.items)
        ? response.items
        : null;

    if (rawItems) {
      return buildInvoiceListResponse({
        rawItems,
        total: response.totalInvoices ?? response.total ?? rawItems.length,
        offset: response.offset,
        limit: response.limit ?? rawItems.length,
        hasMore: response.hasMore,
        statusCounts: response.statusCounts,
      });
    }

    if (response.id || response.invoiceNumber || response.invoice_number) {
      return buildInvoiceListResponse({
        rawItems: [response],
        total: 1,
        limit: 1,
      });
    }
  }

  return EMPTY_INVOICE_LIST_RESPONSE;
};

export const getInvoiceListItems = (data) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.content)) return data.content;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.invoices)) return data.invoices;
  }
  return [];
};

export const mergeInvoiceVendorOptions = (vendors = []) => {
  const list = Array.isArray(vendors) ? vendors : [];
  const merged = new Map();

  list.forEach((vendor) => {
    if (vendor?.id === undefined || vendor?.id === null) return;
    const statusKey = String(vendor.status || "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ");
    const isPendingApproval =
      statusKey === "pending approval" ||
      statusKey === "create request" ||
      statusKey === "vendor approval pending";

    merged.set(String(vendor.id), {
      ...vendor,
      isPendingApproval,
    });
  });

  return Array.from(merged.values());
};
