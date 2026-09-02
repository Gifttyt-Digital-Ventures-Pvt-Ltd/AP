import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import {
  useGetInvoiceMandatoryFieldsQuery,
  useLazyGetVendorQuery,
  useLazyGetInvoiceQuery,
  useRequestVendorAdditionMutation,
  useUpdateInvoiceMutation,
  useUpdateInvoiceInternalChecklistMutation,
  useCheckInvoiceMutation,
} from "../../../Services/apis/invoicesVendorsApi";
import {
  useGetCorporateUserDetailsQuery,
} from "../../../Services/apis/corporateApi";
import { useGetCategoriesForInvoiceQuery } from "../../../Services/apis/categoriesApi";
import { useGetDepartmentsForInvoiceQuery } from "../../../Services/apis/departmentsApi";
import { extractVendorIdFromResponse } from "../../../Services/utils/payloadMappers";
import { useAuth } from "../../../contexts/AuthContext";
import { useRBAC } from "../../../contexts/RBACContext";
import { useActionGuard } from "../../../hooks/useActionGuard";
import EditDialog from "../../invoices/components/EditDialog";
import RequestVendorDialog from "../../invoices/components/RequestVendorDialog";
import { InvoiceForm } from "../../invoices/components/InvoiceForm";
import InvoiceFlagsDialog from "../../invoices/components/flags/InvoiceFlagsDialog";
import { useInvoiceFlags } from "../../invoices/hooks/useInvoiceFlags";
import useChecklistFlagsSubscription from "../../../hooks/useChecklistFlagsSubscription";
import {
  scrollToInvoiceField,
  resolveFixInFormFieldKey,
  labelForFieldKey,
} from "../../invoices/utils/invoiceFieldNavigation";
import {
  GST_TREATMENTS,
  INDIAN_STATES,
  isGmailInvoiceSource,
  LEDGER_OPTIONS,
  TAX_RATES,
} from "../../invoices/constants";
import { buildInvoiceEditFormData } from "../../invoices/utils/invoiceFormData";
import {
  getInvoiceMandatoryFieldValidationMessage,
  isInvoiceMandatoryFieldsSatisfied,
  normalizeInvoiceMandatoryFields,
} from "../../invoices/utils/mandatoryFields";
import { getInvoiceDueDateValidationErrorForInvoice } from "../../invoices/utils/msmePaymentDue";
import {
  applyForeignLineItemTax,
  applyInrLineItemTax,
  calculateInvoiceTotals,
  createDefaultLineItem,
  getTotalTaxAmountFromTotals,
  INVOICE_LEVEL,
  isInrInvoiceCurrency,
  resolveLineItemSubtotal,
  syncLineItemLineTotal,
} from "../../invoices/utils/invoiceTax";
import {
  buildToCreateInvoicePayload,
  calculateInvoiceDataTotals,
  computeTdsAmount,
  normalizeLineItemsForTaxLevel,
} from "../../invoices/utils/invoicePayloadBuilders";
import {
  createEmptyVendorRequestForm,
  buildVendorRequestForm,
} from "../../invoices/utils/invoiceBulkUtils";
import { getInvoiceVendorRequestValidationErrors } from "../../../utils/vendorValidation";
import {
  isCheckerEditEnabled as isCheckerEditEnabledForCorporate,
  isCheckerEditForbiddenError,
  isInternalChecklistEnabled as isInternalChecklistEnabledForCorporate,
  isNetPayableEditEnabled as isNetPayableEditEnabledForCorporate,
} from "../../../utils/invoiceConfiguration";
import { getActiveInternalChecklistItems } from "../../invoices/utils/internalChecklist";
import {
  buildCurrentUserIdentity,
  canEditInvoice,
  canReopenInvoiceFlagsForInvoice,
  canResolveInvoiceFlag,
  extractApiErrorDetail,
  getInvoiceEditBlockedMessage,
  isSavedInvoiceStatus,
  shouldCheckerSubmitOnUpdate,
} from "../../../utils/approvalWorkflow";
import { FULL_ACCESS_PERMISSION } from "../../../constants/rbacPolicy";
import { DEFAULT_CURRENCY } from "../../../utils/currency";

export const useApprovalsInvoiceEdit = ({
  currencies = [],
  currencyParam,
  onRefresh,
  onInternalChecklistSaved,
  renderPdfPreview,
  pdfZoom,
  viewPreviewError,
  setViewPreviewError,
  onViewInvoice,
}) => {
  const { user } = useAuth();
  const {
    corporateScreens,
    isCategoryFeatureEnabled,
    isDepartmentFeatureEnabled,
    isCampaignFeatureEnabled,
    isConnectedBankingEnabled,
    isCorporateAdmin,
    hasPermission,
    isBranchEnabled,
    isCorporateSectionEnabled,
  } = useRBAC();
  // Same single source of truth InvoicesPage.jsx uses for the maker flow
  // (showErpIntegrationFields), so the same invoice under the same org
  // config evaluates LINE_GROUP_BRANCH_UNASSIGNED/EXPENSE_TYPE_UNASSIGNED
  // identically for maker and reviewer — deliberately not conditioned on
  // whether this screen's own <InvoiceForm> renders the ERP columns (it
  // doesn't, a separate pre-existing gap, out of scope here).
  const isErpIntegrationEnabled = isCorporateSectionEnabled("SETTINGS_INTEGRATIONS");
  const { isChecklistFlagsEnabled } = useChecklistFlagsSubscription();
  const { guardAction, canPerformAction } = useActionGuard();

  const canUpdateInvoices = canPerformAction("invoices.update");
  const canManageInvoices = canPerformAction("invoices.create");
  const canCheckInvoices = canPerformAction("invoices.check");
  const canApproveInvoices = canPerformAction("invoices.approve");
  const canAddVendors = canPerformAction("invoices.addVendor");
  const isMasterAdmin = hasPermission("master-admin");

  const { data: corporateUserContext = null } =
    useGetCorporateUserDetailsQuery();
  const invoiceUserEmail =
    corporateUserContext?.corporateUser?.email ||
    corporateUserContext?.employeeDetails?.email ||
    user?.email ||
    user?.identifier ||
    "";

  // Lazy single-vendor fetch — no full-list preload.
  // ConnectedVendorPicker (inside InvoiceForm) handles search/pagination itself.
  const [fetchVendorById] = useLazyGetVendorQuery();
  const vendorCacheRef = useRef({});

  // Duplicate Invoice flag's "view invoice" action (DuplicateInvoicesListDialog)
  // — same goal as InvoicesPage.jsx's own handleViewLinkedInvoice: open the
  // colliding invoice in the existing read-only ViewDialog (via the caller's
  // own onViewInvoice, e.g. Approvals.jsx's handleViewInvoice) instead of a
  // new tab, so the invoice currently being reviewed is never disturbed.
  // Unlike InvoicesPage.jsx, this screen has no locally-loaded "all invoices"
  // list to check first (the checker/approver queue is a different, narrower
  // list) — always fetches by id.
  const [fetchInvoiceById] = useLazyGetInvoiceQuery();
  const handleViewDuplicateInvoice = useCallback(
    async (match) => {
      if (!match?.id) return;
      try {
        const invoice = await fetchInvoiceById(match.id).unwrap();
        onViewInvoice?.(invoice);
      } catch {
        toast.error("Could not open that invoice.");
      }
    },
    [fetchInvoiceById, onViewInvoice],
  );

  const resolveVendorById = useCallback(
    async (vendorId) => {
      if (!vendorId) return null;
      const key = String(vendorId);
      if (vendorCacheRef.current[key]) return vendorCacheRef.current[key];
      try {
        const result = await fetchVendorById(vendorId).unwrap();
        if (result) vendorCacheRef.current[key] = result;
        return result || null;
      } catch {
        return null;
      }
    },
    [fetchVendorById],
  );

  const { data: departmentsData = [] } = useGetDepartmentsForInvoiceQuery(
    {
      userEmail: invoiceUserEmail,
      ...(currencyParam ? { currency: currencyParam } : {}),
    },
    { skip: !invoiceUserEmail || !isDepartmentFeatureEnabled },
  );
  const {
    data: invoiceMandatoryFieldsData,
    isLoading: invoiceMandatoryFieldsLoading,
  } = useGetInvoiceMandatoryFieldsQuery(
    { userEmail: invoiceUserEmail },
    { skip: !invoiceUserEmail },
  );
  const {
    data: invoiceCategoriesData = [],
    isLoading: invoiceCategoriesLoading,
    isFetching: invoiceCategoriesFetching,
  } = useGetCategoriesForInvoiceQuery(
    {
      userEmail: invoiceUserEmail,
      ...(currencyParam ? { currency: currencyParam } : {}),
    },
    { skip: !invoiceUserEmail || !isCategoryFeatureEnabled },
  );

  const [updateInvoice, { isLoading: updateInvoiceLoading }] =
    useUpdateInvoiceMutation();
  const [updateInvoiceInternalChecklist, { isLoading: savingInternalChecklist }] =
    useUpdateInvoiceInternalChecklistMutation();
  const [checkInvoice, { isLoading: checkInvoiceLoading }] =
    useCheckInvoiceMutation();
  const [requestVendorAddition, { isLoading: requestVendorLoading }] =
    useRequestVendorAdditionMutation();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [formData, setFormData] = useState(null);
  // View Invoice -> Fix in Form: the target flag to scroll to once the Edit
  // dialog this opens has actually mounted (see the effect near
  // handleFixInvoiceFlagInFormFromView below).
  const [pendingFixInFormFlag, setPendingFixInFormFlag] = useState(null);
  const [checkerSubmitConfirmOpen, setCheckerSubmitConfirmOpen] = useState(false);
  const [requestVendorOpen, setRequestVendorOpen] = useState(false);
  const [requestVendorForm, setRequestVendorForm] = useState(
    createEmptyVendorRequestForm(),
  );

  // No invoiceVendorOptions list — picker fetches on demand.
  // Currency options come from the app-level currencies prop (already passed in).
  const departments = Array.isArray(departmentsData) ? departmentsData : [];
  const invoiceCategories =
    isCategoryFeatureEnabled && Array.isArray(invoiceCategoriesData)
      ? invoiceCategoriesData
      : [];
  const invoiceMandatoryFields = useMemo(
    () => normalizeInvoiceMandatoryFields(invoiceMandatoryFieldsData),
    [invoiceMandatoryFieldsData],
  );
  const mandatoryFieldOptions = useMemo(
    () => ({
      showDepartmentField: isDepartmentFeatureEnabled,
      showCategoryField: isCategoryFeatureEnabled,
    }),
    [isDepartmentFeatureEnabled, isCategoryFeatureEnabled],
  );
  const invoiceCurrencyOptions = useMemo(
    () => currencies.filter((currency) => currency !== "ALL"),
    [currencies],
  );

  const isCheckerEditEnabled = useMemo(
    () =>
      isCheckerEditEnabledForCorporate(
        corporateScreens?.activeInvoiceConfiguration ?? [],
      ),
    [corporateScreens?.activeInvoiceConfiguration],
  );
  const isNetPayableEditEnabled = useMemo(
    () =>
      isNetPayableEditEnabledForCorporate(
        corporateScreens?.activeInvoiceConfiguration ?? [],
      ),
    [corporateScreens?.activeInvoiceConfiguration],
  );
  const isInternalChecklistEnabled = useMemo(
    () =>
      isInternalChecklistEnabledForCorporate(
        corporateScreens?.activeInvoiceConfiguration ?? [],
      ),
    [corporateScreens?.activeInvoiceConfiguration],
  );
  const internalChecklistItems = useMemo(
    () =>
      getActiveInternalChecklistItems(
        corporateScreens?.activeInternalChecklistItems ?? [],
      ),
    [corporateScreens?.activeInternalChecklistItems],
  );
  // Internal Checklist stays editable after the invoice itself becomes
  // read-only (e.g. Approved) — Maker/Admin/Master Admin only, no Checker.
  // Reuses the same role signals already computed above rather than a new
  // RBAC permission key.
  const canEditInternalChecklist = canManageInvoices || isCorporateAdmin || isMasterAdmin;

  const invoiceEditContext = useMemo(
    () => ({
      ...buildCurrentUserIdentity({ user, corporateUserContext }),
      canUpdateInvoices,
      canManageInvoices,
      canCheckInvoices,
      isCorporateAdmin: isCorporateAdmin || isMasterAdmin,
      isCheckerEditEnabled,
    }),
    [
      user,
      corporateUserContext,
      canUpdateInvoices,
      canManageInvoices,
      canCheckInvoices,
      isCorporateAdmin,
      isMasterAdmin,
      isCheckerEditEnabled,
    ],
  );

  // findVendorByName: check the local cache only (populated when edit dialog opens)
  const findVendorByName = useCallback(
    (vendorName) => {
      if (!vendorName) return null;
      const lowerName = String(vendorName).toLowerCase().trim();
      return (
        Object.values(vendorCacheRef.current).find((v) =>
          String(v?.name ?? v?.vendorName ?? "").toLowerCase().trim() === lowerName,
        ) || null
      );
    },
    [],
  );

  // findVendorById: check cache synchronously (populated by resolveVendorById)
  const findVendorById = useCallback(
    (vendorId) => {
      if (vendorId === null || vendorId === undefined || vendorId === "") return null;
      return vendorCacheRef.current[String(vendorId)] || null;
    },
    [],
  );

  // Reopen must be gated per-invoice, not per-user-role — see
  // canReopenInvoiceFlagsForInvoice's own doc comment (utils/approvalWorkflow.js)
  // for why, and Approvals.jsx's handleApprovalAction/viewInvoiceCanAct for
  // the pattern this mirrors.
  const canReopenInvoiceFlags = canReopenInvoiceFlagsForInvoice(editingInvoice, {
    canCheckInvoices,
    canApproveInvoices,
  });

  const invoiceFlags = useInvoiceFlags({
    formData,
    setFormData,
    findVendorById,
    findVendorByName,
    excludeInvoiceId: editingInvoice?.id ?? null,
    checklistOptions: {
      departmentMandatory: invoiceMandatoryFields.department,
      categoryMandatory: invoiceMandatoryFields.category,
      showDepartmentField: isDepartmentFeatureEnabled,
      showCategoryField: isCategoryFeatureEnabled,
    },
    isNetPayableEditEnabled,
    isCampaignFeatureEnabled,
    isErpIntegrationEnabled,
    isBankIntegrationEnabled: isConnectedBankingEnabled,
    isChecklistFlagsEnabled,
    skip: !formData,
  });

  const handleFixInvoiceFlagInForm = (flag) => {
    // Tax Total Does Not Reconcile has no single field to jump to — its fix
    // is to accept the line items' own math as correct and sync the
    // declared Total Tax to match, which is what actually clears it (see
    // the design notes in flagRules/taxCompliance.js).
    if (flag?.key === "TAX_TOTAL_DOES_NOT_RECONCILE") {
      setFormData((prev) => {
        if (!prev) return prev;
        const totals = calculateInvoiceDataTotals(prev);
        const reconciledTaxTotal = Math.round(getTotalTaxAmountFromTotals(totals) * 100) / 100;
        return { ...prev, totalTaxAmount: reconciledTaxTotal, lastReconciledTaxTotal: reconciledTaxTotal };
      });
      toast.success("Total Tax synced to match the line items.");
      return;
    }

    const { fieldKey, lineId } = resolveFixInFormFieldKey(flag);
    // Small delay so this runs after the Flags dialog's own close animation,
    // not while its overlay is still covering the field being scrolled to.
    window.setTimeout(() => {
      const scrolled = scrollToInvoiceField(fieldKey, lineId);
      if (!scrolled) {
        const lineNote = flag?.evidence?.lineNumber ? ` (Line ${flag.evidence.lineNumber})` : "";
        toast.info(`Check the "${labelForFieldKey(fieldKey) || flag?.title || "flagged"}" details on the invoice.${lineNote}`);
      }
    }, 150);
  };

  const getDepartmentNameById = (departmentId) => {
    const selectedDepartment = departments.find(
      (department) =>
        String(
          department?.id ??
            department?.departmentId ??
            department?.departmentId ??
            "",
        ) === String(departmentId ?? ""),
    );
    return (
      selectedDepartment?.name ||
      selectedDepartment?.departmentName ||
      selectedDepartment?.departmentName ||
      ""
    );
  };

  const getCategoryNameById = (categoryId) => {
    if (!isCategoryFeatureEnabled) return "";
    const selectedCategory = invoiceCategories.find(
      (category) => String(category?.id ?? "") === String(categoryId ?? ""),
    );
    return selectedCategory?.name || "";
  };

  const toCreateInvoicePayload = (invoiceData = {}, options = {}) =>
    buildToCreateInvoicePayload(
      invoiceData,
      options,
      {
        findVendorByName,
        getDepartmentNameById,
        getCategoryNameById,
        isCategoryFeatureEnabled,
        isCampaignFeatureEnabled,
      },
    );

  const clearScannedTaxSummary = (data = {}) => ({
    ...data,
    scannedTaxAmount: undefined,
    scannedTaxName: undefined,
    scannedTaxRate: undefined,
    scannedTotal: undefined,
  });

  const calculateLineItemSubtotal = (item) => {
    if (formData?.discountsLevel === INVOICE_LEVEL) {
      const lineTotal = Number.parseFloat(item.lineTotal ?? item.amount) || 0;
      if (lineTotal > 0) return lineTotal;
      return (
        (Number.parseFloat(item.quantity) || 0) *
        (Number.parseFloat(item.unitRate) || 0)
      );
    }
    return resolveLineItemSubtotal(item);
  };

  const calculateTotals = (
    lineItems,
    currency = formData?.currency ?? DEFAULT_CURRENCY,
  ) =>
    calculateInvoiceTotals({
      lineItems,
      currency,
      calculateLineItemSubtotal,
      taxRates: TAX_RATES,
      invoiceTaxAmount: formData?.scannedTaxAmount,
      invoiceTaxName:
        formData?.taxesLevel === INVOICE_LEVEL
          ? formData?.invoiceTaxName
          : formData?.scannedTaxName,
      invoiceTaxRate:
        formData?.taxesLevel === INVOICE_LEVEL
          ? formData?.invoiceTaxRate
          : formData?.scannedTaxRate,
      invoiceTax: formData?.invoiceTax,
      taxesLevel: formData?.taxesLevel,
      discountsLevel: formData?.discountsLevel,
      invoiceDiscount: formData?.invoiceDiscount,
      invoiceDiscountType: formData?.invoiceDiscountType,
      roundOff: formData?.roundOff ?? formData?.round_off ?? formData?.roundoff,
      invoiceTotal: formData?.scannedTotal ?? formData?.invoiceTotal,
    });

  const addLineItem = () => {
    setFormData((prev) =>
      clearScannedTaxSummary({
        ...prev,
        lineItems: [...prev.lineItems, createDefaultLineItem(prev.currency)],
      }),
    );
  };

  const removeLineItem = (index) => {
    setFormData((prev) =>
      clearScannedTaxSummary({
        ...prev,
        lineItems: prev.lineItems.filter((_, i) => i !== index),
      }),
    );
  };

  const updateLineItem = (index, field, value) => {
    setFormData((prev) =>
      clearScannedTaxSummary({
        ...prev,
        lineItems: prev.lineItems.map((item, i) => {
          if (i !== index) return item;

          let updated = { ...item, [field]: value };
          if (field === "quantity" || field === "unitRate") {
            updated = syncLineItemLineTotal(updated);
          }
          if (!isInrInvoiceCurrency(prev.currency)) {
            if (field === "taxName" || field === "taxRate") {
              updated = applyForeignLineItemTax(
                updated,
                field === "taxName" ? value : updated.taxName,
                field === "taxRate" ? value : updated.taxRate,
              );
            }
          } else if (field === "tax") {
            updated = applyInrLineItemTax(updated, value);
          }

          return updated;
        }),
      }),
    );
  };

  const validateMandatoryPayload = (payload) => {
    const dueDateError = getInvoiceDueDateValidationErrorForInvoice(payload, {
      findVendorById,
      findVendorByName,
    });
    if (dueDateError) {
      toast.error(dueDateError);
      return false;
    }

    const message = getInvoiceMandatoryFieldValidationMessage(
      payload,
      invoiceMandatoryFields,
      mandatoryFieldOptions,
    );
    if (message) {
      toast.error(message);
      return false;
    }
    return true;
  };

  const validateSavedInvoiceEdit = (payload) => {
    if (!payload?.vendorName?.trim()) {
      toast.error("Vendor name is required");
      return false;
    }
    if (!payload.vendorId && !payload.vendorRequestSubmitted) {
      toast.error("Please select or request a vendor before saving");
      return false;
    }
    return validateMandatoryPayload(payload);
  };

  const canSubmitSavedDraft = (payload) =>
    Boolean(payload?.vendorName?.trim()) &&
    (Boolean(payload?.vendorId) || Boolean(payload?.vendorRequestSubmitted)) &&
    !invoiceMandatoryFieldsLoading &&
    isInvoiceMandatoryFieldsSatisfied(
      payload,
      invoiceMandatoryFields,
      mandatoryFieldOptions,
    );

  const buildUpdateInvoiceBody = (data, { keepSaved = false } = {}) => {
    const totals = calculateTotals(data.lineItems, data.currency);
    const resolvedVendorId =
      data.vendorId || findVendorByName(data.vendorName)?.id || "";

    return toCreateInvoicePayload(
      {
        ...data,
        vendorId: resolvedVendorId,
        vendorName: data.vendorName?.trim() || "",
        lineItems: normalizeLineItemsForTaxLevel({
          ...data,
          lineItems: data.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitRate,
            amount: calculateLineItemSubtotal(item),
            tax: item.tax,
            taxName: item.taxName,
            taxRate: item.taxRate,
            hsnSac: item.hsnSac,
          })),
        }),
        memo: data.description,
        sourceEmail: isGmailInvoiceSource(data.source) ? data.sourceEmail : null,
        departmentName:
          data.departmentName || getDepartmentNameById(data.departmentId),
        ...(keepSaved ? { action: "saved" } : {}),
      },
      {
        totals,
        tdsAmount: computeTdsAmount(
          data.lineItems,
          data.tds,
          calculateLineItemSubtotal,
          data.tdsRate,
        ),
      },
    );
  };

  const resetEditState = () => {
    setEditDialogOpen(false);
    setEditingInvoice(null);
    setFormData(null);
    setCheckerSubmitConfirmOpen(false);
  };

  const performUpdate = async ({ submitCheckerAfterSave = false } = {}) => {
    const isSavedDraft = isSavedInvoiceStatus(editingInvoice?.status);
    const body = buildUpdateInvoiceBody(formData, { keepSaved: isSavedDraft });

    await updateInvoice({
      id: editingInvoice.id,
      body,
    }).unwrap();

    if (submitCheckerAfterSave) {
      await checkInvoice({
        id: editingInvoice.id,
        body: { action: "Checked", comments: "" },
      }).unwrap();
    }
  };

  const handleEditInvoice = async (invoice) => {
    if (!canEditInvoice(invoice, invoiceEditContext)) {
      toast.error(getInvoiceEditBlockedMessage(invoice, invoiceEditContext));
      return;
    }

    // Pre-populate vendor cache so findVendorById/findVendorByName work
    // immediately when InvoiceForm renders — no full-list fetch needed.
    const vendorId = invoice?.vendorId ?? invoice?.vendor_id;
    if (vendorId) {
      await resolveVendorById(vendorId);
    }

    setEditingInvoice(invoice);
    setFormData(
      buildInvoiceEditFormData(invoice, {
        isCategoryFeatureEnabled,
        isCampaignFeatureEnabled,
        findVendorByName,
        findVendorById,
      }),
    );
    setEditDialogOpen(true);
  };

  // View Invoice -> Fix in Form: opens Edit for the same invoice (reusing
  // handleEditInvoice unchanged), then records which flag to scroll to once
  // the Edit form has actually mounted. Takes the invoice explicitly since
  // this hook has no viewInvoice of its own — Approvals.jsx's viewInvoice is
  // what's passed in, after it closes its own View dialog. Only ever wired
  // up when canEdit(invoice) is true (see invoiceFlagsOrgContext below), so
  // handleEditInvoice's own permission check here is a redundant safety net.
  const handleFixInvoiceFlagInFormFromView = async (invoice, flag) => {
    await handleEditInvoice(invoice);
    setPendingFixInFormFlag(flag);
  };

  // Fires once the Edit dialog opened above has actually mounted formData —
  // then reuses handleFixInvoiceFlagInForm completely unchanged, including
  // its TAX_TOTAL_DOES_NOT_RECONCILE special case and its own 150ms delay
  // for the dialog's own open animation.
  useEffect(() => {
    if (!editDialogOpen || !formData || !pendingFixInFormFlag) return;
    const flag = pendingFixInFormFlag;
    setPendingFixInFormFlag(null);
    handleFixInvoiceFlagInForm(flag);
  }, [editDialogOpen, formData, pendingFixInFormFlag]);

  const handleSaveInternalChecklist = async (invoice, nextChecklist) => {
    if (!canEditInternalChecklist) {
      toast.error("You do not have permission to edit the internal checklist");
      return;
    }
    const invoiceId = invoice?.id;
    if (!invoiceId) return;

    try {
      await updateInvoiceInternalChecklist({
        id: invoiceId,
        body: { internalChecklist: nextChecklist },
      }).unwrap();
      toast.success("Internal checklist updated");
      await onInternalChecklistSaved?.(invoice);
    } catch (error) {
      toast.error(extractApiErrorDetail(error) || "Failed to update internal checklist");
    }
  };

  const handleUpdateInvoice = async () => {
    if (!guardAction("invoices.update")) return;
    if (!editingInvoice || !formData) return;

    const isSavedDraft = isSavedInvoiceStatus(editingInvoice.status);
    if (isSavedDraft) {
      if (!validateSavedInvoiceEdit(formData)) return;
    } else if (!validateMandatoryPayload(formData)) {
      return;
    }
    if (!invoiceFlags.guardSubmit()) return;

    const isCheckerUpdateFlow =
      shouldCheckerSubmitOnUpdate(editingInvoice, invoiceEditContext) &&
      !isCorporateAdmin &&
      !hasPermission(FULL_ACCESS_PERMISSION);

    if (isCheckerUpdateFlow) {
      setCheckerSubmitConfirmOpen(true);
      return;
    }

    try {
      await performUpdate();
      toast.success(
        isSavedDraft
          ? "Draft saved successfully"
          : "Invoice updated successfully",
      );
      resetEditState();
      await onRefresh?.();
    } catch (error) {
      if (isCheckerEditForbiddenError(error)) {
        toast.error(
          "Invoice editing during checker review is not enabled for your organization",
        );
        resetEditState();
        return;
      }
      toast.error(extractApiErrorDetail(error) || "Failed to update invoice");
    }
  };

  const confirmCheckerSubmit = async () => {
    if (!editingInvoice || !formData) return;
    if (!guardAction("invoices.update")) return;
    if (!guardAction("invoices.check", "You do not have permission to verify invoices")) {
      return;
    }

    try {
      await performUpdate({ submitCheckerAfterSave: true });
      toast.success("Invoice verified and submitted for approval");
      resetEditState();
      await onRefresh?.();
    } catch (error) {
      if (isCheckerEditForbiddenError(error)) {
        toast.error(
          "Invoice editing during checker review is not enabled for your organization",
        );
        resetEditState();
      } else {
        toast.error(
          extractApiErrorDetail(error) ||
            "Failed to update and submit invoice for approval",
        );
      }
    } finally {
      setCheckerSubmitConfirmOpen(false);
    }
  };

  const handleAddVendorFromInvoice = async () => {
    if (!guardAction("invoices.addVendor")) return;
    if (!formData?.vendorName) {
      toast.error("Vendor name is required");
      return;
    }
    setRequestVendorForm(buildVendorRequestForm(formData));
    setRequestVendorOpen(true);
  };

  const handleSubmitVendorRequest = async (event) => {
    event.preventDefault();
    if (!guardAction("invoices.addVendor")) return;

    const validationErrors =
      getInvoiceVendorRequestValidationErrors(requestVendorForm);
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

    const vendorName = requestVendorForm.name.trim();
    const vendorType =
      requestVendorForm.vendor_type || requestVendorForm.vendorType;
    const gstin = requestVendorForm.gstin.trim();

    try {
      const response = await requestVendorAddition({
        ...requestVendorForm,
        name: vendorName,
        vendor_type: vendorType,
        gstin,
      }).unwrap();

      setFormData((prev) => ({
        ...prev,
        vendorName,
        vendorId: response?.id || response?.vendorId || prev?.vendorId || "",
        vendorRequestSubmitted: true,
      }));
      setRequestVendorOpen(false);
      setRequestVendorForm(createEmptyVendorRequestForm());
      toast.success("Vendor request submitted");
    } catch (error) {
      toast.error(extractApiErrorDetail(error) || "Failed to request vendor");
    }
  };

  const canEdit = (invoice) => canEditInvoice(invoice, invoiceEditContext);
  // Checklist Flags "Resolve" from View Invoice — its own separate
  // permission/status rules per the confirmed backend contract, not a
  // variant of canEditInvoice above (allowed through Approved/Pending
  // Payment where canEdit is false; excludes pure Approvers).
  const canResolveFlags = (invoice) => canResolveInvoiceFlag(invoice, invoiceEditContext);

  const renderInvoiceForm = ({
    isEdit = false,
    hideActions = false,
    isSavedDraft = false,
  } = {}) => {
    const savedDraftCanSubmit = canSubmitSavedDraft(formData);

    return (
      <InvoiceForm
        formData={formData}
        setFormData={setFormData}
        isEdit={isEdit}
        hideActions={hideActions}
        isSavedDraft={isSavedDraft}
        calculateTotals={calculateTotals}
        findVendorByName={findVendorByName}
        handleAddVendorFromInvoice={handleAddVendorFromInvoice}
        updateLineItem={updateLineItem}
        removeLineItem={removeLineItem}
        addLineItem={addLineItem}
        calculateLineItemSubtotal={calculateLineItemSubtotal}
        setEditDialogOpen={setEditDialogOpen}
        handleUpdateInvoice={handleUpdateInvoice}
        canEditNetPayable={isNetPayableEditEnabled}
        showInternalChecklist={isInternalChecklistEnabled}
        internalChecklistItems={internalChecklistItems}
        canAddVendor={canAddVendors}
        canSubmit={
          isEdit
            ? editingInvoice &&
              canEditInvoice(editingInvoice, invoiceEditContext) &&
              (isSavedDraft || isSavedInvoiceStatus(editingInvoice?.status)
                ? savedDraftCanSubmit
                : !invoiceMandatoryFieldsLoading &&
                  isInvoiceMandatoryFieldsSatisfied(
                    formData,
                    invoiceMandatoryFields,
                    mandatoryFieldOptions,
                  ))
            : false
        }
        departmentMandatory={invoiceMandatoryFields.department}
        categoryMandatory={invoiceMandatoryFields.category}
        departments={departments}
        invoiceCategories={invoiceCategories}
        invoiceCategoriesLoading={
          invoiceCategoriesLoading || invoiceCategoriesFetching
        }
        showDepartmentField={isDepartmentFeatureEnabled}
        showCategoryField={isCategoryFeatureEnabled}
        showCampaignField={isCampaignFeatureEnabled}
        currencyOptions={invoiceCurrencyOptions}
        GST_TREATMENTS={GST_TREATMENTS}
        INDIAN_STATES={INDIAN_STATES}
        LEDGER_OPTIONS={LEDGER_OPTIONS}
        TAX_RATES={TAX_RATES}
        showBillingGst={isEdit}
        requireBillingGst={isEdit && !isSavedDraft}
        showBranchField={isBranchEnabled}
        activeFlags={invoiceFlags.activeFlags}
        isFlagsLowPriorityOnly={invoiceFlags.isLowPriorityOnly}
        onOpenInvoiceFlags={invoiceFlags.openFlagsDialog}
      />
    );
  };

  const isSaving = updateInvoiceLoading || checkInvoiceLoading;

  const editDialogs = (
    <>
      <EditDialog
        editDialogOpen={editDialogOpen}
        setEditDialogOpen={setEditDialogOpen}
        selectedInvoice={editingInvoice}
        formData={formData}
        handleUpdateInvoice={handleUpdateInvoice}
        forwardSavedInvoiceLoading={isSaving}
        renderPdfPreview={renderPdfPreview}
        pdfZoom={pdfZoom}
        viewPreviewError={viewPreviewError}
        setViewPreviewError={setViewPreviewError}
        renderInvoiceForm={renderInvoiceForm}
      />

      <InvoiceFlagsDialog
        open={invoiceFlags.dialogOpen}
        onOpenChange={invoiceFlags.setDialogOpen}
        activeFlags={invoiceFlags.activeFlags}
        resolvedFlags={invoiceFlags.resolvedFlags}
        blockingFlagsResolvedByOthers={invoiceFlags.blockingFlagsResolvedByOthers}
        onResolveFlag={invoiceFlags.resolveFlag}
        onFixInForm={handleFixInvoiceFlagInForm}
        onReopenFlag={canReopenInvoiceFlags ? invoiceFlags.reopenFlag : undefined}
        onViewDuplicateInvoice={handleViewDuplicateInvoice}
      />

      <RequestVendorDialog
        open={requestVendorOpen}
        onOpenChange={(open) => {
          setRequestVendorOpen(open);
          if (!open) setRequestVendorForm(createEmptyVendorRequestForm());
        }}
        formData={requestVendorForm}
        setFormData={setRequestVendorForm}
        onSubmit={handleSubmitVendorRequest}
        submitting={requestVendorLoading}
      />

      <AlertDialog
        open={checkerSubmitConfirmOpen}
        onOpenChange={setCheckerSubmitConfirmOpen}
      >
        <AlertDialogContent data-testid="checker-submit-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to submit?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes will be saved and the invoice will be verified and
              sent to approvers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCheckerSubmit}
              disabled={isSaving}
              data-testid="checker-submit-confirm-yes"
            >
              {isSaving ? "Submitting..." : "Yes, submit for approval"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return {
    canEdit,
    canResolveFlags,
    handleEditInvoice,
    handleFixInvoiceFlagInFormFromView,
    findVendorByName,
    findVendorById,
    editDialogs,
    showInternalChecklist: isInternalChecklistEnabled,
    internalChecklistItems,
    canEditInternalChecklist,
    handleSaveInternalChecklist,
    savingInternalChecklist,
    // For Approvals.jsx's own <ViewDialog> (the read-only "preview" surface,
    // separate from this hook's own edit flow above) to wire up
    // useInvoiceFlags with the same org config this hook already uses —
    // Approvals.jsx has no independent source for these (confirmed: no
    // isCorporateSectionEnabled/isConnectedBankingEnabled/invoiceMandatoryFields
    // at that page level), so they're exposed here rather than recomputed a
    // second time or left defaulting to the wrong values.
    invoiceFlagsOrgContext: {
      isErpIntegrationEnabled,
      isBankIntegrationEnabled: isConnectedBankingEnabled,
      isChecklistFlagsEnabled,
      departmentMandatory: invoiceMandatoryFields.department,
      categoryMandatory: invoiceMandatoryFields.category,
      showDepartmentField: isDepartmentFeatureEnabled,
      showCategoryField: isCategoryFeatureEnabled,
    },
  };
};
