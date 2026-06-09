import React, { useCallback, useMemo, useState } from "react";
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
  useGetVendorsQuery,
  useGetPendingVendorApprovalsQuery,
  useRequestVendorAdditionMutation,
  useUpdateInvoiceMutation,
  useCheckInvoiceMutation,
} from "../../../Services/apis/invoicesVendorsApi";
import {
  useGetCorporateDepartmentsQuery,
  useGetCorporateUserDetailsQuery,
} from "../../../Services/apis/corporateApi";
import { useGetCategoriesForInvoiceQuery } from "../../../Services/apis/categoriesApi";
import { mergeInvoiceVendorOptions } from "../../../Services/utils/payloadMappers";
import { useAuth } from "../../../contexts/AuthContext";
import { useRBAC } from "../../../contexts/RBACContext";
import { useActionGuard } from "../../../hooks/useActionGuard";
import EditDialog from "../../invoices/components/EditDialog";
import RequestVendorDialog from "../../invoices/components/RequestVendorDialog";
import { InvoiceForm } from "../../invoices/components/InvoiceForm";
import {
  GST_TREATMENTS,
  INDIAN_STATES,
  INVOICE_SOURCES,
  LEDGER_OPTIONS,
  TAX_RATES,
} from "../../invoices/constants";
import { buildInvoiceEditFormData } from "../../invoices/utils/invoiceFormData";
import {
  getInvoiceMandatoryFieldValidationMessage,
  isInvoiceMandatoryFieldsSatisfied,
  normalizeInvoiceMandatoryFields,
} from "../../invoices/utils/mandatoryFields";
import {
  applyForeignLineItemTax,
  applyInrLineItemTax,
  calculateInvoiceTotals,
  createDefaultLineItem,
  INVOICE_LEVEL,
  isInrInvoiceCurrency,
  resolveLineItemSubtotal,
  syncLineItemLineTotal,
} from "../../invoices/utils/invoiceTax";
import {
  buildToCreateInvoicePayload,
  computeTdsAmount,
  normalizeLineItemsForTaxLevel,
} from "../../invoices/utils/invoicePayloadBuilders";
import {
  createEmptyVendorRequestForm,
  buildVendorRequestForm,
} from "../../invoices/utils/invoiceBulkUtils";
import { getInvoiceVendorRequestValidationErrors } from "../../../utils/vendorValidation";
import {
  buildCurrentUserIdentity,
  canEditInvoice,
  extractApiErrorDetail,
  formatWorkflowStatus,
  isSavedInvoiceStatus,
  NEEDS_CORRECTION_STATUS,
  shouldCheckerSubmitOnUpdate,
} from "../../../utils/approvalWorkflow";
import { FULL_ACCESS_PERMISSION } from "../../../constants/rbacPolicy";
import { DEFAULT_CURRENCY } from "../../../utils/currency";

export const useApprovalsInvoiceEdit = ({
  currencies = [],
  currencyParam,
  onRefresh,
  renderPdfPreview,
  pdfZoom,
  viewPreviewError,
  setViewPreviewError,
}) => {
  const { user } = useAuth();
  const {
    isCategoryFeatureEnabled,
    isCampaignFeatureEnabled,
    isCorporateAdmin,
    hasPermission,
  } = useRBAC();
  const { guardAction, canPerformAction } = useActionGuard();

  const canUpdateInvoices = canPerformAction("invoices.update");
  const canManageInvoices = canPerformAction("invoices.create");
  const canCheckInvoices = canPerformAction("invoices.check");
  const canAddVendors = canPerformAction("invoices.addVendor");

  const { data: corporateUserContext = null } =
    useGetCorporateUserDetailsQuery();
  const invoiceUserEmail =
    corporateUserContext?.corporateUser?.email ||
    corporateUserContext?.employeeDetails?.email ||
    user?.email ||
    user?.identifier ||
    "";

  const { data: vendorsData = [] } = useGetVendorsQuery();
  const { data: pendingVendorsData = [] } = useGetPendingVendorApprovalsQuery();
  const { data: departmentsData = [] } = useGetCorporateDepartmentsQuery();
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
  const [checkInvoice, { isLoading: checkInvoiceLoading }] =
    useCheckInvoiceMutation();
  const [requestVendorAddition, { isLoading: requestVendorLoading }] =
    useRequestVendorAdditionMutation();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [formData, setFormData] = useState(null);
  const [checkerSubmitConfirmOpen, setCheckerSubmitConfirmOpen] = useState(false);
  const [requestVendorOpen, setRequestVendorOpen] = useState(false);
  const [requestVendorForm, setRequestVendorForm] = useState(
    createEmptyVendorRequestForm(),
  );

  const invoiceVendorOptions = useMemo(
    () =>
      mergeInvoiceVendorOptions(
        Array.isArray(vendorsData) ? vendorsData : [],
        Array.isArray(pendingVendorsData) ? pendingVendorsData : [],
      ),
    [vendorsData, pendingVendorsData],
  );
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
    () => ({ showCategoryField: isCategoryFeatureEnabled }),
    [isCategoryFeatureEnabled],
  );
  const invoiceCurrencyOptions = useMemo(
    () => currencies.filter((currency) => currency !== "ALL"),
    [currencies],
  );

  const invoiceEditContext = useMemo(
    () => ({
      ...buildCurrentUserIdentity({ user, corporateUserContext }),
      canUpdateInvoices,
      canManageInvoices,
      canCheckInvoices,
      isCorporateAdmin,
    }),
    [
      user,
      corporateUserContext,
      canUpdateInvoices,
      canManageInvoices,
      canCheckInvoices,
      isCorporateAdmin,
    ],
  );

  const findVendorByName = useCallback(
    (vendorName) => {
      if (!vendorName) return null;
      const normalizedName = vendorName.toLowerCase().trim();
      return (
        invoiceVendorOptions.find(
          (vendor) =>
            String(vendor?.name || "")
              .toLowerCase()
              .trim() === normalizedName,
        ) || null
      );
    },
    [invoiceVendorOptions],
  );

  const findVendorById = useCallback(
    (vendorId) => {
      if (vendorId === null || vendorId === undefined || vendorId === "") {
        return null;
      }
      return (
        invoiceVendorOptions.find(
          (vendor) => String(vendor?.id) === String(vendorId),
        ) || null
      );
    },
    [invoiceVendorOptions],
  );

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
        sourceEmail: data.source === "Email" ? data.sourceEmail : null,
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

  const handleEditInvoice = (invoice) => {
    if (!canEditInvoice(invoice, invoiceEditContext)) {
      const status = formatWorkflowStatus(invoice?.status);
      if (!canUpdateInvoices && !canManageInvoices && !canCheckInvoices) {
        toast.error("You do not have permission to edit this invoice");
      } else if (status === NEEDS_CORRECTION_STATUS) {
        toast.error(
          "Only the creator can edit an invoice in Needs Correction status",
        );
      } else {
        toast.error(`Invoices in ${status || "this"} status cannot be edited`);
      }
      return;
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

  const handleUpdateInvoice = async () => {
    if (!guardAction("invoices.update")) return;
    if (!editingInvoice || !formData) return;

    const isSavedDraft = isSavedInvoiceStatus(editingInvoice.status);
    if (isSavedDraft) {
      if (!validateSavedInvoiceEdit(formData)) return;
    } else if (!validateMandatoryPayload(formData)) {
      return;
    }

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
      toast.error(
        extractApiErrorDetail(error) ||
          "Failed to update and submit invoice for approval",
      );
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
        vendorOptions={invoiceVendorOptions}
        departments={departments}
        invoiceCategories={invoiceCategories}
        invoiceCategoriesLoading={
          invoiceCategoriesLoading || invoiceCategoriesFetching
        }
        showCategoryField={isCategoryFeatureEnabled}
        showCampaignField={isCampaignFeatureEnabled}
        currencyOptions={invoiceCurrencyOptions}
        GST_TREATMENTS={GST_TREATMENTS}
        INDIAN_STATES={INDIAN_STATES}
        INVOICE_SOURCES={INVOICE_SOURCES}
        LEDGER_OPTIONS={LEDGER_OPTIONS}
        TAX_RATES={TAX_RATES}
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
    handleEditInvoice,
    findVendorByName,
    findVendorById,
    editDialogs,
  };
};
