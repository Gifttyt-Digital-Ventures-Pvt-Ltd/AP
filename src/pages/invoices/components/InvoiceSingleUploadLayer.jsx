import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useCreateInvoiceMutation,
  useGetInvoiceMandatoryFieldsQuery,
  useGetPendingVendorApprovalsQuery,
  useGetVendorsQuery,
  useScanInvoiceMutation,
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
import { useSidebar } from "../../../components/Layout";
import {
  getInvoiceMandatoryFieldValidationMessage,
  isInvoiceMandatoryFieldsSatisfied,
  normalizeInvoiceMandatoryFields,
} from "../utils/mandatoryFields";
import {
  getDuplicateInvoiceMessage,
  isDuplicateBulkExtractResult,
  isDuplicateInvoiceError,
} from "../utils/duplicateInvoice";
import {
  applyForeignLineItemTax,
  applyInrLineItemTax,
  calculateInvoiceTotals,
  createDefaultLineItem,
  INVOICE_LEVEL,
  isInrInvoiceCurrency,
  resolveLineItemSubtotal,
  syncLineItemLineTotal,
} from "../utils/invoiceTax";
import { normalizeScannedInvoice } from "../utils/scanNormalization";
import {
  buildInvoiceMultipartPayload,
  buildToCreateInvoicePayload,
  computeTdsAmount,
  initializeInvoiceFormData,
  normalizeLineItemsForTaxLevel,
} from "../utils/invoicePayloadBuilders";
import {
  GST_TREATMENTS,
  INDIAN_STATES,
  INVOICE_SOURCES,
  LEDGER_OPTIONS,
  TAX_RATES,
} from "../constants";
import { DEFAULT_CURRENCY, normalizeCurrencyCode } from "../../../utils/currency";
import {
  extractApiErrorDetail,
  resolveInitialInvoiceStatus,
} from "../../../utils/approvalWorkflow";
import { InvoiceForm } from "./InvoiceForm";
import { InvoicePdfPreview } from "./InvoicePdfPreview";
import UploadSection from "./UploadSection";
import InvoiceUploadDialog from "./InvoiceUploadDialog";
import { getInvoiceFileUrl } from "../utils/invoicePreview";
import { useCurrencyFilter } from "../../../hooks/useCurrencyFilter";
import { CURRENCY_SCREENS } from "../../../utils/currency";

const applyPrefillVendor = (formState, prefillVendor, prefillCampaign) => {
  const hasVendor = Boolean(prefillVendor?.vendorId || prefillVendor?.vendorName);
  const hasCampaign = Boolean(prefillCampaign?.campaignId || prefillCampaign?.campaignName);
  if (!hasVendor && !hasCampaign) return formState;

  return {
    ...formState,
    ...(hasVendor
      ? {
          vendorId: prefillVendor.vendorId || formState.vendorId,
          vendorName: prefillVendor.vendorName || formState.vendorName,
          vendorMatched: Boolean(prefillVendor.vendorId || formState.vendorMatched),
        }
      : {}),
    ...(hasCampaign
      ? {
          campaignId: prefillCampaign.campaignId || formState.campaignId || "",
          campaignName: prefillCampaign.campaignName || formState.campaignName || "",
          referenceNumber:
            prefillCampaign.referenceNumber || formState.referenceNumber || "",
        }
      : {}),
  };
};

/** Same upload UI + logic as InvoicesPage: picker → scan → form → POST /invoices */
const InvoiceSingleUploadLayer = ({
  showFilePicker = false,
  filePickerOpen = false,
  onFilePickerOpenChange,
  prefillVendor = null,
  prefillCampaign = null,
  lockCampaign = false,
  onInvoiceAdded,
}) => {
  const prefillRef = useRef(prefillVendor);
  const prefillCampaignRef = useRef(prefillCampaign);
  prefillRef.current = prefillVendor;
  prefillCampaignRef.current = prefillCampaign;

  const { user } = useAuth();
  const { isCategoryFeatureEnabled, isCampaignFeatureEnabled } = useRBAC();
  const { guardAction, canPerformAction } = useActionGuard();
  const { setHideSidebar } = useSidebar();
  const { data: corporateUserContext = null } = useGetCorporateUserDetailsQuery();
  const { currencyParam } = useCurrencyFilter(CURRENCY_SCREENS.INVOICE);

  const invoiceUserEmail =
    corporateUserContext?.employeeDetails?.email ||
    user?.email ||
    user?.identifier ||
    "";

  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileURL, setUploadedFileURL] = useState(null);
  const [formData, setFormData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [uploadPreviewError, setUploadPreviewError] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [activeTab, setActiveTab] = useState("list");
  const uploadInProgressRef = useRef(false);
  const uploadedFileRef = useRef(null);

  const { data: vendorsData = [] } = useGetVendorsQuery();
  const { data: pendingVendorsData = [] } = useGetPendingVendorApprovalsQuery();
  const { data: departmentsData = [] } = useGetCorporateDepartmentsQuery();
  const { data: invoiceMandatoryFieldsData, isLoading: invoiceMandatoryFieldsLoading } =
    useGetInvoiceMandatoryFieldsQuery(
      { userEmail: invoiceUserEmail },
      { skip: !invoiceUserEmail },
    );
  const {
    data: invoiceCategoriesData = [],
    isLoading: invoiceCategoriesLoading,
    isFetching: invoiceCategoriesFetching,
  } = useGetCategoriesForInvoiceQuery(
    { userEmail: invoiceUserEmail, ...(currencyParam ? { currency: currencyParam } : {}) },
    { skip: !invoiceUserEmail || !isCategoryFeatureEnabled },
  );

  const [scanInvoice] = useScanInvoiceMutation();
  const [createInvoice] = useCreateInvoiceMutation();

  const invoiceMandatoryFields = useMemo(
    () => normalizeInvoiceMandatoryFields(invoiceMandatoryFieldsData),
    [invoiceMandatoryFieldsData],
  );
  const mandatoryFieldOptions = useMemo(
    () => ({ showCategoryField: isCategoryFeatureEnabled }),
    [isCategoryFeatureEnabled],
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
  const invoiceCurrencyOptions = useMemo(() => {
    const codes = new Set([DEFAULT_CURRENCY]);
    invoiceVendorOptions.forEach((vendor) => {
      const code = normalizeCurrencyCode(vendor?.currency);
      if (code) codes.add(code);
    });
    return Array.from(codes);
  }, [invoiceVendorOptions]);

  const canScanInvoices = canPerformAction("invoices.scan");
  const canManageInvoices = canPerformAction("invoices.create");

  useEffect(() => {
    setHideSidebar(Boolean(uploadedFile));
    return () => setHideSidebar(false);
  }, [uploadedFile, setHideSidebar]);

  useEffect(() => {
    setUploadPreviewError(false);
  }, [uploadedFileURL, uploadedFile]);

  const findVendorByName = useCallback(
    (vendorName) => {
      if (!vendorName) return null;
      const normalizedName = vendorName.toLowerCase().trim();
      return (
        invoiceVendorOptions.find(
          (vendor) => String(vendor?.name || "").toLowerCase().trim() === normalizedName,
        ) || null
      );
    },
    [invoiceVendorOptions],
  );

  const findVendorById = useCallback(
    (vendorId) => {
      if (vendorId === null || vendorId === undefined || vendorId === "") return null;
      return (
        invoiceVendorOptions.find((vendor) => String(vendor?.id) === String(vendorId)) ||
        null
      );
    },
    [invoiceVendorOptions],
  );

  const getDepartmentNameById = (departmentId) => {
    const selectedDepartment = departments.find(
      (department) =>
        String(department?.id ?? department?.departmentId ?? "") ===
        String(departmentId ?? ""),
    );
    return selectedDepartment?.name || selectedDepartment?.departmentName || "";
  };

  const getCategoryNameById = (categoryId) => {
    if (!isCategoryFeatureEnabled) return "";
    const selectedCategory = invoiceCategories.find(
      (category) => String(category?.id ?? "") === String(categoryId ?? ""),
    );
    return selectedCategory?.name || "";
  };

  const payloadBuilderDeps = {
    findVendorByName,
    getDepartmentNameById,
    getCategoryNameById,
    isCategoryFeatureEnabled,
    isCampaignFeatureEnabled,
  };

  const toCreateInvoicePayload = (invoiceData = {}, options = {}) =>
    buildToCreateInvoicePayload(invoiceData, options, payloadBuilderDeps);

  const buildMultipartPayload = (invoicePayload, file = null, options = {}) =>
    buildInvoiceMultipartPayload(invoicePayload, file, options, {
      isCategoryFeatureEnabled,
    });

  const initializeFormData = (extractedData = null) =>
    applyPrefillVendor(
      initializeInvoiceFormData(extractedData, {
        findVendorByName,
        isCategoryFeatureEnabled,
      }),
      prefillRef.current,
      prefillCampaignRef.current,
    );

  const resetSession = useCallback(() => {
    uploadedFileRef.current = null;
    setUploadedFileURL((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return null;
    });
    setUploadedFile(null);
    setFormData(null);
    setUploadPreviewError(false);
    setActiveTab("list");
  }, []);

  const calculateLineItemSubtotal = (item) => {
    if (formData?.discountsLevel === INVOICE_LEVEL) {
      const lineTotal = Number(item.lineTotal ?? item.amount) || 0;
      if (lineTotal > 0) return lineTotal;
      return Number(item.quantity) * Number(item.unitRate) || 0;
    }
    return resolveLineItemSubtotal(item);
  };

  const calculateTotals = (lineItems, currency = formData?.currency ?? DEFAULT_CURRENCY) =>
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
    });

  const clearScannedTaxSummary = (data = {}) => ({
    ...data,
    scannedTaxAmount: undefined,
    scannedTaxName: undefined,
    scannedTaxRate: undefined,
    scannedTotal: undefined,
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

  const processFile = async (file) => {
    if (!guardAction("invoices.scan")) return false;
    if (!file) return false;

    uploadInProgressRef.current = true;
    uploadedFileRef.current = file;
    const fileURL = URL.createObjectURL(file);
    setUploadedFileURL(fileURL);
    setUploadedFile(file);
    setScanning(true);
    setActiveTab("upload");

    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const response = await scanInvoice(formDataUpload).unwrap();
      const normalizedResponse =
        response?.data ?? response?.result ?? response?.extracted_data ?? response;

      if (!normalizedResponse || typeof normalizedResponse !== "object") {
        throw new Error("Scan API returned empty response");
      }

      if (isDuplicateBulkExtractResult(normalizedResponse)) {
        resetSession();
        toast.error(
          <div className="space-y-2">
            <p className="font-bold text-base">Duplicate Invoice</p>
            <p className="text-sm whitespace-pre-line">
              {getDuplicateInvoiceMessage(normalizedResponse)}
            </p>
          </div>,
          { duration: 8000 },
        );
        return false;
      }

      setFormData(initializeFormData(normalizeScannedInvoice(normalizedResponse)));
      toast.success("Invoice scanned successfully!");
    } catch (error) {
      const errorMessage =
        extractApiErrorDetail(error) ||
        error?.data?.message ||
        error?.message ||
        "Failed to scan invoice";

      if (isDuplicateInvoiceError(error)) {
        resetSession();
        toast.error(
          <div className="space-y-2">
            <p className="font-bold text-base">Duplicate Invoice</p>
            <p className="text-sm whitespace-pre-line">{errorMessage}</p>
          </div>,
          { duration: 8000 },
        );
        return false;
      }

      setFormData(
        applyPrefillVendor(
          { ...initializeFormData(null), originalFileName: file.name },
          prefillRef.current,
          prefillCampaignRef.current,
        ),
      );
      toast.warning(
        <div className="space-y-2">
          <p className="font-bold text-base">Scan Failed</p>
          <p className="text-sm whitespace-pre-line">{errorMessage}</p>
          <p className="text-sm">Enter invoice details manually using the form.</p>
        </div>,
        { duration: 8000 },
      );
    } finally {
      setScanning(false);
      uploadInProgressRef.current = false;
    }
    return true;
  };

  const handleAddInvoice = async () => {
    if (!guardAction("invoices.create")) return;
    if (!formData) return;

    const totals = calculateTotals(formData.lineItems);
    const resolvedVendorId =
      formData.vendorId ||
      prefillRef.current?.vendorId ||
      findVendorByName(formData.vendorName)?.id ||
      "";
    const createStatus = resolveInitialInvoiceStatus({
      vendorId: resolvedVendorId,
      vendorRequestSubmitted: formData.vendorRequestSubmitted,
      findVendorById,
    });

    const campaignId =
      formData.campaignId || prefillCampaignRef.current?.campaignId || "";
    const campaignName =
      formData.campaignName || prefillCampaignRef.current?.campaignName || "";
    const referenceNumber =
      formData.referenceNumber || prefillCampaignRef.current?.referenceNumber || "";

    const invoicePayload = toCreateInvoicePayload(
      {
        ...formData,
        vendorId: resolvedVendorId,
        vendorName: formData.vendorName?.trim() || prefillRef.current?.vendorName || "",
        campaignId,
        campaignName,
        referenceNumber,
        status: createStatus,
        lineItems: normalizeLineItemsForTaxLevel({
          ...formData,
          lineItems: formData.lineItems.map((item) => ({
            ...item,
            unitPrice: item.unitRate,
            amount: calculateLineItemSubtotal(item),
          })),
        }),
        memo: formData.description,
        originalFileName: formData.originalFileName || uploadedFile?.name || null,
        currentFileName: uploadedFile?.name || formData.originalFileName || null,
      },
      {
        status: createStatus,
        totals,
        tdsAmount: computeTdsAmount(
          formData.lineItems,
          formData.tds,
          calculateLineItemSubtotal,
        ),
        uploadedFileName: uploadedFile?.name,
      },
    );

    if (!invoicePayload.vendorId && !formData.vendorRequestSubmitted) {
      toast.error("Please select or request a vendor before creating invoice");
      return;
    }
    if (!invoicePayload.vendorName) {
      toast.error("Vendor name is required");
      return;
    }
    if (!validateMandatoryPayload(formData)) return;

    try {
      if (uploadedFile) {
        await createInvoice(
          buildMultipartPayload(invoicePayload, uploadedFile, {
            totals,
            tdsAmount: computeTdsAmount(
              formData.lineItems,
              formData.tds,
              calculateLineItemSubtotal,
            ),
          }),
        ).unwrap();
      } else {
        await createInvoice(invoicePayload).unwrap();
      }

      toast.success("Invoice added successfully");
      resetSession();
      onFilePickerOpenChange?.(false);
      await onInvoiceAdded?.();
      prefillRef.current = null;
    } catch (error) {
      const errorMessage = extractApiErrorDetail(error) || "Failed to add invoice";
      if (isDuplicateInvoiceError(error)) {
        resetSession();
        toast.error(
          <div className="space-y-2">
            <p className="font-bold text-base">Duplicate Invoice</p>
            <p className="text-sm whitespace-pre-line">{errorMessage}</p>
          </div>,
          { duration: 8000 },
        );
        return;
      }
      toast.error(
        <div className="space-y-2">
          <p className="font-bold text-base">Cannot Add Invoice!</p>
          <p className="text-sm whitespace-pre-line">{errorMessage}</p>
        </div>,
        { duration: 8000 },
      );
    }
  };

  const canSubmit =
    canManageInvoices &&
    !invoiceMandatoryFieldsLoading &&
    Boolean(formData) &&
    isInvoiceMandatoryFieldsSatisfied(formData, invoiceMandatoryFields, mandatoryFieldOptions) &&
    (Boolean(formData?.vendorId) ||
      Boolean(prefillRef.current?.vendorId) ||
      Boolean(formData?.vendorRequestSubmitted));

  const renderPdfPreview = (props) => (
    <InvoicePdfPreview
      {...props}
      setPdfZoom={setPdfZoom}
      getInvoiceFileUrl={getInvoiceFileUrl}
    />
  );

  const renderInvoiceForm = ({ hideActions = false } = {}) => (
    <InvoiceForm
      formData={formData}
      setFormData={setFormData}
      isEdit={false}
      hideActions={hideActions}
      calculateTotals={calculateTotals}
      findVendorByName={findVendorByName}
      handleAddVendorFromInvoice={() => {}}
      updateLineItem={updateLineItem}
      removeLineItem={removeLineItem}
      addLineItem={addLineItem}
      calculateLineItemSubtotal={calculateLineItemSubtotal}
      setEditDialogOpen={() => {}}
      setUploadedFile={setUploadedFile}
      setUploadedFileURL={setUploadedFileURL}
      setActiveTab={setActiveTab}
      handleUpdateInvoice={() => {}}
      handleAddInvoice={handleAddInvoice}
      canAddVendor={false}
      canSubmit={canSubmit}
      departmentMandatory={invoiceMandatoryFields.department}
      categoryMandatory={invoiceMandatoryFields.category}
      departments={departments}
      invoiceCategories={invoiceCategories}
      invoiceCategoriesLoading={invoiceCategoriesLoading || invoiceCategoriesFetching}
      showCategoryField={isCategoryFeatureEnabled}
      showCampaignField={isCampaignFeatureEnabled}
      lockedCampaign={lockCampaign}
      lockedCampaignPrefill={prefillCampaign}
      currencyOptions={invoiceCurrencyOptions}
      vendorOptions={invoiceVendorOptions}
      GST_TREATMENTS={GST_TREATMENTS}
      INDIAN_STATES={INDIAN_STATES}
      INVOICE_SOURCES={INVOICE_SOURCES}
      LEDGER_OPTIONS={LEDGER_OPTIONS}
      TAX_RATES={TAX_RATES}
    />
  );

  const handlePickerFiles = async (files) => {
    const file = files?.[0];
    if (!file) return false;
    await processFile(file);
    // Do not let InvoiceUploadDialog call onOpenChange(false) — that was
    // resetting the upload session before React committed uploadedFile.
    return false;
  };

  const handlePickerOpenChange = (nextOpen) => {
    onFilePickerOpenChange?.(nextOpen);
    if (!nextOpen && !uploadedFileRef.current && !uploadInProgressRef.current) {
      resetSession();
    }
  };

  return (
    <>
      {showFilePicker && (
        <InvoiceUploadDialog
          open={filePickerOpen && !uploadedFile}
          onOpenChange={handlePickerOpenChange}
          onFilesSelected={handlePickerFiles}
          disabled={scanning || uploadInProgressRef.current || !canScanInvoices}
          overlayClassName="z-[100] bg-black/80"
          contentClassName="z-[100]"
        />
      )}
      <UploadSection
        uploadedFile={uploadedFile}
        setUploadedFile={setUploadedFile}
        setUploadedFileURL={setUploadedFileURL}
        setFormData={setFormData}
        setActiveTab={setActiveTab}
        renderPdfPreview={renderPdfPreview}
        uploadedFileURL={uploadedFileURL}
        pdfZoom={pdfZoom}
        uploadPreviewError={uploadPreviewError}
        setUploadPreviewError={setUploadPreviewError}
        scanning={scanning}
        renderInvoiceForm={renderInvoiceForm}
        handleAddInvoice={handleAddInvoice}
      />
    </>
  );
};

export default InvoiceSingleUploadLayer;
