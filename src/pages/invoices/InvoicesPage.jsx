import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  useGetInvoicesQuery,
  useGetInvoiceMandatoryFieldsQuery,
  useGetVendorsQuery,
  useGetPendingVendorApprovalsQuery,
  useScanInvoiceMutation,
  useBulkUploadInvoicesMutation,
  useRequestVendorAdditionMutation,
  useCreateInvoiceMutation,
  useLazyGetInvoiceHistoryQuery,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
} from '../../Services/apis/invoicesVendorsApi';
import {
  getInvoiceMandatoryFieldValidationMessage,
  isInvoiceMandatoryFieldsSatisfied,
  normalizeInvoiceMandatoryFields,
} from './utils/mandatoryFields';
import {
  isDuplicateBulkExtractResult,
  isDuplicateBulkPreviewItem,
  isDuplicateInvoiceError,
} from './utils/duplicateInvoice';
import {
  applyForeignLineItemTax,
  applyInrLineItemTax,
  calculateInvoiceTotals,
  createDefaultLineItem,
  DEFAULT_INR_TAX,
  isInrInvoiceCurrency,
  mapExtractedLineItemToForm,
  remapLineItemsForCurrencyChange,
  resolveLineItemSubtotal,
  resolveScannedInvoiceTaxSummary,
  resolveScannedLineItemPricing,
  resolveScannedLineItemTax,
  syncLineItemLineTotal,
} from './utils/invoiceTax';
import { parseNumericInput } from './utils/numericInput';
import { buildInvoiceEditFormData } from './utils/invoiceFormData';
import { normalizeInvoiceHistoryEntries } from './utils/invoiceHistory';
import {
  buildCreateInvoiceRequestBody,
  extractVendorIdFromResponse,
  mergeInvoiceVendorOptions,
  toInvoiceApiPayload,
} from '../../Services/utils/payloadMappers';
import {
  useGetCorporateDepartmentsQuery,
  useGetCorporateUserDetailsQuery,
} from '../../Services/apis/corporateApi';
import { useGetCategoriesForInvoiceQuery } from '../../Services/apis/categoriesApi';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useSidebar } from '../../components/Layout';
import {
  GST_TREATMENTS,
  INDIAN_STATES,
  INVOICE_SOURCES,
  LEDGER_OPTIONS,
  TAX_RATES,
} from './constants';
import { InvoicePdfPreview } from './components/InvoicePdfPreview';
import { InvoiceForm } from './components/InvoiceForm';
import InvoiceHeader from './components/InvoiceHeader';
import InvoicesWorkspace from './components/InvoicesWorkspace';
import InvoicesDialogs from './components/InvoicesDialogs';
import { getInvoiceVendorRequestValidationErrors } from '../../utils/vendorValidation';
import { useActionGuard } from '../../hooks/useActionGuard';
import { useRBAC } from '../../contexts/RBACContext';
import { useCurrencyFilter } from '../../hooks/useCurrencyFilter';
import { CURRENCY_SCREENS, DEFAULT_CURRENCY, normalizeCurrencyCode } from '../../utils/currency';
import {
  buildCurrentUserIdentity,
  canDeleteInvoice,
  canEditInvoice,
  extractApiErrorDetail,
  formatWorkflowStatus,
  getInvoiceStatusBadgeClass,
  NEEDS_CORRECTION_STATUS,
} from '../../utils/approvalWorkflow';

const FILE_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? '';

const createEmptyVendorRequestForm = () => ({
  name: '',
  vendor_type: 'Company',
  email: '',
  phone: '',
  mobile: '',
  pan: '',
  gstin: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  country: '',
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  branch: '',
  account_holder_name: '',
  category: '',
  currency: 'INR',
  payment_terms: '30',
  contact_person: '',
  website: '',
  notes: '',
});

const InvoicesPage = () => {
  const { user } = useAuth();
  const { isCategoryFeatureEnabled, isCorporateAdmin } = useRBAC();
  const {
    data: corporateUserContext = null,
  } = useGetCorporateUserDetailsQuery();
  const invoiceUserEmail =
    corporateUserContext?.corporateUser?.email ||
    corporateUserContext?.employeeDetails?.email ||
    user?.email ||
    user?.identifier ||
    '';
  const {
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    currencyParam,
    queryArgs: invoiceQueryArgs,
  } = useCurrencyFilter(CURRENCY_SCREENS.INVOICE);
  const invoiceCurrencyOptions = useMemo(
    () => currencies.filter((currency) => currency !== 'ALL'),
    [currencies],
  );
  const {
    data: invoicesData = [],
  } = useGetInvoicesQuery(invoiceQueryArgs);
  const {
    data: vendorsData = [],
    refetch: refetchVendors,
  } = useGetVendorsQuery();
  const {
    data: pendingVendorsData = [],
    refetch: refetchPendingVendors,
  } = useGetPendingVendorApprovalsQuery();
  const {
    data: departmentsData = [],
  } = useGetCorporateDepartmentsQuery();
  const {
    data: invoiceMandatoryFieldsData,
    isLoading: invoiceMandatoryFieldsLoading,
  } = useGetInvoiceMandatoryFieldsQuery(
    { userEmail: invoiceUserEmail },
    { skip: !invoiceUserEmail },
  );
  const invoiceMandatoryFields = useMemo(
    () => normalizeInvoiceMandatoryFields(invoiceMandatoryFieldsData),
    [invoiceMandatoryFieldsData],
  );
  const mandatoryFieldOptions = useMemo(
    () => ({ showCategoryField: isCategoryFeatureEnabled }),
    [isCategoryFeatureEnabled],
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
    {
      skip: !invoiceUserEmail || !isCategoryFeatureEnabled,
    },
  );
  const [scanInvoice] = useScanInvoiceMutation();
  const [bulkUploadInvoices] = useBulkUploadInvoicesMutation();
  const [requestVendorAddition, { isLoading: requestVendorLoading }] = useRequestVendorAdditionMutation();
  const [createInvoice] = useCreateInvoiceMutation();
  const [getInvoiceHistory] = useLazyGetInvoiceHistoryQuery();
  const [updateInvoice] = useUpdateInvoiceMutation();
  const [deleteInvoice] = useDeleteInvoiceMutation();
  const { guardAction, canPerformAction } = useActionGuard();
  const invoices = Array.isArray(invoicesData) ? invoicesData : [];
  const approvedVendors = Array.isArray(vendorsData) ? vendorsData : [];
  const pendingVendors = Array.isArray(pendingVendorsData) ? pendingVendorsData : [];
  const invoiceVendorOptions = useMemo(
    () => mergeInvoiceVendorOptions(approvedVendors, pendingVendors),
    [approvedVendors, pendingVendors],
  );
  const departments = Array.isArray(departmentsData) ? departmentsData : [];
  const invoiceCategories =
    isCategoryFeatureEnabled && Array.isArray(invoiceCategoriesData) ? invoiceCategoriesData : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('list');
  const { setHideSidebar } = useSidebar();
  
  // Upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileURL, setUploadedFileURL] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef(null);
  const bulkFileInputRef = useRef(null);
  const canScanInvoices = canPerformAction('invoices.scan');
  const canBulkUploadInvoices = canPerformAction('invoices.bulkUpload');
  const canManageInvoices = canPerformAction('invoices.create');
  const canUpdateInvoices = canPerformAction('invoices.update');
  const canDeleteInvoices = canPerformAction('invoices.delete');
  const canAddVendors = canPerformAction('invoices.addVendor');
  const invoiceEditContext = useMemo(
    () => ({
      ...buildCurrentUserIdentity({ user, corporateUserContext }),
      canUpdateInvoices,
      canManageInvoices,
      isCorporateAdmin,
    }),
    [user, corporateUserContext, canUpdateInvoices, canManageInvoices, isCorporateAdmin],
  );
  
  // PDF Zoom
  const [pdfZoom, setPdfZoom] = useState(100);

  // View/Edit state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadPreviewError, setUploadPreviewError] = useState(false);
  const [viewPreviewError, setViewPreviewError] = useState(false);
  
  // Enhanced form data for both upload and edit
  const [formData, setFormData] = useState(null);
  
  // History state
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewTab, setViewTab] = useState('details');
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);
  const [bulkPreviewItems, setBulkPreviewItems] = useState([]);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkExtracting, setBulkExtracting] = useState(false);
  const [bulkExtractTotalFiles, setBulkExtractTotalFiles] = useState(0);
  const [bulkExtractStartedAt, setBulkExtractStartedAt] = useState(null);
  const [bulkExtractElapsedSeconds, setBulkExtractElapsedSeconds] = useState(0);
  const [bulkExtractProgress, setBulkExtractProgress] = useState(0);
  const [bulkProgress, setBulkProgress] = useState({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    startedAt: null,
  });
  const [bulkElapsedSeconds, setBulkElapsedSeconds] = useState(0);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditItemId, setBulkEditItemId] = useState('');
  const [bulkEditForm, setBulkEditForm] = useState(null);
  const [bulkEditPreviewError, setBulkEditPreviewError] = useState(false);
  const [bulkEditFileURL, setBulkEditFileURL] = useState(null);
  const [bulkAddingVendorItemId, setBulkAddingVendorItemId] = useState('');
  const [invoiceDeleteTarget, setInvoiceDeleteTarget] = useState(null);
  const [requestVendorOpen, setRequestVendorOpen] = useState(false);
  const [requestVendorContext, setRequestVendorContext] = useState(null);
  const [requestVendorForm, setRequestVendorForm] = useState(createEmptyVendorRequestForm);

  const openSingleFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const openBulkFilePicker = () => {
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = '';
      bulkFileInputRef.current.click();
    }
  };

  // Hide/show sidebar based on mode
  useEffect(() => {
    const shouldHide = activeTab === 'upload' && uploadedFile;
    setHideSidebar(shouldHide);
    return () => setHideSidebar(false);
  }, [activeTab, uploadedFile, setHideSidebar]);

  // Also hide sidebar when edit dialog is open
  useEffect(() => {
    setHideSidebar(editDialogOpen);
  }, [editDialogOpen, setHideSidebar]);

  useEffect(() => {
    setUploadPreviewError(false);
  }, [uploadedFileURL, uploadedFile]);

  useEffect(() => {
    setViewPreviewError(false);
  }, [selectedInvoice, viewDialogOpen]);

  useEffect(() => {
    if (!bulkEditOpen || !bulkEditItemId) {
      setBulkEditFileURL(null);
      return;
    }
    const selected = bulkPreviewItems.find((item) => item.id === bulkEditItemId);
    if (!selected?.file) {
      setBulkEditFileURL(null);
      return;
    }
    const url = URL.createObjectURL(selected.file);
    setBulkEditFileURL(url);
    return () => URL.revokeObjectURL(url);
  }, [bulkEditOpen, bulkEditItemId, bulkPreviewItems]);

  useEffect(() => {
    if (!bulkCreating || !bulkProgress.startedAt) {
      setBulkElapsedSeconds(0);
      return;
    }
    const timerId = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - bulkProgress.startedAt) / 1000));
      setBulkElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(timerId);
  }, [bulkCreating, bulkProgress.startedAt]);

  useEffect(() => {
    if (!bulkExtracting || !bulkExtractStartedAt) {
      setBulkExtractElapsedSeconds(0);
      setBulkExtractProgress(0);
      return;
    }
    const timerId = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - bulkExtractStartedAt) / 1000));
      setBulkExtractElapsedSeconds(elapsed);
      // Simulated determinate progress until API returns (caps at 95%)
      setBulkExtractProgress((prev) => {
        const target = Math.min(95, 12 + elapsed * 8);
        return target > prev ? target : prev;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [bulkExtracting, bulkExtractStartedAt]);

  useEffect(() => {
    if (!bulkPreviewOpen || bulkCreating || bulkPreviewItems.length === 0) return;
    const creatableRows = bulkPreviewItems.filter(
      (item) => item.invoicePayload && !isDuplicateBulkPreviewItem(item),
    );
    if (creatableRows.length === 0) return;
    const allUploaded = creatableRows.every((item) => item.status === 'uploaded');
    if (allUploaded) {
      setBulkPreviewOpen(false);
    }
  }, [bulkPreviewOpen, bulkCreating, bulkPreviewItems]);


  const findVendorByName = useCallback((vendorName) => {
    if (!vendorName) return null;
    const normalizedName = vendorName.toLowerCase().trim();
    return (
      invoiceVendorOptions.find(
        (vendor) => String(vendor?.name || '').toLowerCase().trim() === normalizedName,
      ) || null
    );
  }, [invoiceVendorOptions]);

  const findVendorById = useCallback((vendorId) => {
    if (vendorId === null || vendorId === undefined || vendorId === '') return null;
    return (
      invoiceVendorOptions.find((vendor) => String(vendor?.id) === String(vendorId)) || null
    );
  }, [invoiceVendorOptions]);

  const buildVendorRequestForm = (source = {}) => {
    const invoiceCurrency = normalizeCurrencyCode(source.currency) || DEFAULT_CURRENCY;
    return {
      ...createEmptyVendorRequestForm(),
      name: source.vendor_name || source.name || '',
      gstin:
        source.vendor_gstin ||
        source.vendorGstin ||
        source.gstin ||
        source.billing_gstin ||
        source.billingGstin ||
        '',
      mobile:
        source.mobile ||
        source.vendor_mobile ||
        source.vendorMobile ||
        '',
      phone: source.phone || source.vendor_phone || source.vendorPhone || '',
      pan: source.pan || source.vendor_pan || source.vendorPan || '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      notes: source.memo || source.description || '',
      country: source.country || (isInrInvoiceCurrency(invoiceCurrency) ? 'India' : ''),
      currency: invoiceCurrency,
    };
  };

  const openRequestVendorDialog = ({ source = {}, context }) => {
    setRequestVendorContext(context);
    setRequestVendorForm(buildVendorRequestForm(source));
    setRequestVendorOpen(true);
  };

  const handleRequestVendorOpenChange = (open) => {
    setRequestVendorOpen(open);
    if (!open) {
      setRequestVendorContext(null);
      setRequestVendorForm(createEmptyVendorRequestForm());
    }
  };

  const getDepartmentNameById = (departmentId) => {
    const selectedDepartment = departments.find(
      (department) =>
        String(department?.id ?? department?.departmentId ?? department?.department_id ?? '') ===
        String(departmentId ?? ''),
    );
    return (
      selectedDepartment?.name ||
      selectedDepartment?.departmentName ||
      selectedDepartment?.department_name ||
      ''
    );
  };

  const getCategoryNameById = (categoryId) => {
    if (!isCategoryFeatureEnabled) return '';
    const selectedCategory = invoiceCategories.find(
      (category) => String(category?.id ?? '') === String(categoryId ?? ''),
    );
    return selectedCategory?.name || '';
  };

  const normalizeInvoiceCategoryId = (categoryId) => {
    if (categoryId === null || categoryId === undefined || categoryId === '') return '';
    const numericCategoryId = Number(categoryId);
    return Number.isNaN(numericCategoryId) ? categoryId : numericCategoryId;
  };

  const buildInvoiceCategoryPayload = (source = {}) => {
    if (!isCategoryFeatureEnabled) return null;
    const rawCategoryId = source.category?.id ?? source.category_id ?? source.categoryId;
    const categoryId = normalizeInvoiceCategoryId(rawCategoryId);
    if (!categoryId) return null;
    return {
      id: categoryId,
      name:
        source.category?.name ||
        source.category_name ||
        source.categoryName ||
        getCategoryNameById(categoryId),
    };
  };

  const normalizeScannedInvoice = (scanResponse = {}) => {
    const toDateOnly = (value) => {
      if (!value) return '';
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? '' : format(d, 'yyyy-MM-dd');
    };

    const lineItemsRaw = Array.isArray(scanResponse?.line_items)
      ? scanResponse.line_items
      : Array.isArray(scanResponse?.lineItems)
        ? scanResponse.lineItems
        : Array.isArray(scanResponse?.items)
          ? scanResponse.items
          : [];
    const taxesRaw = Array.isArray(scanResponse?.taxes) ? scanResponse.taxes : [];
    const invoiceCurrency = normalizeCurrencyCode(scanResponse?.currency) || DEFAULT_CURRENCY;

    const lineItems = lineItemsRaw.map((item) => {
      const pricing = resolveScannedLineItemPricing(item);
      const taxFields = resolveScannedLineItemTax(item, taxesRaw, invoiceCurrency);

      return {
        description: item?.description ?? item?.name ?? '',
        quantity: pricing.quantity,
        unit_price: pricing.unit_price,
        amount: pricing.amount,
        line_total: pricing.line_total,
        hsn_sac: item?.hsn_sac ?? item?.hsnSac ?? '',
        ...taxFields,
      };
    });

    const computedAmount = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const taxSummary = resolveScannedInvoiceTaxSummary(scanResponse, taxesRaw);

    const vendorAddress =
      scanResponse?.vendor_address ??
      scanResponse?.vendorAddress ??
      scanResponse?.address ??
      '';

    const vendorGstin =
      scanResponse?.vendor_gstin ??
      scanResponse?.vendorGstin ??
      scanResponse?.gstin ??
      '';
    const placeOfSupply =
      scanResponse?.place_of_supply ??
      scanResponse?.placeOfSupply ??
      scanResponse?.source_of_supply ??
      scanResponse?.sourceOfSupply ??
      '';

    return {
      vendor_name: scanResponse?.vendor_name ?? scanResponse?.vendorName ?? scanResponse?.merchant ?? '',
      vendor_gstin: vendorGstin,
      billing_gstin: scanResponse?.billingGstin ?? scanResponse?.billing_gstin ?? '',
      gstin: vendorGstin,
      vendor_address: vendorAddress,
      billing_address:
        scanResponse?.billingAddress ??
        scanResponse?.billing_address ??
        vendorAddress,
      shipping_address:
        scanResponse?.shippingAddress ??
        scanResponse?.shipping_address ??
        '',
      gst_treatment: scanResponse?.gst_treatment ?? scanResponse?.gstTreatment ?? '',
      source_of_supply:
        scanResponse?.source_of_supply ??
        scanResponse?.sourceOfSupply ??
        placeOfSupply,
      destination_of_supply:
        scanResponse?.destination_of_supply ??
        scanResponse?.destinationOfSupply ??
        placeOfSupply,
      place_of_supply: placeOfSupply,
      discounts_level:
        scanResponse?.discounts_level ??
        scanResponse?.discountsLevel ??
        'At Line Item Level',
      invoice_discount:
        Number(scanResponse?.invoice_discount ?? scanResponse?.invoiceDiscount ?? 0) || 0,
      invoice_discount_type:
        scanResponse?.invoice_discount_type ??
        scanResponse?.invoiceDiscountType ??
        '%',
      source: scanResponse?.source ?? 'Upload',
      invoice_number: scanResponse?.invoice_number ?? scanResponse?.invoiceNumber ?? '',
      invoice_date:
        toDateOnly(scanResponse?.invoice_date ?? scanResponse?.invoiceDate ?? scanResponse?.datetime) ||
        format(new Date(), 'yyyy-MM-dd'),
      due_date:
        toDateOnly(scanResponse?.due_date ?? scanResponse?.dueDate ?? scanResponse?.datetime) ||
        format(new Date(), 'yyyy-MM-dd'),
      line_items: lineItems,
      amount: Number(scanResponse?.total ?? scanResponse?.amount ?? computedAmount) || 0,
      currency: normalizeCurrencyCode(scanResponse?.currency) || DEFAULT_CURRENCY,
      ...taxSummary,
      file_id: scanResponse?.file_id ?? scanResponse?.fileId ?? null,
      file_hash: scanResponse?.file_hash ?? scanResponse?.fileHash ?? null,
      original_filename: scanResponse?.original_filename ?? scanResponse?.originalFileName ?? null,
    };
  };

  const computeTdsAmount = (lineItems = [], tdsValue = '') => {
    const tdsRate = Number.parseFloat(String(tdsValue || '').replace('%', '')) || 0;
    if (!tdsRate) return 0;
    const subTotal = (lineItems || []).reduce(
      (sum, item) => sum + calculateLineItemSubtotal(item),
      0,
    );
    return Math.round(((subTotal * tdsRate) / 100) * 100) / 100;
  };

  const toCreateInvoicePayload = (invoiceData = {}, options = {}) => {
    const lineItems = invoiceData.line_items || [];
    const totals =
      options.totals ??
      (lineItems.length > 0 ? calculateTotals(lineItems) : null);

    return buildCreateInvoiceRequestBody(
      {
        ...invoiceData,
        vendor_id: invoiceData.vendor_id || findVendorByName(invoiceData.vendor_name)?.id || '',
        department_name:
          invoiceData.department_name ||
          invoiceData.departmentName ||
          getDepartmentNameById(invoiceData.department_id || invoiceData.departmentId),
        category: buildInvoiceCategoryPayload(invoiceData),
        category_id: invoiceData.category_id || invoiceData.categoryId || invoiceData.category?.id || '',
        category_name:
          invoiceData.category_name ||
          invoiceData.categoryName ||
          invoiceData.category?.name ||
          getCategoryNameById(invoiceData.category_id || invoiceData.categoryId || invoiceData.category?.id),
        memo:
          invoiceData.memo ||
          invoiceData.description ||
          (Array.isArray(invoiceData.notes) ? invoiceData.notes.join('\n') : ''),
        original_file_name:
          invoiceData.original_file_name ||
          invoiceData.original_filename ||
          null,
        source: invoiceData.source || 'Upload',
        source_email: invoiceData.source === 'Email' ? invoiceData.source_email : null,
      },
      {
        ...options,
        totals,
        tdsAmount: options.tdsAmount ?? computeTdsAmount(lineItems, invoiceData.tds),
        categoryEnabled: isCategoryFeatureEnabled,
      },
    );
  };

  const buildInvoiceMultipartPayload = (invoicePayload, file = null, options = {}) => {
    const multipartPayload = new FormData();
    if (file) {
      multipartPayload.append('file', file);
    }
    const requestBody = toInvoiceApiPayload(
      buildCreateInvoiceRequestBody(invoicePayload, {
        ...options,
        uploadedFileName: file?.name,
        categoryEnabled: isCategoryFeatureEnabled,
      }),
    );
    multipartPayload.append(
      'invoice',
      new Blob([JSON.stringify(requestBody)], { type: 'application/json' }),
    );
    return multipartPayload;
  };

  // Initialize form data for new invoice
  const initializeFormData = (extractedData = null) => {
    const matchedVendor = extractedData?.vendor_name ? findVendorByName(extractedData.vendor_name) : null;
    const notesText = Array.isArray(extractedData?.notes) ? extractedData.notes.join('\n') : '';
    const invoiceCurrency = normalizeCurrencyCode(extractedData?.currency) || DEFAULT_CURRENCY;
    const useInrTax = isInrInvoiceCurrency(invoiceCurrency);
    const defaultGstTreatment = useInrTax ? 'Regular' : 'N/A';
    const vendorAddress =
      extractedData?.vendor_address ||
      extractedData?.address ||
      '';
    const billingAddress =
      extractedData?.billing_address ||
      extractedData?.billingAddress ||
      vendorAddress;
    return {
      vendor_name: extractedData?.vendor_name || '',
      vendor_id: matchedVendor?.id || '',
      vendor_matched: !!matchedVendor,
      vendor_request_submitted: false,
      vendor_request_pending: Boolean(matchedVendor?.is_pending_approval),
      vendor_gstin: extractedData?.vendor_gstin || '',
      vendor_address: vendorAddress,
      invoice_number: extractedData?.invoice_number || '',
      invoice_date: extractedData?.invoice_date || format(new Date(), 'yyyy-MM-dd'),
      due_date: extractedData?.due_date || format(new Date(), 'yyyy-MM-dd'),
      billing_address: billingAddress,
      shipping_address: extractedData?.shipping_address || extractedData?.shippingAddress || '',
      gst_treatment: extractedData?.gst_treatment || extractedData?.gstTreatment || defaultGstTreatment,
      gstin:
        extractedData?.vendor_gstin ||
        extractedData?.vendorGstin ||
        extractedData?.gstin ||
        extractedData?.billing_gstin ||
        extractedData?.billingGstin ||
        matchedVendor?.gstin ||
        '',
      source_of_supply:
        extractedData?.source_of_supply ||
        extractedData?.sourceOfSupply ||
        extractedData?.place_of_supply ||
        extractedData?.placeOfSupply ||
        '',
      destination_of_supply:
        extractedData?.destination_of_supply ||
        extractedData?.destinationOfSupply ||
        extractedData?.place_of_supply ||
        extractedData?.placeOfSupply ||
        '',
      location:
        extractedData?.location ||
        extractedData?.place_of_supply ||
        extractedData?.placeOfSupply ||
        '',
      reverse_charges: extractedData?.reverse_charges || 'Not Applicable',
      discounts_level:
        extractedData?.discounts_level ||
        extractedData?.discountsLevel ||
        'At Line Item Level',
      invoice_discount:
        extractedData?.invoice_discount ??
        extractedData?.invoiceDiscount ??
        0,
      invoice_discount_type:
        extractedData?.invoice_discount_type ||
        extractedData?.invoiceDiscountType ||
        '%',
      source: extractedData?.source || 'Upload',
      source_email: '',
      line_items: extractedData?.line_items?.length > 0
        ? extractedData.line_items.map((item) =>
            mapExtractedLineItemToForm(item, { useInrTax }),
          )
        : [createDefaultLineItem(invoiceCurrency)],
      description: extractedData?.description || notesText || '',
      tds: '',
      amount: extractedData?.amount || 0,
      currency: normalizeCurrencyCode(extractedData?.currency) || DEFAULT_CURRENCY,
      scanned_tax_amount: extractedData?.invoice_tax_amount,
      scanned_tax_name: extractedData?.invoice_tax_name,
      scanned_tax_rate: extractedData?.invoice_tax_rate,
      scanned_total: extractedData?.invoice_total,
      file_id: extractedData?.file_id || null,
      file_hash: extractedData?.file_hash || null,
      original_file_name: extractedData?.original_filename || null,
      department_id: extractedData?.department_id || extractedData?.departmentId || '',
      department_name: extractedData?.department_name || extractedData?.departmentName || '',
      ...(isCategoryFeatureEnabled
        ? {
            category: extractedData?.category || null,
            category_id: extractedData?.category_id || extractedData?.categoryId || extractedData?.category?.id || '',
            category_name: extractedData?.category_name || extractedData?.categoryName || extractedData?.category?.name || '',
          }
        : {})
    };
  };

  const resetSingleUploadSession = () => {
    setUploadedFileURL((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return null;
    });
    setUploadedFile(null);
    setExtractedData(null);
    setFormData(null);
    setUploadPreviewError(false);
    setActiveTab('list');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSingleFileUpload = async (e) => {
    if (!guardAction('invoices.scan')) return;
    const file = e.target.files[0];
    if (!file) return;

    const fileURL = URL.createObjectURL(file);
    setUploadedFileURL(fileURL);
    setUploadedFile(file);
    setScanning(true);
    setActiveTab('upload');

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await scanInvoice(formDataUpload).unwrap();
      const normalizedResponse =
        response?.data ??
        response?.result ??
        response?.extracted_data ??
        response;

      if (!normalizedResponse || typeof normalizedResponse !== 'object') {
        throw new Error('Scan API returned empty response');
      }

      if (isDuplicateBulkExtractResult(normalizedResponse)) {
        resetSingleUploadSession();
        toast.error(
          <div className="space-y-2">
            <p className="font-bold text-base">Duplicate Invoice</p>
            <p className="text-sm whitespace-pre-line">
              {normalizedResponse?.error ||
                normalizedResponse?.message ||
                'An invoice with the same invoice number and vendor already exists.'}
            </p>
          </div>,
          { duration: 8000 },
        );
        return;
      }

      const extractedInvoice = normalizeScannedInvoice(normalizedResponse);
      setExtractedData(extractedInvoice);
      setFormData(initializeFormData(extractedInvoice));
      toast.success('Invoice scanned successfully!');
    } catch (error) {
      console.error('Scan error:', error);

      const errorMessage =
        extractApiErrorDetail(error) ||
        error?.data?.message ||
        error?.message ||
        'Failed to scan invoice';

      if (isDuplicateInvoiceError(error)) {
        resetSingleUploadSession();
        toast.error(
          <div className="space-y-2">
            <p className="font-bold text-base">Duplicate Invoice</p>
            <p className="text-sm whitespace-pre-line">{errorMessage}</p>
          </div>,
          { duration: 8000 },
        );
        return;
      }

      setExtractedData(null);
      setFormData({
        ...initializeFormData(null),
        original_file_name: file.name,
      });
      toast.warning(
        <div className="space-y-2">
          <p className="font-bold text-base">Scan Failed</p>
          <p className="text-sm whitespace-pre-line">
            {errorMessage}
          </p>
          <p className="text-sm">Enter invoice details manually using the form.</p>
        </div>,
        { duration: 8000 },
      );
    } finally {
      setScanning(false);
    }
  };

  const handleBulkFileUpload = async (e) => {
    if (!guardAction('invoices.bulkUpload')) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setBulkProgress({ total: 0, processed: 0, success: 0, failed: 0, startedAt: null });
    setBulkElapsedSeconds(0);
    setBulkExtracting(true);
    setBulkExtractTotalFiles(files.length);
    setBulkExtractStartedAt(Date.now());
    setBulkExtractProgress(8);

    const formDataUpload = new FormData();
    Array.from(files).forEach(file => {
      formDataUpload.append('files', file);
    });

    toast.info(`Uploading ${files.length} invoices...`, { duration: 3000 });

    try {
      const response = await bulkUploadInvoices(formDataUpload).unwrap();

      const total = Number(response?.total ?? 0);
      const successful = Number(response?.successful ?? 0);
      const results = Array.isArray(response?.results) ? response.results : [];

      const normalizedResults = results.map((r) => ({
        ...r,
        status: (r?.status || '').toLowerCase(),
        extracted: r?.extractedData ?? r?.extracted_data ?? null,
      }));

      const fileMap = new Map(
        Array.from(files).map((file) => [String(file.name || '').toLowerCase(), file])
      );

      const previewItems = normalizedResults.map((result, index) => {
        const isDuplicate = isDuplicateBulkExtractResult(result);
        const isExtracted =
          !isDuplicate &&
          result.status === 'success' &&
          result.extracted &&
          typeof result.extracted === 'object';
        const normalizedInvoice = isExtracted ? normalizeScannedInvoice(result.extracted) : null;
        const invoicePayload = normalizedInvoice ? toCreateInvoicePayload(normalizedInvoice) : null;
        const matchingFile = fileMap.get(String(result?.filename || '').toLowerCase()) || null;
        const vendorMissing =
          Boolean(invoicePayload) &&
          !invoicePayload.vendor_id &&
          !invoicePayload.vendor_request_submitted;
        return {
          id: `${result?.filename || 'file'}-${index}`,
          filename: result?.filename || 'Unknown file',
          status: isDuplicate ? 'duplicate' : vendorMissing ? 'vendor_missing' : result.status,
          error: isDuplicate
            ? result?.error ||
              result?.message ||
              'An invoice with the same invoice number and vendor already exists.'
            : vendorMissing
              ? `Vendor "${normalizedInvoice?.vendor_name || 'Unknown'}" not found in vendor master`
              : (result?.error || result?.message || ''),
          isDuplicate,
          selected: Boolean(invoicePayload && !vendorMissing && !isDuplicate),
          invoicePayload: isDuplicate ? null : invoicePayload,
          file: matchingFile,
        };
      });

      setBulkPreviewItems(previewItems);
      setBulkPreviewOpen(true);
      toast.success(`Extracted ${successful} of ${total} files. Review and confirm to create invoices.`, {
        duration: 5000,
      });
    } catch (error) {
      const errorMessage = error?.data?.detail || 'Bulk upload failed';
      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setBulkExtractProgress(100);
      setBulkExtracting(false);
    }
  };

  const handleCreateBulkInvoices = async () => {
    if (!guardAction('invoices.create')) return;
    const selectedItems = bulkPreviewItems.filter(
      (item) => item.selected && item.invoicePayload && item.status !== 'uploaded'
    );
    if (selectedItems.length === 0) {
      toast.error('No extracted invoices selected for creation');
      return;
    }
    const missingMandatoryItem = selectedItems.find((item) =>
      getInvoiceMandatoryFieldValidationMessage(
        item.invoicePayload,
        invoiceMandatoryFields,
        mandatoryFieldOptions,
      ),
    );
    if (missingMandatoryItem) {
      const validationMessage = getInvoiceMandatoryFieldValidationMessage(
        missingMandatoryItem.invoicePayload,
        invoiceMandatoryFields,
        mandatoryFieldOptions,
      );
      toast.error(`${validationMessage} (${missingMandatoryItem.filename})`);
      return;
    }

    setBulkCreating(true);
    setBulkProgress({
      total: selectedItems.length,
      processed: 0,
      success: 0,
      failed: 0,
      startedAt: Date.now(),
    });
    try {
      let createdCount = 0;
      let failedCount = 0;

      for (const [index, item] of selectedItems.entries()) {
        try {
          await createInvoice(
            buildInvoiceMultipartPayload(item.invoicePayload, item.file, {
              uploadedFileName: item.file?.name,
            }),
          ).unwrap();
          createdCount += 1;
          setBulkPreviewItems((prev) =>
            prev.map((row) =>
              row.id === item.id ? { ...row, status: 'uploaded', selected: false, error: '' } : row
            )
          );
        } catch (error) {
          failedCount += 1;
          const duplicate = isDuplicateInvoiceError(error);
          setBulkPreviewItems((prev) =>
            prev.map((row) =>
              row.id === item.id
                ? {
                    ...row,
                    status: duplicate ? 'duplicate' : 'upload_failed',
                    isDuplicate: duplicate || row.isDuplicate,
                    error:
                      error?.data?.detail ||
                      error?.data?.message ||
                      'Upload failed',
                    selected: false,
                  }
                : row
            )
          );
          toast.error(`Failed: ${item.filename}`);
        } finally {
          const processed = index + 1;
          setBulkProgress((prev) => ({
            ...prev,
            processed,
            success: createdCount,
            failed: failedCount,
          }));
        }
      }

      toast.success(
        `Created ${createdCount} invoice${createdCount === 1 ? '' : 's'}${failedCount ? `, ${failedCount} failed` : ''}.`,
        { duration: 5000 }
      );
    } finally {
      setBulkCreating(false);
    }
  };

  const openBulkEditDialog = (item) => {
    if (!item?.invoicePayload) return;
    setBulkEditPreviewError(false);
    setBulkEditItemId(item.id);
    setBulkEditForm({
      vendor_name: item.invoicePayload.vendor_name || '',
      invoice_number: item.invoicePayload.invoice_number || '',
      invoice_date: item.invoicePayload.invoice_date || format(new Date(), 'yyyy-MM-dd'),
      due_date: item.invoicePayload.due_date || format(new Date(), 'yyyy-MM-dd'),
      amount: Number(item.invoicePayload.amount || 0),
      currency: normalizeCurrencyCode(item.invoicePayload.currency) || DEFAULT_CURRENCY,
      department_id: item.invoicePayload.department_id || '',
      department_name: item.invoicePayload.department_name || '',
      ...(isCategoryFeatureEnabled
        ? {
            category: item.invoicePayload.category || null,
            category_id: item.invoicePayload.category_id || item.invoicePayload.category?.id || '',
            category_name: item.invoicePayload.category_name || item.invoicePayload.category?.name || '',
          }
        : {}),
      billing_address: item.invoicePayload.billing_address || '',
      gstin: item.invoicePayload.gstin || '',
      source_of_supply: item.invoicePayload.source_of_supply || '',
      destination_of_supply: item.invoicePayload.destination_of_supply || '',
      gst_treatment: item.invoicePayload.gst_treatment || (isInrInvoiceCurrency(item.invoicePayload.currency) ? 'Regular' : 'N/A'),
      source: item.invoicePayload.source || 'Upload',
      discounts_level: item.invoicePayload.discounts_level || 'At Line Item Level',
      invoice_discount: item.invoicePayload.invoice_discount || 0,
      invoice_discount_type: item.invoicePayload.invoice_discount_type || '%',
      memo: item.invoicePayload.memo || '',
      line_items: (item.invoicePayload.line_items || []).map((line) =>
        mapBulkLineItemToEditForm(line, item.invoicePayload.currency),
      ),
    });
    setBulkEditOpen(true);
  };

  const updateBulkEditLineItem = (index, field, value) => {
    setBulkEditForm((prev) => {
      if (!prev) return prev;
      const nextLines = prev.line_items.map((line, i) => {
        if (i !== index) return line;
        let updated = { ...line, [field]: value };
        if (field === 'quantity' || field === 'unit_rate') {
          updated = syncLineItemLineTotal(updated);
          updated.amount = parseNumericInput(updated.line_total, 0);
        }
        if (!isInrInvoiceCurrency(prev.currency)) {
          if (field === 'tax_name' || field === 'tax_rate') {
            updated = applyForeignLineItemTax(
              updated,
              field === 'tax_name' ? value : updated.tax_name,
              field === 'tax_rate' ? value : updated.tax_rate,
            );
          }
        } else if (field === 'tax') {
          updated = applyInrLineItemTax(updated, value);
        }
        return updated;
      });
      return { ...prev, line_items: nextLines };
    });
  };

  const saveBulkEditChanges = () => {
    if (!bulkEditForm || !bulkEditItemId) return;

    if (!validateMandatoryPayload(bulkEditForm)) return;

    const matchedVendorId = findVendorByName(bulkEditForm.vendor_name)?.id || '';
    setBulkPreviewItems((prev) =>
      prev.map((item) => {
        if (item.id !== bulkEditItemId) return item;
        const updatedPayload = {
          ...item.invoicePayload,
          ...bulkEditForm,
          vendor_id: matchedVendorId,
          amount: parseNumericInput(bulkEditForm.amount, 0),
          line_items: bulkEditForm.line_items.map((line) =>
            mapBulkLineItemToPayload(line, bulkEditForm.currency),
          ),
        };
        if (!isCategoryFeatureEnabled) {
          delete updatedPayload.category;
          delete updatedPayload.category_id;
          delete updatedPayload.category_name;
        }
        const vendorMissing = !matchedVendorId;
        return {
          ...item,
          invoicePayload: updatedPayload,
          selected: !vendorMissing,
          status: vendorMissing ? 'vendor_missing' : item.status,
          error: vendorMissing
            ? `Vendor "${bulkEditForm.vendor_name || 'Unknown'}" not found in vendor master`
            : '',
        };
      })
    );
    setBulkEditOpen(false);
    setBulkEditForm(null);
    setBulkEditItemId('');
  };

  const handleAddVendorForBulkItem = async (itemId) => {
    if (!guardAction('invoices.addVendor')) return;
    const row = bulkPreviewItems.find((item) => item.id === itemId);
    const payload = row?.invoicePayload;
    const vendorName = payload?.vendor_name?.trim();

    if (!row || !payload || !vendorName) {
      toast.error('Vendor name is required');
      return;
    }

    const existingVendor = findVendorByName(vendorName);
    if (existingVendor?.id) {
      setBulkPreviewItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                invoicePayload: { ...item.invoicePayload, vendor_id: existingVendor.id },
                selected: item.status !== 'uploaded',
                error: '',
                status: item.status === 'vendor_missing' || item.status === 'failed' ? 'success' : item.status,
              }
            : item
        )
      );
      toast.success(`Vendor "${vendorName}" matched`);
      return;
    }

    openRequestVendorDialog({
      source: payload,
      context: { type: 'bulk', itemId },
    });
  };

  // Calculate line item subtotal
  const calculateLineItemSubtotal = (item) => {
    if (formData?.discounts_level === 'At Invoice Level') {
      const lineTotal = parseNumericInput(item.line_total ?? item.amount, 0);
      if (lineTotal > 0) return lineTotal;
      return parseNumericInput(item.quantity, 0) * parseNumericInput(item.unit_rate, 0);
    }
    return resolveLineItemSubtotal(item);
  };

  // Calculate totals
  const calculateTotals = (lineItems, currency = formData?.currency ?? DEFAULT_CURRENCY) =>
    calculateInvoiceTotals({
      lineItems,
      currency,
      calculateLineItemSubtotal,
      taxRates: TAX_RATES,
      invoiceTaxAmount: formData?.scanned_tax_amount,
      invoiceTaxName: formData?.scanned_tax_name,
      invoiceTaxRate: formData?.scanned_tax_rate,
      discountsLevel: formData?.discounts_level,
      invoiceDiscount: formData?.invoice_discount,
      invoiceDiscountType: formData?.invoice_discount_type,
    });

  // Add line item
  const addLineItem = () => {
    setFormData(prev => clearScannedTaxSummary({
      ...prev,
      line_items: [...prev.line_items, createDefaultLineItem(prev.currency)],
    }));
  };

  // Remove line item
  const removeLineItem = (index) => {
    setFormData(prev => clearScannedTaxSummary({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index),
    }));
  };

  // Update line item
  const clearScannedTaxSummary = (data = {}) => ({
    ...data,
    scanned_tax_amount: undefined,
    scanned_tax_name: undefined,
    scanned_tax_rate: undefined,
    scanned_total: undefined,
  });

  const updateLineItem = (index, field, value) => {
    setFormData(prev => clearScannedTaxSummary({
      ...prev,
      line_items: prev.line_items.map((item, i) => {
        if (i !== index) return item;

        let updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_rate') {
          updated = syncLineItemLineTotal(updated);
        }
        if (!isInrInvoiceCurrency(prev.currency)) {
          if (field === 'tax_name' || field === 'tax_rate') {
            updated = applyForeignLineItemTax(
              updated,
              field === 'tax_name' ? value : updated.tax_name,
              field === 'tax_rate' ? value : updated.tax_rate,
            );
          }
        } else if (field === 'tax') {
          updated = applyInrLineItemTax(updated, value);
        }

        return updated;
      }),
    }));
  };

  const resetUploadWorkspace = () => {
    resetSingleUploadSession();
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

  const mapBulkLineItemToEditForm = (line = {}, currency = DEFAULT_CURRENCY) => ({
    description: line.description || '',
    ledger: line.ledger || 'Cloud Services',
    quantity: Number(line.quantity || 1),
    unit_rate: Number(line.unit_rate ?? line.unit_price ?? 0),
    amount: Number(
      line.amount ||
        Number(line.quantity || 1) * Number(line.unit_rate ?? line.unit_price ?? 0),
    ),
    line_total: Number(
      line.line_total ??
        line.amount ??
        Number(line.quantity || 1) * Number(line.unit_rate ?? line.unit_price ?? 0),
    ),
    hsn_sac: line.hsn_sac || '',
    tax: line.tax || (isInrInvoiceCurrency(currency) ? DEFAULT_INR_TAX : ''),
    tax_name: line.tax_name || '',
    tax_rate: line.tax_rate ?? '',
    discount: line.discount || 0,
    discount_type: line.discount_type || '%',
    eligible_for_itc: line.eligible_for_itc ?? true,
  });

  const mapBulkLineItemToPayload = (line = {}, currency = DEFAULT_CURRENCY) => ({
    description: line.description,
    quantity: parseNumericInput(line.quantity, 0),
    unit_rate: parseNumericInput(line.unit_rate, 0),
    unit_price: parseNumericInput(line.unit_rate, 0),
    amount: parseNumericInput(line.amount ?? line.line_total, 0),
    hsn_sac: line.hsn_sac || '',
    tax: line.tax || (isInrInvoiceCurrency(currency) ? DEFAULT_INR_TAX : ''),
    tax_name: line.tax_name || '',
    tax_rate: line.tax_rate ?? '',
    ledger: line.ledger || 'Cloud Services',
    discount: parseNumericInput(line.discount, 0),
    discount_type: line.discount_type || '%',
    eligible_for_itc: line.eligible_for_itc ?? true,
  });

  // Add vendor from scanned invoice data
  const handleAddVendorFromInvoice = async () => {
    if (!guardAction('invoices.addVendor')) return;
    if (!formData || !formData.vendor_name) {
      toast.error('Vendor name is required');
      return;
    }

    openRequestVendorDialog({
      source: formData,
      context: { type: 'single' },
    });
  };

  const handleSubmitVendorRequest = async (event) => {
    event.preventDefault();
    if (!guardAction('invoices.addVendor')) return;

    const vendorName = requestVendorForm.name.trim();
    const vendorType = requestVendorForm.vendor_type || requestVendorForm.vendorType;
    const gstin = requestVendorForm.gstin.trim();

    const validationErrors = getInvoiceVendorRequestValidationErrors(requestVendorForm);
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

    if (requestVendorContext?.type === 'bulk') {
      setBulkAddingVendorItemId(requestVendorContext.itemId);
    }

    try {
      const response = await requestVendorAddition({
        ...requestVendorForm,
        name: vendorName,
        vendor_type: vendorType,
        gstin,
      }).unwrap();

      const requestedVendorId = extractVendorIdFromResponse(response);

      const [vendorsResult, pendingResult] = await Promise.all([
        refetchVendors(),
        refetchPendingVendors(),
      ]);
      const freshVendorOptions = mergeInvoiceVendorOptions(
        vendorsResult?.data || [],
        pendingResult?.data || [],
      );
      const normalizedVendorName = vendorName.toLowerCase().trim();
      const matchedVendor =
        (requestedVendorId
          ? freshVendorOptions.find((vendor) => String(vendor.id) === String(requestedVendorId))
          : null) ||
        freshVendorOptions.find(
          (vendor) => String(vendor?.name || '').toLowerCase().trim() === normalizedVendorName,
        ) ||
        null;
      const resolvedVendorId = matchedVendor?.id || requestedVendorId || '';

      if (requestVendorContext?.type === 'bulk') {
        setBulkPreviewItems((prev) =>
          prev.map((item) =>
            item.id === requestVendorContext.itemId
              ? {
                  ...item,
                  selected: Boolean(resolvedVendorId),
                  error: resolvedVendorId
                    ? ''
                    : `Vendor "${vendorName}" requested. You can still create the invoice once the vendor is linked.`,
                  status: resolvedVendorId ? 'success' : item.status,
                  invoicePayload: item.invoicePayload
                    ? {
                        ...item.invoicePayload,
                        vendor_id: resolvedVendorId,
                        vendor_name: vendorName,
                        vendor_request_submitted: true,
                      }
                    : item.invoicePayload,
                }
              : item
          )
        );
      } else {
        setFormData((prev) => ({
          ...prev,
          vendor_name: vendorName,
          vendor_id: resolvedVendorId,
          vendor_matched: Boolean(resolvedVendorId),
          vendor_request_submitted: true,
          vendor_request_pending: Boolean(matchedVendor?.is_pending_approval),
        }));
      }

      toast.success(
        resolvedVendorId
          ? `Vendor "${vendorName}" requested. You can add the invoice now.`
          : `Vendor addition requested for "${vendorName}". You can add the invoice while approval is pending.`,
      );
      handleRequestVendorOpenChange(false);
    } catch (error) {
      console.error('Vendor request error:', error);
      let errorMessage = 'Failed to request vendor addition';
      if (error?.data?.detail) {
        const detail = error.data.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail.map((item) => item.msg || JSON.stringify(item)).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        } else {
          errorMessage = JSON.stringify(detail);
        }
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      }
      toast.error(errorMessage);
    } finally {
      setBulkAddingVendorItemId('');
    }
  };

  const handleAddInvoice = async () => {
    if (!guardAction('invoices.create')) return;
    if (!formData) return;

    const totals = calculateTotals(formData.line_items);
    const invoicePayload = toCreateInvoicePayload(
      {
        ...formData,
        vendor_name: formData.vendor_name?.trim() || '',
        line_items: formData.line_items.map((item) => ({
          ...item,
          unit_price: item.unit_rate,
          amount: calculateLineItemSubtotal(item),
        })),
        memo: formData.description,
        original_file_name: formData.original_file_name || uploadedFile?.name || null,
        current_file_name: uploadedFile?.name || formData.original_file_name || null,
      },
      {
        totals,
        tdsAmount: computeTdsAmount(formData.line_items, formData.tds),
        uploadedFileName: uploadedFile?.name,
      },
    );
    if (!invoicePayload.vendor_id && !formData.vendor_request_submitted) {
      toast.error('Please select or request a vendor before creating invoice');
      return;
    }
    if (!invoicePayload.vendor_name) {
      toast.error('Vendor name is required');
      return;
    }
    if (!validateMandatoryPayload(formData)) return;

    try {
      if (uploadedFile) {
        const multipartPayload = buildInvoiceMultipartPayload(invoicePayload, uploadedFile, {
          totals,
          tdsAmount: computeTdsAmount(formData.line_items, formData.tds),
        });
        await createInvoice(multipartPayload).unwrap();
      } else {
        await createInvoice(invoicePayload).unwrap();
      }

      toast.success('Invoice added successfully');
      resetUploadWorkspace();
    } catch (error) {
      const errorMessage = extractApiErrorDetail(error) || 'Failed to add invoice';

      if (isDuplicateInvoiceError(error)) {
        resetUploadWorkspace();
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

  const handleViewInvoice = async (invoice) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
    setViewTab('details');
    setInvoiceHistory([]);
    
    setLoadingHistory(true);
    try {
      const response = await getInvoiceHistory(invoice.id).unwrap();
      let normalizedHistory = Array.isArray(response)
        ? response
        : normalizeInvoiceHistoryEntries(response);

      if (
        normalizedHistory.length === 0 &&
        (Array.isArray(invoice.approval_records) || Array.isArray(invoice.approvalRecords))
      ) {
        normalizedHistory = normalizeInvoiceHistoryEntries(
          invoice.approval_records || invoice.approvalRecords,
        );
      }

      setInvoiceHistory(normalizedHistory);
    } catch (error) {
      console.error('Failed to fetch invoice history:', error);
      toast.error('Failed to load invoice history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEditInvoice = (invoice) => {
    if (!canEditInvoice(invoice, invoiceEditContext)) {
      const status = formatWorkflowStatus(invoice?.status);
      if (!canUpdateInvoices && !canManageInvoices) {
        toast.error('Only invoice makers can edit invoices in Needs Correction status');
      } else if (status !== NEEDS_CORRECTION_STATUS) {
        toast.error('Invoices can only be edited when status is Needs Correction');
      } else {
        toast.error('Only the creator can edit an invoice in Needs Correction status');
      }
      return;
    }

    setSelectedInvoice(invoice);
    setFormData(
      buildInvoiceEditFormData(invoice, {
        isCategoryFeatureEnabled,
        findVendorByName,
        findVendorById,
      }),
    );
    setEditDialogOpen(true);
  };

  const handleUpdateInvoice = async () => {
    if (!guardAction('invoices.update')) return;
    if (!selectedInvoice || !formData) return;

    if (!validateMandatoryPayload(formData)) return;

    const totals = calculateTotals(formData.line_items);

    try {
      await updateInvoice({
        id: selectedInvoice.id,
        body: {
          invoice_number: formData.invoice_number,
          invoice_date: new Date(formData.invoice_date).toISOString(),
          due_date: new Date(formData.due_date).toISOString(),
          amount: totals.total,
          line_items: formData.line_items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_rate,
            amount: calculateLineItemSubtotal(item),
            tax: item.tax,
            hsn_sac: item.hsn_sac,
          })),
          memo: formData.description,
          source: formData.source,
          source_email: formData.source === 'Email' ? formData.source_email : null,
          department_id: formData.department_id || '',
          department_name: formData.department_name || getDepartmentNameById(formData.department_id),
          ...(isCategoryFeatureEnabled
            ? {
                category: buildInvoiceCategoryPayload(formData),
                category_id: formData.category_id || '',
                category_name: formData.category_name || '',
              }
            : {}),
        },
      }).unwrap();

      toast.success('Invoice updated successfully');
      setEditDialogOpen(false);
      setSelectedInvoice(null);
      setFormData(null);
    } catch (error) {
      toast.error(extractApiErrorDetail(error) || 'Failed to update invoice');
    }
  };

  const handleDeleteInvoice = async (invoice) => {
    if (!guardAction('invoices.delete')) return;
    setInvoiceDeleteTarget(invoice);
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceDeleteTarget) return;
    try {
      await deleteInvoice(invoiceDeleteTarget.id).unwrap();
      toast.success('Invoice deleted successfully');
    } catch (error) {
      toast.error('Failed to delete invoice');
    } finally {
      setInvoiceDeleteTarget(null);
    }
  };

  const canEdit = (invoice) => canEditInvoice(invoice, invoiceEditContext);
  const canDelete = (status) => canDeleteInvoice(status, canDeleteInvoices);

  const getStatusBadgeClass = (status) => getInvoiceStatusBadgeClass(status);

  const formatDuration = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatBulkStatusLabel = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'success' || normalized === 'extracted') return 'Extracted';
    if (normalized === 'vendor_missing') return 'Vendor Not Matched';
    if (normalized === 'uploaded') return 'Uploaded';
    if (normalized === 'upload_failed') return 'Upload Failed';
    if (normalized === 'duplicate') return 'Duplicate';
    if (normalized === 'failed' || normalized === 'error') return 'Extraction Failed';
    return 'Unknown';
  };

  const getBulkStatusBadgeClass = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'uploaded') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (normalized === 'success' || normalized === 'extracted') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (normalized === 'vendor_missing') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (normalized === 'duplicate') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (normalized === 'upload_failed' || normalized === 'failed' || normalized === 'error') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get file URL for invoice preview - either from uploaded file or backend
  const withBaseUrl = (url) => {
    if (!url) return null;
    if (typeof url !== 'string') return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${FILE_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
  };

  const getInvoiceFileUrl = (invoice) => {
    if (invoice?.invoice_file_url) {
      return withBaseUrl(invoice.invoice_file_url);
    }
    if (invoice?.receipt_file_url) {
      return withBaseUrl(invoice.receipt_file_url);
    }
    if (invoice?.file_id) {
      return withBaseUrl(`/files/${invoice.file_id}`);
    }
    return null;
  };

  const renderPdfPreview = (props = {}) => (
    <InvoicePdfPreview
      {...props}
      setPdfZoom={setPdfZoom}
      getInvoiceFileUrl={getInvoiceFileUrl}
    />
  );

  const renderInvoiceForm = ({ isEdit = false, hideActions = false } = {}) => (
    <InvoiceForm
      formData={formData}
      setFormData={setFormData}
      isEdit={isEdit}
      hideActions={hideActions}
      calculateTotals={calculateTotals}
      findVendorByName={findVendorByName}
      handleAddVendorFromInvoice={handleAddVendorFromInvoice}
      updateLineItem={updateLineItem}
      removeLineItem={removeLineItem}
      addLineItem={addLineItem}
      calculateLineItemSubtotal={calculateLineItemSubtotal}
      setEditDialogOpen={setEditDialogOpen}
      setUploadedFile={setUploadedFile}
      setUploadedFileURL={setUploadedFileURL}
      setActiveTab={setActiveTab}
      handleUpdateInvoice={handleUpdateInvoice}
      handleAddInvoice={handleAddInvoice}
      canAddVendor={canAddVendors}
      canSubmit={
        isEdit
          ? selectedInvoice &&
            canEditInvoice(selectedInvoice, invoiceEditContext) &&
            !invoiceMandatoryFieldsLoading &&
            isInvoiceMandatoryFieldsSatisfied(formData, invoiceMandatoryFields, mandatoryFieldOptions)
          : canManageInvoices &&
            !invoiceMandatoryFieldsLoading &&
            isInvoiceMandatoryFieldsSatisfied(formData, invoiceMandatoryFields, mandatoryFieldOptions) &&
            (Boolean(formData?.vendor_id) || Boolean(formData?.vendor_request_submitted))
      }
      departmentMandatory={invoiceMandatoryFields.department}
      categoryMandatory={invoiceMandatoryFields.category}
      vendorOptions={invoiceVendorOptions}
      departments={departments}
      invoiceCategories={invoiceCategories}
      invoiceCategoriesLoading={invoiceCategoriesLoading || invoiceCategoriesFetching}
      showCategoryField={isCategoryFeatureEnabled}
      currencyOptions={invoiceCurrencyOptions}
      GST_TREATMENTS={GST_TREATMENTS}
      INDIAN_STATES={INDIAN_STATES}
      INVOICE_SOURCES={INVOICE_SOURCES}
      LEDGER_OPTIONS={LEDGER_OPTIONS}
      TAX_RATES={TAX_RATES}
    />
  );

  const renderBulkEditInvoiceForm = () => (
    <InvoiceForm
      formData={bulkEditForm}
      setFormData={setBulkEditForm}
      isEdit
      hideActions
      calculateTotals={(lineItems, currency = bulkEditForm?.currency ?? DEFAULT_CURRENCY) =>
        calculateInvoiceTotals({
          lineItems,
          currency,
          calculateLineItemSubtotal: (item) => {
            if (bulkEditForm?.discounts_level === 'At Invoice Level') {
              const lineTotal = parseNumericInput(item.line_total ?? item.amount, 0);
              if (lineTotal > 0) return lineTotal;
              return parseNumericInput(item.quantity, 0) * parseNumericInput(item.unit_rate, 0);
            }
            return resolveLineItemSubtotal(item);
          },
          taxRates: TAX_RATES,
          invoiceTaxAmount: bulkEditForm?.scanned_tax_amount,
          invoiceTaxName: bulkEditForm?.scanned_tax_name,
          invoiceTaxRate: bulkEditForm?.scanned_tax_rate,
          discountsLevel: bulkEditForm?.discounts_level,
          invoiceDiscount: bulkEditForm?.invoice_discount,
          invoiceDiscountType: bulkEditForm?.invoice_discount_type,
        })}
      findVendorByName={findVendorByName}
      handleAddVendorFromInvoice={() => {
        if (bulkEditItemId) handleAddVendorForBulkItem(bulkEditItemId);
      }}
      updateLineItem={updateBulkEditLineItem}
      removeLineItem={(index) =>
        setBulkEditForm((prev) => ({
          ...prev,
          line_items: prev.line_items.filter((_, i) => i !== index),
        }))}
      addLineItem={() =>
        setBulkEditForm((prev) => ({
          ...prev,
          line_items: [...prev.line_items, createDefaultLineItem(prev.currency)],
        }))}
      calculateLineItemSubtotal={(item) => {
        if (bulkEditForm?.discounts_level === 'At Invoice Level') {
          const lineTotal = parseNumericInput(item.line_total ?? item.amount, 0);
          if (lineTotal > 0) return lineTotal;
          return parseNumericInput(item.quantity, 0) * parseNumericInput(item.unit_rate, 0);
        }
        return resolveLineItemSubtotal(item);
      }}
      setEditDialogOpen={setBulkEditOpen}
      setUploadedFile={() => {}}
      setUploadedFileURL={() => {}}
      setActiveTab={() => {}}
      handleUpdateInvoice={saveBulkEditChanges}
      handleAddInvoice={saveBulkEditChanges}
      canAddVendor={canAddVendors}
      canSubmit
      departmentMandatory={invoiceMandatoryFields.department}
      categoryMandatory={invoiceMandatoryFields.category}
      vendorOptions={invoiceVendorOptions}
      departments={departments}
      invoiceCategories={invoiceCategories}
      invoiceCategoriesLoading={invoiceCategoriesLoading || invoiceCategoriesFetching}
      showCategoryField={isCategoryFeatureEnabled}
      currencyOptions={invoiceCurrencyOptions}
      GST_TREATMENTS={GST_TREATMENTS}
      INDIAN_STATES={INDIAN_STATES}
      INVOICE_SOURCES={INVOICE_SOURCES}
      LEDGER_OPTIONS={LEDGER_OPTIONS}
      TAX_RATES={TAX_RATES}
    />
  );

  return (
    <div data-testid="invoices-page">
      <InvoiceHeader
        scanning={scanning}
        canScanInvoices={canScanInvoices}
        canBulkUploadInvoices={canBulkUploadInvoices}
        openBulkFilePicker={openBulkFilePicker}
        bulkFileInputRef={bulkFileInputRef}
        handleBulkFileUpload={handleBulkFileUpload}
        openSingleFilePicker={openSingleFilePicker}
        fileInputRef={fileInputRef}
        handleSingleFileUpload={handleSingleFileUpload}
        currencies={currencies}
        selectedCurrency={selectedCurrency}
        onCurrencyChange={setSelectedCurrency}
      />

      <InvoicesWorkspace
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
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filteredInvoices={filteredInvoices}
        getStatusBadgeClass={getStatusBadgeClass}
        handleViewInvoice={handleViewInvoice}
        canEdit={canEdit}
        handleEditInvoice={handleEditInvoice}
        canDelete={canDelete}
        handleDeleteInvoice={handleDeleteInvoice}
      />

      <InvoicesDialogs
        bulkExtracting={bulkExtracting}
        bulkExtractTotalFiles={bulkExtractTotalFiles}
        bulkExtractProgress={bulkExtractProgress}
        bulkExtractElapsedSeconds={bulkExtractElapsedSeconds}
        formatDuration={formatDuration}
        bulkPreviewOpen={bulkPreviewOpen}
        bulkCreating={bulkCreating}
        bulkAddingVendorItemId={bulkAddingVendorItemId}
        bulkPreviewItems={bulkPreviewItems}
        bulkProgress={bulkProgress}
        bulkElapsedSeconds={bulkElapsedSeconds}
        formatBulkStatusLabel={formatBulkStatusLabel}
        getBulkStatusBadgeClass={getBulkStatusBadgeClass}
        setBulkPreviewOpen={setBulkPreviewOpen}
        setBulkPreviewItems={setBulkPreviewItems}
        handleAddVendorForBulkItem={handleAddVendorForBulkItem}
        openBulkEditDialog={openBulkEditDialog}
        handleCreateBulkInvoices={handleCreateBulkInvoices}
        departments={departments}
        getDepartmentNameById={getDepartmentNameById}
        invoiceCategories={invoiceCategories}
        getCategoryNameById={getCategoryNameById}
        isCategoryFeatureEnabled={isCategoryFeatureEnabled}
        invoiceMandatoryFields={invoiceMandatoryFields}
        bulkEditOpen={bulkEditOpen}
        setBulkEditOpen={setBulkEditOpen}
        bulkEditForm={bulkEditForm}
        setBulkEditForm={setBulkEditForm}
        bulkEditItemId={bulkEditItemId}
        bulkEditFileURL={bulkEditFileURL}
        pdfZoom={pdfZoom}
        bulkEditPreviewError={bulkEditPreviewError}
        setBulkEditPreviewError={setBulkEditPreviewError}
        saveBulkEditChanges={saveBulkEditChanges}
        renderPdfPreview={renderPdfPreview}
        renderBulkEditInvoiceForm={renderBulkEditInvoiceForm}
        viewDialogOpen={viewDialogOpen}
        setViewDialogOpen={setViewDialogOpen}
        selectedInvoice={selectedInvoice}
        viewPreviewError={viewPreviewError}
        setViewPreviewError={setViewPreviewError}
        getStatusBadgeClass={getStatusBadgeClass}
        viewTab={viewTab}
        setViewTab={setViewTab}
        invoiceHistory={invoiceHistory}
        loadingHistory={loadingHistory}
        canEdit={canEdit}
        handleEditInvoice={handleEditInvoice}
        editDialogOpen={editDialogOpen}
        setEditDialogOpen={setEditDialogOpen}
        formData={formData}
        handleUpdateInvoice={handleUpdateInvoice}
        renderInvoiceForm={renderInvoiceForm}
        requestVendorOpen={requestVendorOpen}
        handleRequestVendorOpenChange={handleRequestVendorOpenChange}
        requestVendorForm={requestVendorForm}
        setRequestVendorForm={setRequestVendorForm}
        handleSubmitVendorRequest={handleSubmitVendorRequest}
        requestVendorLoading={requestVendorLoading}
        invoiceDeleteTarget={invoiceDeleteTarget}
        setInvoiceDeleteTarget={setInvoiceDeleteTarget}
        confirmDeleteInvoice={confirmDeleteInvoice}
      />
    </div>
  );
};

export default InvoicesPage;
