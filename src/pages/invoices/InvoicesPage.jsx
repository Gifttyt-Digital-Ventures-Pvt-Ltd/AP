import React, { useEffect, useState, useRef } from 'react';
import {
  useGetInvoicesQuery,
  useGetVendorsQuery,
  useScanInvoiceMutation,
  useBulkUploadInvoicesMutation,
  useRequestVendorAdditionMutation,
  useCreateInvoiceMutation,
  useLazyGetInvoiceHistoryQuery,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
} from '../../Services/apis/invoicesVendorsApi';
import {
  useGetCorporateDepartmentsQuery,
  useGetCorporateUserDetailsQuery,
} from '../../Services/apis/corporateApi';
import { useGetCategoriesForInvoiceQuery } from '../../Services/apis/categoriesApi';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Pencil, Clock, CheckCircle2, XCircle, CreditCard } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useSidebar } from '../../components/Layout';
import {
  FILE_CATEGORIES,
  GST_TREATMENTS,
  INDIAN_STATES,
  INVOICE_SOURCES,
  LEDGER_OPTIONS,
  TAX_RATES,
} from './constants';
import { InvoicePdfPreview } from './components/InvoicePdfPreview';
import { InvoiceForm } from './components/InvoiceForm';
import InvoiceHeader from './components/InvoiceHeader';
import InvoiceTabs from './components/InvoiceTabs';
import ViewDialog from './components/ViewDialog';
import EditDialog from './components/EditDialog';
import BulkExtractLoaderDialog from './components/BulkExtractLoaderDialog';
import BulkPreviewDialog from './components/BulkPreviewDialog';
import BulkEditDialog from './components/BulkEditDialog';
import RequestVendorDialog from './components/RequestVendorDialog';
import { useActionGuard } from '../../hooks/useActionGuard';
import { useRBAC } from '../../contexts/RBACContext';

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
  country: 'India',
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
  const { isCategoryFeatureEnabled } = useRBAC();
  const {
    data: corporateUserContext = null,
  } = useGetCorporateUserDetailsQuery();
  const invoiceCategoryEmail =
    corporateUserContext?.corporateUser?.email ||
    corporateUserContext?.employeeDetails?.email ||
    user?.email ||
    user?.identifier ||
    '';
  const {
    data: invoicesData = [],
  } = useGetInvoicesQuery();
  const {
    data: vendorsData = [],
  } = useGetVendorsQuery();
  const {
    data: departmentsData = [],
  } = useGetCorporateDepartmentsQuery();
  const {
    data: invoiceCategoriesData = [],
    isLoading: invoiceCategoriesLoading,
    isFetching: invoiceCategoriesFetching,
  } = useGetCategoriesForInvoiceQuery(invoiceCategoryEmail, {
    skip: !invoiceCategoryEmail || !isCategoryFeatureEnabled,
  });
  const [scanInvoice] = useScanInvoiceMutation();
  const [bulkUploadInvoices] = useBulkUploadInvoicesMutation();
  const [requestVendorAddition, { isLoading: requestVendorLoading }] = useRequestVendorAdditionMutation();
  const [createInvoice] = useCreateInvoiceMutation();
  const [getInvoiceHistory] = useLazyGetInvoiceHistoryQuery();
  const [updateInvoice] = useUpdateInvoiceMutation();
  const [deleteInvoice] = useDeleteInvoiceMutation();
  const { guardAction, canPerformAction } = useActionGuard();
  const invoices = Array.isArray(invoicesData) ? invoicesData : [];
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];
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


  // Check if vendor exists in system
  const findVendorByName = (vendorName) => {
    if (!vendorName) return null;
    return vendors.find(v => 
      v.name.toLowerCase().trim() === vendorName.toLowerCase().trim()
    );
  };

  const buildVendorRequestForm = (source = {}) => ({
    ...createEmptyVendorRequestForm(),
    name: source.vendor_name || source.name || '',
    gstin: source.gstin || source.vendor_gstin || '',
    address_line1: source.billing_address || source.vendor_address || source.address_line1 || '',
    notes: source.memo || source.description || '',
  });

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
      : Array.isArray(scanResponse?.items)
        ? scanResponse.items
        : [];
    const taxesRaw = Array.isArray(scanResponse?.taxes) ? scanResponse.taxes : [];

    const resolveTaxLabel = (item) => {
      if (item?.tax) return item.tax;
      const rate = Number(item?.taxRate ?? item?.tax_rate ?? 0);
      const hasAnyTaxData =
        rate > 0 ||
        taxesRaw.some((t) => Number(t?.amount ?? 0) > 0 || Number(t?.taxRate ?? t?.tax_rate ?? 0) > 0);
      if (!hasAnyTaxData) return 'Exempt';
      if (!rate) return 'CGST + SGST 18%';
      const hasIgst = taxesRaw.some((t) => String(t?.name || '').toUpperCase().includes('IGST'));
      if (hasIgst) return `IGST ${rate}%`;
      return `CGST + SGST ${rate}%`;
    };

    const lineItems = lineItemsRaw.map((item) => {
      const quantity = Number(item?.quantity ?? item?.qty ?? 1) || 1;
      const unitPrice = Number(item?.unit_price ?? item?.unitPrice ?? item?.price ?? 0) || 0;
      const amount = Number(item?.amount ?? item?.lineTotal ?? quantity * unitPrice) || 0;
      return {
        description: item?.description ?? item?.name ?? '',
        quantity,
        unit_price: unitPrice,
        amount,
        hsn_sac: item?.hsn_sac ?? item?.hsnSac ?? '',
        tax: resolveTaxLabel(item),
      };
    });

    const computedAmount = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return {
      vendor_name: scanResponse?.vendor_name ?? scanResponse?.vendorName ?? scanResponse?.merchant ?? '',
      vendor_gstin: scanResponse?.vendor_gstin ?? scanResponse?.vendorGstin ?? '',
      vendor_address:
        scanResponse?.address ??
        scanResponse?.vendor_address ??
        scanResponse?.vendorAddress ??
        '',
      invoice_number: scanResponse?.invoice_number ?? scanResponse?.invoiceNumber ?? '',
      invoice_date:
        toDateOnly(scanResponse?.invoice_date ?? scanResponse?.invoiceDate ?? scanResponse?.datetime) ||
        format(new Date(), 'yyyy-MM-dd'),
      due_date:
        toDateOnly(scanResponse?.due_date ?? scanResponse?.dueDate ?? scanResponse?.datetime) ||
        format(new Date(), 'yyyy-MM-dd'),
      line_items: lineItems,
      amount: Number(scanResponse?.amount ?? scanResponse?.total ?? scanResponse?.subtotal ?? computedAmount) || 0,
      currency: scanResponse?.currency ?? 'INR',
      file_id: scanResponse?.file_id ?? scanResponse?.fileId ?? null,
      file_hash: scanResponse?.file_hash ?? scanResponse?.fileHash ?? null,
      original_filename: scanResponse?.original_filename ?? scanResponse?.originalFileName ?? null,
    };
  };

  const toCreateInvoicePayload = (invoiceData = {}) => {
    const categoryPayload = buildInvoiceCategoryPayload(invoiceData);
    return {
      vendor_name: invoiceData.vendor_name || '',
      invoice_number: invoiceData.invoice_number || '',
      vendor_id: invoiceData.vendor_id || findVendorByName(invoiceData.vendor_name)?.id || '',
      invoice_date: invoiceData.invoice_date || format(new Date(), 'yyyy-MM-dd'),
      due_date: invoiceData.due_date || format(new Date(), 'yyyy-MM-dd'),
      amount: Number(invoiceData.amount || 0),
      currency: invoiceData.currency || 'INR',
      billing_address: invoiceData.billing_address || invoiceData.vendor_address || '',
      gstin: invoiceData.gstin || invoiceData.vendor_gstin || '',
      source_of_supply: invoiceData.source_of_supply || invoiceData.place_of_supply || '',
      destination_of_supply: invoiceData.destination_of_supply || invoiceData.place_of_supply || '',
      location: invoiceData.location || invoiceData.place_of_supply || '',
      line_items: (invoiceData.line_items || []).map((item) => ({
        description: item.description || '',
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price ?? item.amount ?? 0),
        amount: Number(item.amount ?? (Number(item.quantity || 1) * Number(item.unit_price ?? 0))),
      })),
      memo: invoiceData.notes?.join?.('\n') || '',
      file_id: invoiceData.file_id || null,
      file_hash: invoiceData.file_hash || null,
      original_file_name: invoiceData.original_filename || null,
      department_id: invoiceData.department_id || invoiceData.departmentId || '',
      department_name:
        invoiceData.department_name ||
        invoiceData.departmentName ||
        getDepartmentNameById(invoiceData.department_id || invoiceData.departmentId),
      ...(isCategoryFeatureEnabled
        ? {
            category: categoryPayload,
            category_id: invoiceData.category_id || invoiceData.categoryId || invoiceData.category?.id || '',
            category_name:
              invoiceData.category_name ||
              invoiceData.categoryName ||
              invoiceData.category?.name ||
              getCategoryNameById(invoiceData.category_id || invoiceData.categoryId || invoiceData.category?.id),
          }
        : {}),
      source: 'Upload',
      source_email: null,
      file_category: 'Expense Invoice',
    };
  };

  const toLocalDateTimeString = (value) => {
    if (!value) return value;
    if (typeof value !== 'string') return value;
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  };

  const buildInvoiceMultipartPayload = (invoicePayload, file = null) => {
    const multipartPayload = new FormData();
    if (file) {
      multipartPayload.append('file', file);
    }
    multipartPayload.append(
      'invoice',
      new Blob(
        [
          JSON.stringify({
            invoiceNumber: invoicePayload.invoice_number,
            vendorId: invoicePayload.vendor_id || null,
            invoiceDate: toLocalDateTimeString(invoicePayload.invoice_date),
            dueDate: toLocalDateTimeString(invoicePayload.due_date),
            amount: invoicePayload.amount,
            currency: invoicePayload.currency,
            lineItems: (invoicePayload.line_items || []).map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              amount: item.amount,
            })),
            memo: invoicePayload.memo || '',
            fileId: invoicePayload.file_id || null,
            fileHash: invoicePayload.file_hash || null,
            originalFileName: invoicePayload.original_file_name || file?.name || null,
            source: invoicePayload.source,
            sourceEmail: invoicePayload.source_email,
            fileCategory: invoicePayload.file_category,
            departmentId: invoicePayload.department_id || null,
            departmentName: invoicePayload.department_name || null,
            ...(isCategoryFeatureEnabled
              ? { category: buildInvoiceCategoryPayload(invoicePayload) }
              : {}),
          }),
        ],
        { type: 'application/json' }
      )
    );
    return multipartPayload;
  };

  // Initialize form data for new invoice
  const initializeFormData = (extractedData = null) => {
    const matchedVendor = extractedData?.vendor_name ? findVendorByName(extractedData.vendor_name) : null;
    const notesText = Array.isArray(extractedData?.notes) ? extractedData.notes.join('\n') : '';
    const extractedGstin = extractedData?.billing_gstin || extractedData?.vendor_gstin || '';
    const extractedAddress =
      extractedData?.address ||
      extractedData?.vendor_address ||
      extractedData?.billing_address ||
      '';
    return {
      vendor_name: extractedData?.vendor_name || '',
      vendor_id: matchedVendor?.id || '',
      vendor_matched: !!matchedVendor,
      vendor_gstin: extractedData?.vendor_gstin || extractedData?.billing_gstin || '',
      vendor_address: extractedAddress,
      invoice_number: extractedData?.invoice_number || '',
      invoice_date: extractedData?.invoice_date || format(new Date(), 'yyyy-MM-dd'),
      due_date: extractedData?.due_date || format(new Date(), 'yyyy-MM-dd'),
      billing_address: extractedAddress,
      gst_treatment: extractedData?.gst_treatment || 'Regular',
      gstin: extractedGstin,
      source_of_supply: extractedData?.source_of_supply || extractedData?.place_of_supply || '',
      destination_of_supply: extractedData?.destination_of_supply || extractedData?.place_of_supply || '',
      location: extractedData?.location || extractedData?.place_of_supply || '',
      reverse_charges: extractedData?.reverse_charges || 'Not Applicable',
      discounts_level: extractedData?.discounts_level || 'At Line Item Level',
      file_category: extractedData?.file_category || 'Expense Invoice',
      source: extractedData?.source || 'Upload',
      source_email: '',
      line_items: extractedData?.line_items?.length > 0 ? extractedData.line_items.map(item => ({
        description: item.description || '',
        ledger: item.ledger || 'Cloud Services',
        tax: item.tax || 'CGST + SGST 18%',
        quantity: item.quantity || 1,
        unit_rate: item.unit_price || item.amount || 0,
        discount: item.discount || 0,
        discount_type: item.discount_type || '%',
        hsn_sac: item.hsn_sac || '',
        eligible_for_itc: item.eligible_for_itc ?? true
      })) : [{
        description: '',
        ledger: 'Cloud Services',
        tax: 'CGST + SGST 18%',
        quantity: 1,
        unit_rate: 0,
        discount: 0,
        discount_type: '%',
        hsn_sac: '',
        eligible_for_itc: true
      }],
      description: extractedData?.description || notesText || '',
      tds: '',
      amount: extractedData?.amount || 0,
      currency: extractedData?.currency || 'INR',
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

      const extractedInvoice = normalizeScannedInvoice(normalizedResponse);
      setExtractedData(extractedInvoice);
      setFormData(initializeFormData(extractedInvoice));
      toast.success('Invoice scanned successfully!');
    } catch (error) {
      console.error('Scan error:', error);
      setExtractedData(null);
      setFormData(initializeFormData());
      
      const errorMessage =
        error?.data?.detail ||
        error?.data?.message ||
        error?.message ||
        'Failed to scan invoice';
      toast.error(
        <div className="space-y-2">
          <p className="font-bold text-base">Scan Failed!</p>
          <p className="text-sm whitespace-pre-line">{errorMessage}</p>
        </div>,
        { duration: 8000 }
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
        const isExtracted = result.status === 'success' && result.extracted && typeof result.extracted === 'object';
        const normalizedInvoice = isExtracted ? normalizeScannedInvoice(result.extracted) : null;
        const invoicePayload = normalizedInvoice ? toCreateInvoicePayload(normalizedInvoice) : null;
        const matchingFile = fileMap.get(String(result?.filename || '').toLowerCase()) || null;
        const vendorMissing = Boolean(invoicePayload) && !invoicePayload.vendor_id;
        return {
          id: `${result?.filename || 'file'}-${index}`,
          filename: result?.filename || 'Unknown file',
          status: vendorMissing ? 'failed' : result.status,
          error: vendorMissing
            ? `Vendor "${normalizedInvoice?.vendor_name || 'Unknown'}" not found`
            : (result?.error || result?.message || ''),
          selected: Boolean(invoicePayload && !vendorMissing),
          invoicePayload,
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
    const missingDepartmentItem = selectedItems.find((item) => !item.invoicePayload?.department_id);
    if (missingDepartmentItem) {
      toast.error(`Please select department for ${missingDepartmentItem.filename}`);
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
          await createInvoice(buildInvoiceMultipartPayload(item.invoicePayload, item.file)).unwrap();
          createdCount += 1;
          setBulkPreviewItems((prev) =>
            prev.map((row) =>
              row.id === item.id ? { ...row, status: 'uploaded', selected: false, error: '' } : row
            )
          );
        } catch (error) {
          failedCount += 1;
          setBulkPreviewItems((prev) =>
            prev.map((row) =>
              row.id === item.id
                ? {
                    ...row,
                    status: 'upload_failed',
                    error: error?.data?.detail || error?.data?.message || 'Upload failed',
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
      currency: item.invoicePayload.currency || 'INR',
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
      location: item.invoicePayload.location || '',
      memo: item.invoicePayload.memo || '',
      line_items: (item.invoicePayload.line_items || []).map((line) => ({
        description: line.description || '',
        quantity: Number(line.quantity || 1),
        unit_price: Number(line.unit_price || 0),
        amount: Number(line.amount || (Number(line.quantity || 1) * Number(line.unit_price || 0))),
        hsn_sac: line.hsn_sac || '',
        tax: line.tax || 'CGST + SGST 18%',
      })),
    });
    setBulkEditOpen(true);
  };

  const updateBulkEditLineItem = (index, field, value) => {
    setBulkEditForm((prev) => {
      if (!prev) return prev;
      const nextLines = prev.line_items.map((line, i) => {
        if (i !== index) return line;
        const updated = { ...line, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.amount = Number(updated.quantity || 0) * Number(updated.unit_price || 0);
        }
        return updated;
      });
      return { ...prev, line_items: nextLines };
    });
  };

  const saveBulkEditChanges = () => {
    if (!bulkEditForm || !bulkEditItemId) return;
    const matchedVendorId = findVendorByName(bulkEditForm.vendor_name)?.id || '';
    setBulkPreviewItems((prev) =>
      prev.map((item) => {
        if (item.id !== bulkEditItemId) return item;
        const updatedPayload = {
          ...item.invoicePayload,
          ...bulkEditForm,
          vendor_id: matchedVendorId,
          line_items: bulkEditForm.line_items.map((line) => ({
            description: line.description,
            quantity: Number(line.quantity || 0),
            unit_price: Number(line.unit_price || 0),
            amount: Number(line.amount || 0),
            hsn_sac: line.hsn_sac || '',
            tax: line.tax || 'CGST + SGST 18%',
          })),
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
          error: vendorMissing
            ? `Vendor "${bulkEditForm.vendor_name || 'Unknown'}" not found`
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
                status: item.status === 'failed' ? 'success' : item.status,
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
    const subtotal = item.quantity * item.unit_rate;
    if (item.discount_type === '%') {
      return subtotal - (subtotal * item.discount / 100);
    }
    return subtotal - item.discount;
  };

  // Calculate totals
  const calculateTotals = (lineItems) => {
    let subTotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    lineItems.forEach(item => {
      const itemSubtotal = calculateLineItemSubtotal(item);
      subTotal += itemSubtotal;

      const taxRate = TAX_RATES.find(t => t.value === item.tax);
      if (taxRate) {
        if (taxRate.cgst) cgst += itemSubtotal * taxRate.cgst / 100;
        if (taxRate.sgst) sgst += itemSubtotal * taxRate.sgst / 100;
        if (taxRate.igst) igst += itemSubtotal * taxRate.igst / 100;
      }
    });

    return { subTotal, cgst, sgst, igst, total: subTotal + cgst + sgst + igst };
  };

  // Add line item
  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, {
        description: '',
        ledger: 'Cloud Services',
        tax: 'CGST + SGST 18%',
        quantity: 1,
        unit_rate: 0,
        discount: 0,
        discount_type: '%',
        hsn_sac: '',
        eligible_for_itc: true
      }]
    }));
  };

  // Remove line item
  const removeLineItem = (index) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index)
    }));
  };

  // Update line item
  const updateLineItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

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

    if (!vendorName) {
      toast.error('Vendor name is required');
      return;
    }
    if (!vendorType) {
      toast.error('Vendor type is required');
      return;
    }
    if (!gstin) {
      toast.error('GSTIN is required');
      return;
    }

    if (requestVendorContext?.type === 'bulk') {
      setBulkAddingVendorItemId(requestVendorContext.itemId);
    }

    try {
      await requestVendorAddition({
        ...requestVendorForm,
        name: vendorName,
        vendor_type: vendorType,
        gstin,
      }).unwrap();

      if (requestVendorContext?.type === 'bulk') {
        setBulkPreviewItems((prev) =>
          prev.map((item) =>
            item.id === requestVendorContext.itemId
              ? {
                  ...item,
                  selected: false,
                  error: `Vendor addition requested for "${vendorName}". Create the invoice after the vendor is approved.`,
                  status: 'failed',
                }
              : item
          )
        );
      } else {
        setFormData((prev) => ({
          ...prev,
          vendor_id: '',
          vendor_matched: false,
        }));
      }

      toast.success(`Vendor addition requested for "${vendorName}"`);
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
    const invoicePayload = {
      invoice_number: formData.invoice_number,
      vendor_id: formData.vendor_id || '',
      invoice_date: formData.invoice_date,
      due_date: formData.due_date,
      amount: totals.total,
      currency: formData.currency || 'INR',
      line_items: formData.line_items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_rate,
        amount: calculateLineItemSubtotal(item)
      })),
      memo: formData.description,
      file_id: formData.file_id,
      file_hash: formData.file_hash,
      original_file_name: formData.original_file_name,
      source: formData.source || 'Upload',
      source_email: formData.source === 'Email' ? formData.source_email : null,
      file_category: formData.file_category || 'Expense Invoice',
      department_id: formData.department_id || '',
      department_name: formData.department_name || getDepartmentNameById(formData.department_id),
      ...(isCategoryFeatureEnabled
        ? {
            category: buildInvoiceCategoryPayload(formData),
            category_id: formData.category_id || '',
            category_name: formData.category_name || '',
          }
        : {}),
    };
    if (!invoicePayload.vendor_id) {
      toast.error('Please select or add a vendor before creating invoice');
      return;
    }
    if (!invoicePayload.department_id) {
      toast.error('Please select a department before creating invoice');
      return;
    }

    try {
      if (uploadedFile) {
        const multipartPayload = buildInvoiceMultipartPayload(invoicePayload, uploadedFile);
        await createInvoice(multipartPayload).unwrap();
      } else {
        await createInvoice(invoicePayload).unwrap();
      }

      toast.success('Invoice added successfully');
      setUploadedFile(null);
      setUploadedFileURL(null);
      setExtractedData(null);
      setFormData(null);
      setActiveTab('list');
    } catch (error) {
      console.log(error)
      const errorMessage = error?.data?.detail || 'Failed to add invoice';
      toast.error(
        <div className="space-y-2">
          <p className="font-bold text-base">Cannot Add Invoice!</p>
          <p className="text-sm whitespace-pre-line">{errorMessage}</p>
        </div>,
        { duration: 8000 }
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
      const rawHistory = Array.isArray(response)
        ? response
        : Array.isArray(response?.history)
          ? response.history
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.results)
              ? response.results
              : Array.isArray(response?.content)
                ? response.content
                : [];

      const normalizedHistory = rawHistory.map((entry, index) => ({
        id:
          entry.id ||
          entry.recordId ||
          `${entry.userId || entry.user_id || 'user'}-${entry.timestamp || index}-${index}`,
        action_type: entry.action_type || entry.actionType || entry.action || 'Updated',
        action_description:
          entry.action_description ||
          entry.actionDescription ||
          `${entry.action || entry.actionType || 'Updated'} by ${
            entry.userName || entry.user_name || 'User'
          }`,
        timestamp: entry.timestamp || entry.createdAt || new Date().toISOString(),
        user_name: entry.user_name || entry.userName || 'Unknown',
        user_role: entry.user_role || entry.userRole || entry.level || '-',
        comments:
          entry.comments ||
          entry.comment ||
          entry.rejectionComment ||
          entry.rejection_comment ||
          entry.remarks ||
          '',
        changes: Array.isArray(entry.changes) ? entry.changes : [],
      }));
      setInvoiceHistory(normalizedHistory);
    } catch (error) {
      console.error('Failed to fetch invoice history:', error);
      toast.error('Failed to load invoice history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEditInvoice = (invoice) => {
    const sourceOfSupply =
      invoice.source_of_supply ||
      invoice.place_of_supply ||
      '';
    const destinationOfSupply =
      invoice.destination_of_supply ||
      invoice.place_of_supply ||
      '';
    const locationValue =
      invoice.location ||
      invoice.place_of_supply ||
      '';

    setSelectedInvoice(invoice);
    setFormData({
      vendor_name: invoice.vendor_name || '',
      vendor_id: invoice.vendor_id || '',
      invoice_number: invoice.invoice_number,
      invoice_date: format(new Date(invoice.invoice_date), 'yyyy-MM-dd'),
      due_date: format(new Date(invoice.due_date), 'yyyy-MM-dd'),
      billing_address: invoice.billing_address || invoice.vendor_address || '',
      gst_treatment: invoice.gst_treatment || 'Regular',
      gstin: invoice.gstin || invoice.vendor_gstin || '',
      source_of_supply: sourceOfSupply,
      destination_of_supply: destinationOfSupply,
      location: locationValue,
      reverse_charges: invoice.reverse_charges || 'Not Applicable',
      discounts_level: invoice.discounts_level || 'At Line Item Level',
      file_category: invoice.file_category || 'Expense Invoice',
      source: invoice.source || 'Upload',
      source_email: invoice.source_email || '',
      line_items: invoice.line_items?.length > 0 ? invoice.line_items.map(item => ({
        description: item.description || '',
        ledger: item.ledger || 'Cloud Services',
        tax: item.tax || 'CGST + SGST 18%',
        quantity: item.quantity || 1,
        unit_rate: item.unit_price || item.amount || 0,
        discount: item.discount || 0,
        discount_type: item.discount_type || '%',
        hsn_sac: item.hsn_sac || '',
        eligible_for_itc: item.eligible_for_itc ?? true
      })) : [{
        description: '',
        ledger: 'Cloud Services',
        tax: 'CGST + SGST 18%',
        quantity: 1,
        unit_rate: invoice.amount || 0,
        discount: 0,
        discount_type: '%',
        hsn_sac: '',
        eligible_for_itc: true
      }],
      description: invoice.memo || '',
      tds: '',
      amount: invoice.amount,
      currency: invoice.currency || 'INR',
      department_id: invoice.department_id || invoice.departmentId || '',
      department_name: invoice.department_name || invoice.departmentName || '',
      ...(isCategoryFeatureEnabled
        ? {
            category: invoice.category || null,
            category_id: invoice.category_id || invoice.categoryId || invoice.category?.id || '',
            category_name: invoice.category_name || invoice.categoryName || invoice.category?.name || '',
          }
        : {})
    });
    setEditDialogOpen(true);
  };

  const handleUpdateInvoice = async () => {
    if (!guardAction('invoices.update')) return;
    if (!selectedInvoice || !formData) return;

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
          })),
          memo: formData.description,
          file_category: formData.file_category,
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
      toast.error('Failed to update invoice');
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

  const canEdit = (status) =>
    canUpdateInvoices && status === 'Rejected';
  const canDelete = (status) =>
    canDeleteInvoices && ['Pending Checker', 'Pending Approver', 'Pending Approval'].includes(status);

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'Draft': 'bg-gray-100 text-gray-800 border-gray-200',
      'Pending Checker': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Pending Approver': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Pending Approval': 'bg-[#FFF7CC] text-[#7A4A00] border-[#F2D675] rounded-full',
      'Pending Payment': 'bg-blue-100 text-blue-800 border-blue-200',
      'Amount Released': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Rejected': 'bg-red-100 text-red-800 border-red-200'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDuration = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatBulkStatusLabel = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'success' || normalized === 'extracted') return 'Extracted';
    if (normalized === 'uploaded') return 'Uploaded';
    if (normalized === 'upload_failed') return 'Upload Failed';
    if (normalized === 'failed' || normalized === 'error') return 'Extraction Failed';
    return 'Unknown';
  };

  const getBulkStatusBadgeClass = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'uploaded') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (normalized === 'success' || normalized === 'extracted') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (normalized === 'upload_failed' || normalized === 'failed' || normalized === 'error') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getHistoryIcon = (actionType) => {
    switch (actionType) {
      case 'Created': return <Plus className="h-4 w-4 text-emerald-500" />;
      case 'Edited': return <Pencil className="h-4 w-4 text-blue-500" />;
      case 'Approved': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'Rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'Payment Released': return <CreditCard className="h-4 w-4 text-emerald-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getHistoryBadgeClass = (actionType) => {
    switch (actionType) {
      case 'Created': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Edited': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'Payment Released': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
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
      canSubmit={isEdit ? canUpdateInvoices : canManageInvoices}
      departments={departments}
      invoiceCategories={invoiceCategories}
      invoiceCategoriesLoading={invoiceCategoriesLoading || invoiceCategoriesFetching}
      showCategoryField={isCategoryFeatureEnabled}
      GST_TREATMENTS={GST_TREATMENTS}
      INDIAN_STATES={INDIAN_STATES}
      FILE_CATEGORIES={FILE_CATEGORIES}
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
      />

      <InvoiceTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        uploadedFile={uploadedFile}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filteredInvoices={filteredInvoices}
        getStatusBadgeClass={getStatusBadgeClass}
        handleViewInvoice={handleViewInvoice}
        canEdit={canEdit}
        handleEditInvoice={handleEditInvoice}
        canDelete={canDelete}
        handleDeleteInvoice={handleDeleteInvoice}
        setUploadedFile={setUploadedFile}
        setUploadedFileURL={setUploadedFileURL}
        setFormData={setFormData}
        renderPdfPreview={renderPdfPreview}
        uploadedFileURL={uploadedFileURL}
        pdfZoom={pdfZoom}
        uploadPreviewError={uploadPreviewError}
        setUploadPreviewError={setUploadPreviewError}
        scanning={scanning}
        canManageInvoices={canManageInvoices}
        renderInvoiceForm={renderInvoiceForm}
        handleAddInvoice={handleAddInvoice}
      />
      {/* Keeps upload extraction progress isolated from page orchestration code. */}
      <BulkExtractLoaderDialog
        open={bulkExtracting}
        totalFiles={bulkExtractTotalFiles}
        progress={bulkExtractProgress}
        elapsedSeconds={bulkExtractElapsedSeconds}
        formatDuration={formatDuration}
      />

      {/* Centralized review/selection dialog for bulk extracted invoices. */}
      <BulkPreviewDialog
        open={bulkPreviewOpen}
        bulkCreating={bulkCreating}
        bulkExtracting={bulkExtracting}
        bulkAddingVendorItemId={bulkAddingVendorItemId}
        bulkPreviewItems={bulkPreviewItems}
        bulkProgress={bulkProgress}
        bulkElapsedSeconds={bulkElapsedSeconds}
        formatDuration={formatDuration}
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
        showCategoryField={isCategoryFeatureEnabled}
      />

      {/* Dedicated editor dialog for per-item corrections before creation. */}
      <BulkEditDialog
        open={bulkEditOpen}
        setOpen={setBulkEditOpen}
        bulkCreating={bulkCreating}
        bulkEditForm={bulkEditForm}
        setBulkEditForm={setBulkEditForm}
        bulkEditItemId={bulkEditItemId}
        bulkPreviewItems={bulkPreviewItems}
        bulkEditFileURL={bulkEditFileURL}
        pdfZoom={pdfZoom}
        bulkEditPreviewError={bulkEditPreviewError}
        setBulkEditPreviewError={setBulkEditPreviewError}
        vendors={vendors}
        departments={departments}
        getDepartmentNameById={getDepartmentNameById}
        invoiceCategories={invoiceCategories}
        getCategoryNameById={getCategoryNameById}
        showCategoryField={isCategoryFeatureEnabled}
        taxRates={TAX_RATES}
        updateBulkEditLineItem={updateBulkEditLineItem}
        saveBulkEditChanges={saveBulkEditChanges}
        renderPdfPreview={renderPdfPreview}
      />
      {/* View Invoice Dialog - Split Screen */}
      <ViewDialog
        viewDialogOpen={viewDialogOpen}
        setViewDialogOpen={setViewDialogOpen}
        selectedInvoice={selectedInvoice}
        renderPdfPreview={renderPdfPreview}
        pdfZoom={pdfZoom}
        viewPreviewError={viewPreviewError}
        setViewPreviewError={setViewPreviewError}
        getStatusBadgeClass={getStatusBadgeClass}
        viewTab={viewTab}
        setViewTab={setViewTab}
        invoiceHistory={invoiceHistory}
        loadingHistory={loadingHistory}
        getHistoryIcon={getHistoryIcon}
        getHistoryBadgeClass={getHistoryBadgeClass}
        canEdit={canEdit}
        handleEditInvoice={handleEditInvoice}
      />

      <EditDialog
        editDialogOpen={editDialogOpen}
        setEditDialogOpen={setEditDialogOpen}
        selectedInvoice={selectedInvoice}
        formData={formData}
        handleUpdateInvoice={handleUpdateInvoice}
        renderPdfPreview={renderPdfPreview}
        pdfZoom={pdfZoom}
        viewPreviewError={viewPreviewError}
        setViewPreviewError={setViewPreviewError}
        renderInvoiceForm={renderInvoiceForm}
      />

      <RequestVendorDialog
        open={requestVendorOpen}
        onOpenChange={handleRequestVendorOpenChange}
        formData={requestVendorForm}
        setFormData={setRequestVendorForm}
        onSubmit={handleSubmitVendorRequest}
        submitting={requestVendorLoading}
      />

      <AlertDialog open={Boolean(invoiceDeleteTarget)} onOpenChange={(open) => !open && setInvoiceDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {invoiceDeleteTarget?.invoice_number}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteInvoice}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InvoicesPage;
