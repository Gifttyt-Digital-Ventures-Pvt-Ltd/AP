import React, { useEffect, useState, useRef } from 'react';
import {
  useGetInvoicesQuery,
  useGetVendorsQuery,
  useScanInvoiceMutation,
  useBulkUploadInvoicesMutation,
  useCreateVendorMutation,
  useCreateInvoiceMutation,
  useLazyGetInvoiceHistoryQuery,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
} from '../Services/apiSlice';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Search, Upload, Sparkles, Plus, FileText, Eye, Pencil, Trash2, Calendar, User, Building2, History, Clock, CheckCircle2, XCircle, CreditCard, ArrowRight, X, ZoomIn, ZoomOut, Maximize2, Mail, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useSidebar } from '../components/Layout';

const FILE_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? '';

// GST Treatment Options
const GST_TREATMENTS = [
  { value: 'Regular', label: 'Regular' },
  { value: 'Composition', label: 'Composition' },
  { value: 'Unregistered', label: 'Unregistered' },
  { value: 'Consumer', label: 'Consumer' },
  { value: 'Overseas', label: 'Overseas' },
  { value: 'SEZ', label: 'Special Economic Zone' }
];

// Indian States for Source/Destination of Supply
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh'
];

// Tax Rate Options
const TAX_RATES = [
  { value: 'CGST + SGST 5%', label: 'CGST + SGST 5%', cgst: 2.5, sgst: 2.5 },
  { value: 'CGST + SGST 12%', label: 'CGST + SGST 12%', cgst: 6, sgst: 6 },
  { value: 'CGST + SGST 18%', label: 'CGST + SGST 18%', cgst: 9, sgst: 9 },
  { value: 'CGST + SGST 28%', label: 'CGST + SGST 28%', cgst: 14, sgst: 14 },
  { value: 'IGST 5%', label: 'IGST 5%', igst: 5 },
  { value: 'IGST 12%', label: 'IGST 12%', igst: 12 },
  { value: 'IGST 18%', label: 'IGST 18%', igst: 18 },
  { value: 'IGST 28%', label: 'IGST 28%', igst: 28 },
  { value: 'Exempt', label: 'Exempt', cgst: 0, sgst: 0 }
];

// Ledger Options
const LEDGER_OPTIONS = [
  'Cloud Services', 'Software Subscription', 'Professional Services',
  'Office Supplies', 'Travel & Conveyance', 'Rent', 'Utilities',
  'Marketing & Advertising', 'Legal & Professional', 'Maintenance'
];

// File Category Options
const FILE_CATEGORIES = [
  { value: 'Expense Invoice', label: 'Expense Invoice' },
  { value: 'Purchase Invoice', label: 'Purchase Invoice' },
  { value: 'Revenue Invoice', label: 'Revenue Invoice' },
  { value: 'Credit Note', label: 'Credit Note' },
  { value: 'Debit Note', label: 'Debit Note' }
];

// Invoice Source Options
const INVOICE_SOURCES = [
  { value: 'Upload', label: 'Upload' },
  { value: 'Email', label: 'Email' }
];

export const Invoices = () => {
  const {
    data: invoicesData = [],
  } = useGetInvoicesQuery();
  const {
    data: vendorsData = [],
  } = useGetVendorsQuery();
  const [scanInvoice] = useScanInvoiceMutation();
  const [bulkUploadInvoices] = useBulkUploadInvoicesMutation();
  const [createVendor] = useCreateVendorMutation();
  const [createInvoice] = useCreateInvoiceMutation();
  const [getInvoiceHistory] = useLazyGetInvoiceHistoryQuery();
  const [updateInvoice] = useUpdateInvoiceMutation();
  const [deleteInvoice] = useDeleteInvoiceMutation();
  const invoices = Array.isArray(invoicesData) ? invoicesData : [];
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];
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
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditItemId, setBulkEditItemId] = useState('');
  const [bulkEditForm, setBulkEditForm] = useState(null);
  const [bulkEditPreviewError, setBulkEditPreviewError] = useState(false);
  const [bulkEditFileURL, setBulkEditFileURL] = useState(null);

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


  // Check if vendor exists in system
  const findVendorByName = (vendorName) => {
    if (!vendorName) return null;
    return vendors.find(v => 
      v.name.toLowerCase().trim() === vendorName.toLowerCase().trim()
    );
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

  const toCreateInvoicePayload = (invoiceData = {}) => ({
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
    source: 'Upload',
    source_email: null,
    file_category: 'Expense Invoice',
  });

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
      original_file_name: extractedData?.original_filename || null
    };
  };

  const handleSingleFileUpload = async (e) => {
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

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
          status: result.status,
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
    }
  };

  const handleCreateBulkInvoices = async () => {
    const selectedItems = bulkPreviewItems.filter((item) => item.selected && item.invoicePayload);
    if (selectedItems.length === 0) {
      toast.error('No extracted invoices selected for creation');
      return;
    }

    setBulkCreating(true);
    try {
      const outcomes = await Promise.allSettled(
        selectedItems.map((item) =>
          createInvoice(buildInvoiceMultipartPayload(item.invoicePayload, item.file)).unwrap()
        )
      );
      const createdCount = outcomes.filter((o) => o.status === 'fulfilled').length;
      const failedCount = outcomes.length - createdCount;

      toast.success(
        `Created ${createdCount} invoice${createdCount === 1 ? '' : 's'}${failedCount ? `, ${failedCount} failed` : ''}.`,
        { duration: 5000 }
      );

      if (failedCount > 0) {
        outcomes.forEach((outcome, index) => {
          if (outcome.status === 'rejected') {
            const item = selectedItems[index];
            toast.error(`Failed: ${item.filename}`);
          }
        });
      }

      setBulkPreviewOpen(false);
      setBulkPreviewItems([]);
      setActiveTab('list');
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
    if (!formData || !formData.vendor_name) {
      toast.error('Vendor name is required');
      return;
    }

    try {
      const vendorData = {
        name: formData.vendor_name,
        vendor_type: 'Company',
        gstin: formData.gstin || formData.vendor_gstin || '',
        address_line1: formData.billing_address || formData.vendor_address || '',
        pan: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        category: 'Supplier',
        email: null,
        phone: ''
      };

      const response = await createVendor(vendorData).unwrap();
      
      // Update vendors list
      
      // Update form with new vendor ID
      setFormData(prev => ({
        ...prev,
        vendor_id: response.id,
        vendor_matched: true
      }));
      
      toast.success(`Vendor "${formData.vendor_name}" added successfully!`);
    } catch (error) {
      console.error('Add vendor error:', error);
      let errorMessage = 'Failed to add vendor';
      if (error?.data?.detail) {
        const detail = error.data.detail;
        // Handle Pydantic validation errors (array of objects)
        if (Array.isArray(detail)) {
          errorMessage = detail.map(d => d.msg || JSON.stringify(d)).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        } else {
          errorMessage = JSON.stringify(detail);
        }
      }
      toast.error(errorMessage);
    }
  };

  const handleAddInvoice = async () => {
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
      file_category: formData.file_category || 'Expense Invoice'
    };
    if (!invoicePayload.vendor_id) {
      toast.error('Please select or add a vendor before creating invoice');
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
      currency: invoice.currency || 'INR'
    });
    setEditDialogOpen(true);
  };

  const handleUpdateInvoice = async () => {
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
          source_email: formData.source === 'Email' ? formData.source_email : null
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
    if (!window.confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}?`)) {
      return;
    }

    try {
      await deleteInvoice(invoice.id).unwrap();
      toast.success('Invoice deleted successfully');
    } catch (error) {
      toast.error('Failed to delete invoice');
    }
  };

  const canEdit = (status) => ['Pending Checker', 'Pending Approver'].includes(status);
  const canDelete = (status) => ['Pending Checker', 'Pending Approver'].includes(status);

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'Draft': 'bg-gray-100 text-gray-800 border-gray-200',
      'Pending Checker': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Pending Approver': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Pending Payment': 'bg-blue-100 text-blue-800 border-blue-200',
      'Amount Released': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Rejected': 'bg-red-100 text-red-800 border-red-200'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
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

  // Check if file is PDF based on filename
  const isPdfFile = (filename) => {
    return filename?.toLowerCase().endsWith('.pdf');
  };

  // Check if file is an image
  const isImageFile = (filename) => {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    return imageExtensions.some(ext => filename?.toLowerCase().endsWith(ext));
  };

  // PDF preview renderer (avoid inline component remounts that can cause flicker)
  const renderPdfPreview = ({
    fileURL,
    file,
    zoom = 100,
    invoice = null,
    imageError = false,
    setImageError = () => {},
  } = {}) => {
    // Determine the actual URL to use
    const displayUrl = fileURL || getInvoiceFileUrl(invoice);
    const fileName = file?.name || invoice?.original_file_name || 'Invoice.pdf';
    const isPdf = file?.type?.includes('pdf') || isPdfFile(fileName);
    const isImage = file?.type?.includes('image') || isImageFile(fileName);
    const hasFile = Boolean(displayUrl);

    return (
      <div className="bg-gray-100 rounded-lg overflow-hidden h-full flex flex-col">
        {/* PDF Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
          <span className="text-sm font-medium text-gray-600 truncate max-w-[200px]">{fileName}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPdfZoom(z => Math.max(50, z - 10))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-500">{zoom}%</span>
            <Button variant="ghost" size="sm" onClick={() => setPdfZoom(z => Math.min(200, z + 10))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            {hasFile && (
              <Button variant="ghost" size="sm" onClick={() => window.open(displayUrl, '_blank')} title="Open in new tab">
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {/* File Content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-200">
          {hasFile && !imageError ? (
            isPdf ? (
              <iframe
                src={displayUrl}
                className="bg-white shadow-lg w-full h-full"
                style={{ minHeight: '600px' }}
                title="Invoice PDF"
              />
            ) : (
              <img
                src={displayUrl}
                alt="Invoice"
                className="bg-white shadow-lg max-w-full max-h-full object-contain"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
                onError={() => setImageError(true)}
              />
            )
          ) : (
            <div className="text-center text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No preview available</p>
              <p className="text-xs mt-2 text-gray-400">
                {imageError ? 'Failed to load file' : 'Original file not stored'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Invoice form renderer (avoid inline component remounts that can steal input focus)
  const renderInvoiceForm = ({ isEdit = false, hideActions = false } = {}) => {
    if (!formData) return null;
    const totals = calculateTotals(formData.line_items);

    return (
      <div className="space-y-4">
        {/* Vendor Not Registered Alert - Compact */}
        {!isEdit && formData.vendor_name && !formData.vendor_matched && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 text-xs">Vendor not registered</p>
                <p className="text-[11px] text-amber-600">"{formData.vendor_name}" is not in the system</p>
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
              data-testid="add-vendor-from-invoice-btn"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Vendor
            </Button>
          </div>
        )}

        {/* Vendor Matched Success - Compact */}
        {!isEdit && formData.vendor_name && formData.vendor_matched && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <p className="text-xs text-emerald-700">
              <span className="font-medium">Vendor matched:</span> "{formData.vendor_name}"
            </p>
          </div>
        )}

        {/* Vendor Details Section - Compact */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Vendor Details</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-blue-400">* Vendor Name</Label>
              <div className="relative">
                <Input
                  value={formData.vendor_name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const matched = findVendorByName(newName);
                    setFormData({ 
                      ...formData, 
                      vendor_name: newName,
                      vendor_id: matched?.id || '',
                      vendor_matched: !!matched
                    });
                  }}
                  placeholder="Select or enter vendor"
                  className="pr-12 h-8 text-sm"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {formData.vendor_name && (
                    <button onClick={() => setFormData({ ...formData, vendor_name: '', vendor_id: '', vendor_matched: false })} className="text-gray-400 hover:text-gray-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <Label className="text-xs text-blue-400">* Bill Number</Label>
              <Input
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                placeholder="Invoice number"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-blue-400">* Billing Date</Label>
              <Input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-blue-400">* Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Billing Address</Label>
            <textarea
              value={formData.billing_address}
              onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
              placeholder="Enter billing address"
              className="w-full min-h-[50px] rounded-md border border-input bg-background px-2 py-1.5 text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-blue-400">* GST Treatment</Label>
              <select
                value={formData.gst_treatment}
                onChange={(e) => setFormData({ ...formData, gst_treatment: e.target.value })}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
              >
                {GST_TREATMENTS.map(gst => (
                  <option key={gst.value} value={gst.value}>{gst.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-blue-400">* GSTIN</Label>
              <Input
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="Enter GSTIN"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-blue-400">* Source of Supply</Label>
              <select
                value={formData.source_of_supply}
                onChange={(e) => setFormData({ ...formData, source_of_supply: e.target.value })}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                {INDIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-blue-400">* Destination</Label>
              <select
                value={formData.destination_of_supply}
                onChange={(e) => setFormData({ ...formData, destination_of_supply: e.target.value })}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                {INDIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-blue-400">* Location</Label>
              <select
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="Karnataka Registration">Karnataka</option>
                <option value="Maharashtra Registration">Maharashtra</option>
                <option value="Tamil Nadu Registration">Tamil Nadu</option>
              </select>
            </div>
          </div>

          {/* File Category and Source - Compact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-blue-400">* File Category</Label>
              <select
                value={formData.file_category}
                onChange={(e) => setFormData({ ...formData, file_category: e.target.value })}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                data-testid="file-category-select"
              >
                {FILE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label className="text-xs text-blue-400">* Source</Label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                data-testid="source-select"
              >
                {INVOICE_SOURCES.map(src => (
                  <option key={src.value} value={src.value}>{src.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Source Email - only show when source is Email */}
          {formData.source === 'Email' && (
            <div>
              <Label className="text-xs text-blue-400">Source Email</Label>
              <Input
                type="email"
                value={formData.source_email}
                onChange={(e) => setFormData({ ...formData, source_email: e.target.value })}
                placeholder="vendor@example.com"
                className="w-full h-8 text-sm"
                data-testid="source-email-input"
              />
            </div>
          )}

          <div className="flex gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600">Reverse Charges:</span>
              <select
                value={formData.reverse_charges}
                onChange={(e) => setFormData({ ...formData, reverse_charges: e.target.value })}
                className="text-blue-600 bg-transparent border-none cursor-pointer text-xs"
              >
                <option value="Not Applicable">Not Applicable</option>
                <option value="Applicable">Applicable</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600">Discounts:</span>
              <select
                value={formData.discounts_level}
                onChange={(e) => setFormData({ ...formData, discounts_level: e.target.value })}
                className="text-blue-600 bg-transparent border-none cursor-pointer text-xs"
              >
                <option value="At Line Item Level">At Line Item Level</option>
                <option value="At Invoice Level">At Invoice Level</option>
              </select>
            </div>
          </div>
        </div>

        {/* Line Items Section - Compact Table Design */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Line Items</h3>
          
          <div className="border rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 border-b">
              <div className="grid grid-cols-[1fr_120px_100px_60px_80px_70px_90px_30px] gap-1 px-2 py-2 text-xs font-medium text-gray-600">
                <span>Item Description</span>
                <span className="text-blue-500">*Ledger</span>
                <span className="text-blue-500">*Tax</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Rate</span>
                <span className="text-right">Disc</span>
                <span className="text-right">Subtotal</span>
                <span></span>
              </div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y">
              {formData.line_items.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_120px_100px_60px_80px_70px_90px_30px] gap-1 px-2 py-1.5 items-center text-xs">
                  {/* Description */}
                  <div>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="h-7 text-xs"
                    />
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-gray-400">HSN:</span>
                      <Input
                        value={item.hsn_sac}
                        onChange={(e) => updateLineItem(index, 'hsn_sac', e.target.value)}
                        placeholder="Code"
                        className="h-5 text-[10px] w-16 px-1"
                      />
                      <label className="flex items-center gap-0.5 text-[10px] text-gray-500 ml-1">
                        <input
                          type="checkbox"
                          checked={item.eligible_for_itc}
                          onChange={(e) => updateLineItem(index, 'eligible_for_itc', e.target.checked)}
                          className="h-2.5 w-2.5"
                        />
                        ITC
                      </label>
                    </div>
                  </div>
                  
                  {/* Ledger */}
                  <select
                    value={item.ledger}
                    onChange={(e) => updateLineItem(index, 'ledger', e.target.value)}
                    className="h-7 w-full rounded border px-1 text-xs bg-white"
                  >
                    {LEDGER_OPTIONS.map(ledger => (
                      <option key={ledger} value={ledger}>{ledger}</option>
                    ))}
                  </select>
                  
                  {/* Tax */}
                  <select
                    value={item.tax}
                    onChange={(e) => updateLineItem(index, 'tax', e.target.value)}
                    className="h-7 w-full rounded border px-1 text-xs bg-white"
                  >
                    {TAX_RATES.map(tax => (
                      <option key={tax.value} value={tax.value}>{tax.label}</option>
                    ))}
                  </select>
                  
                  {/* Quantity */}
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs text-right px-1"
                    min="0"
                  />
                  
                  {/* Rate */}
                  <Input
                    type="number"
                    value={item.unit_rate}
                    onChange={(e) => updateLineItem(index, 'unit_rate', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs text-right px-1"
                    min="0"
                  />
                  
                  {/* Discount */}
                  <div className="flex items-center gap-0.5">
                    <Input
                      type="number"
                      value={item.discount}
                      onChange={(e) => updateLineItem(index, 'discount', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs text-right w-10 px-1"
                      min="0"
                    />
                    <select
                      value={item.discount_type}
                      onChange={(e) => updateLineItem(index, 'discount_type', e.target.value)}
                      className="h-7 w-8 rounded border text-xs bg-white px-0"
                    >
                      <option value="%">%</option>
                      <option value="₹">₹</option>
                    </select>
                  </div>
                  
                  {/* Subtotal */}
                  <div className="text-right font-medium text-xs">
                    ₹{calculateLineItemSubtotal(item).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  
                  {/* Delete */}
                  <div className="text-center">
                    {formData.line_items.length > 1 && (
                      <button onClick={() => removeLineItem(index)} className="text-red-500 hover:text-red-700 p-0.5">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar indicator */}
          <div className="h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-yellow-400 rounded" />

          <Button variant="outline" onClick={addLineItem} className="text-blue-600 h-7 text-xs" size="sm">
            <Plus className="h-3 w-3 mr-1" />
            Add Line Item
          </Button>
        </div>

        {/* Description - Compact */}
        <div>
          <Label className="text-xs">Description</Label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter Description (Optional)"
            className="w-full min-h-[50px] rounded-md border border-input bg-background px-2 py-1.5 text-xs resize-none"
          />
        </div>

        {/* Summary Section - Compact */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>Sub Total</span>
            <span className="font-medium">₹{totals.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          {totals.cgst > 0 && (
            <div className="flex justify-between text-xs">
              <span>CGST 9%</span>
              <span>₹{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {totals.sgst > 0 && (
            <div className="flex justify-between text-xs">
              <span>SGST 9%</span>
              <span>₹{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {totals.igst > 0 && (
            <div className="flex justify-between text-xs">
              <span>IGST</span>
              <span>₹{totals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1.5 border-t text-xs">
            <div className="flex items-center gap-1.5">
              <span>TDS</span>
              <select
                value={formData.tds}
                onChange={(e) => setFormData({ ...formData, tds: e.target.value })}
                className="h-6 rounded border px-1 text-xs"
              >
                <option value="">TDS</option>
                <option value="1%">1%</option>
                <option value="2%">2%</option>
                <option value="10%">10%</option>
              </select>
            </div>
            <span>₹0.00</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-1.5 border-t">
            <span>Total</span>
            <span>₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Action Buttons - Only show if not hidden */}
        {!hideActions && (
          <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
            <Button
              variant="outline"
              onClick={() => {
                if (isEdit) {
                  setEditDialogOpen(false);
                } else {
                  setUploadedFile(null);
                  setUploadedFileURL(null);
                  setFormData(null);
                  setActiveTab('list');
                }
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={isEdit ? handleUpdateInvoice : handleAddInvoice}
              className="flex-1"
            >
              {isEdit ? 'Update Invoice' : 'Add Invoice'}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div data-testid="invoices-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2" data-testid="invoices-title">
            Invoices
          </h1>
          <p className="text-muted-foreground">Upload and manage all invoices</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={openBulkFilePicker}
            data-testid="bulk-upload-button"
            disabled={scanning}
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <input ref={bulkFileInputRef} type="file" accept="image/*,.pdf" multiple onChange={handleBulkFileUpload} className="hidden" />
          <Button onClick={openSingleFilePicker} data-testid="upload-invoice-button" disabled={scanning}>
            {scanning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Extracting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Upload Invoice
              </>
            )}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleSingleFileUpload} className="hidden" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="list" data-testid="tab-list">
            <FileText className="h-4 w-4 mr-2" />
            Invoice List
          </TabsTrigger>
          {uploadedFile && (
            <TabsTrigger value="upload" data-testid="tab-upload">
              <Sparkles className="h-4 w-4 mr-2" />
              Upload & Scan
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" data-testid="invoice-search-input" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg shadow-sm overflow-x-auto">
            <table className="w-full min-w-[1400px]" data-testid="invoices-table">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="p-3 text-left text-xs font-medium">Sr. No</th>
                  <th className="p-3 text-left text-xs font-medium">Source</th>
                  <th className="p-3 text-left text-xs font-medium">Branch Name</th>
                  <th className="p-3 text-left text-xs font-medium">Invoice #</th>
                  <th className="p-3 text-left text-xs font-medium">Vendor</th>
                  <th className="p-3 text-left text-xs font-medium">Current File Name</th>
                  <th className="p-3 text-left text-xs font-medium">Original File Name</th>
                  <th className="p-3 text-left text-xs font-medium">Work Item ID</th>
                  <th className="p-3 text-left text-xs font-medium">File Category</th>
                  <th className="p-3 text-right text-xs font-medium">Amount</th>
                  <th className="p-3 text-left text-xs font-medium">Invoice Date</th>
                  <th className="p-3 text-left text-xs font-medium">Status</th>
                  <th className="p-3 text-left text-xs font-medium">Created At</th>
                  <th className="p-3 text-right text-xs font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice, index) => (
                  <tr key={invoice.id} className="border-b border-border hover:bg-muted/50 transition-colors" data-testid={`invoice-row-${invoice.id}`}>
                    <td className="p-3 text-sm font-medium">{index + 1}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${invoice.source === 'Email' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                        {invoice.source === 'Email' && <Mail className="h-3 w-3" />}
                        {invoice.source || 'Upload'}
                      </span>
                    </td>
                    <td className="p-3 text-sm">{invoice.branch_name || '-'}</td>
                    <td className="p-3 font-['JetBrains_Mono'] text-sm font-medium">{invoice.invoice_number}</td>
                    <td className="p-3 text-sm">{invoice.vendor_name}</td>
                    <td className="p-3 text-xs font-['JetBrains_Mono'] text-muted-foreground">{invoice.current_file_name || '-'}</td>
                    <td className="p-3 text-xs font-['JetBrains_Mono'] text-muted-foreground">{invoice.original_file_name || '-'}</td>
                    <td className="p-3 text-xs font-['JetBrains_Mono']">{invoice.work_item_id || '-'}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                        {invoice.file_category || 'Expense Invoice'}
                      </span>
                    </td>
                    <td className="p-3 font-['JetBrains_Mono'] text-sm font-semibold text-right">₹{invoice.amount.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(invoice.invoice_date), 'dd MMM yy')}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusBadgeClass(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(invoice.created_at), 'dd MMM yy, hh:mm a')}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice)} data-testid={`view-invoice-${invoice.id}`} title="View Invoice" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEdit(invoice.status) && (
                          <Button variant="ghost" size="sm" onClick={() => handleEditInvoice(invoice)} data-testid={`edit-invoice-${invoice.id}`} title="Edit Invoice" className="h-8 w-8 p-0">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete(invoice.status) && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteInvoice(invoice)} data-testid={`delete-invoice-${invoice.id}`} title="Delete Invoice" className="h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredInvoices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground" data-testid="no-invoices">
                No invoices found. Upload your first invoice to get started!
              </div>
            )}
          </div>
        </TabsContent>

        {/* Upload & Scan Tab - Split Screen (Sidebar hidden) */}
        <TabsContent value="upload">
          {uploadedFile && (
            <div className="h-[calc(100vh-130px)]">
              {/* Back button */}
              <div className="mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUploadedFile(null);
                    setUploadedFileURL(null);
                    setFormData(null);
                    setActiveTab('list');
                  }}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back to Invoices
                </Button>
              </div>
              
              <div className="relative grid grid-cols-1 lg:grid-cols-[35%_65%] gap-3 h-[calc(100%-40px)]">
                {/* Left: PDF Preview (35% width) */}
                {renderPdfPreview({
                  fileURL: uploadedFileURL,
                  file: uploadedFile,
                  zoom: pdfZoom,
                  imageError: uploadPreviewError,
                  setImageError: setUploadPreviewError,
                })}

              {/* Right: Form (65% width) */}
              <div className="bg-white rounded-lg border shadow-sm p-4 flex flex-col overflow-hidden">
                {scanning ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                    <p className="text-muted-foreground">Scanning invoice with AI...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto pr-2">
                      {renderInvoiceForm({ isEdit: false, hideActions: true })}
                    </div>
                    {/* Fixed Action Buttons at Bottom */}
                    <div className="flex gap-3 pt-4 mt-4 border-t bg-white">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setUploadedFile(null);
                          setUploadedFileURL(null);
                          setFormData(null);
                          setActiveTab('list');
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddInvoice}
                        className="flex-1"
                        data-testid="add-invoice-btn"
                      >
                        Add Invoice
                      </Button>
                    </div>
                  </>
                )}
              </div>
              {scanning && (
                <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                  <p className="text-sm font-medium text-primary">Extracting bill details...</p>
                  <p className="text-xs text-muted-foreground mt-1">Please wait while AI reads your invoice</p>
                </div>
              )}
            </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={bulkPreviewOpen} onOpenChange={(open) => !bulkCreating && setBulkPreviewOpen(open)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="bulk-preview-dialog">
          <DialogHeader>
            <DialogTitle>Review Bulk Invoices</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                {bulkPreviewItems.filter((i) => i.invoicePayload).length} extracted successfully out of {bulkPreviewItems.length}
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    bulkPreviewItems.filter((i) => i.invoicePayload).length > 0 &&
                    bulkPreviewItems
                      .filter((i) => i.invoicePayload)
                      .every((i) => i.selected)
                  }
                  onChange={(e) =>
                    setBulkPreviewItems((prev) =>
                      prev.map((item) =>
                        item.invoicePayload ? { ...item, selected: e.target.checked } : item
                      )
                    )
                  }
                />
                <span>Select all extracted</span>
              </label>
            </div>

            <div className="border rounded-lg overflow-hidden min-h-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-3 text-left w-12">Pick</th>
                    <th className="p-3 text-left">File</th>
                    <th className="p-3 text-left">Vendor</th>
                    <th className="p-3 text-left">Invoice #</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
              </table>
              <div className="max-h-[52vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {bulkPreviewItems.map((item) => (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="p-3 w-12">
                          <input
                            type="checkbox"
                            disabled={!item.invoicePayload}
                            checked={Boolean(item.selected && item.invoicePayload)}
                            onChange={(e) =>
                              setBulkPreviewItems((prev) =>
                                prev.map((row) =>
                                  row.id === item.id ? { ...row, selected: e.target.checked } : row
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-3">{item.filename}</td>
                        <td className="p-3">{item.invoicePayload?.vendor_name || '-'}</td>
                        <td className="p-3 font-['JetBrains_Mono']">{item.invoicePayload?.invoice_number || '-'}</td>
                        <td className="p-3 text-right font-['JetBrains_Mono']">
                          {item.invoicePayload ? `₹${Number(item.invoicePayload.amount || 0).toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-3">
                          {item.invoicePayload ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Extracted
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              {item.error || 'Extraction failed'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openBulkEditDialog(item)}
                              disabled={!item.invoicePayload}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                setBulkPreviewItems((prev) => prev.filter((row) => row.id !== item.id))
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setBulkPreviewOpen(false)}
                className="flex-1"
                disabled={bulkCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateBulkInvoices}
                className="flex-1"
                disabled={
                  bulkCreating ||
                  bulkPreviewItems.filter((i) => i.selected && i.invoicePayload).length === 0
                }
                data-testid="bulk-create-confirm-btn"
              >
                {bulkCreating ? 'Creating...' : `Create Selected (${bulkPreviewItems.filter((i) => i.selected && i.invoicePayload).length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkEditOpen} onOpenChange={(open) => !bulkCreating && setBulkEditOpen(open)}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto" data-testid="bulk-edit-dialog">
          <DialogHeader>
            <DialogTitle>Edit Extracted Invoice</DialogTitle>
          </DialogHeader>
          {bulkEditForm && (
            <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-4 lg:max-h-[78vh] min-h-0">
              <div className="border rounded-lg overflow-hidden h-full min-h-[500px]">
                {renderPdfPreview({
                  fileURL: bulkEditFileURL,
                  file: bulkPreviewItems.find((item) => item.id === bulkEditItemId)?.file || null,
                  zoom: pdfZoom,
                  imageError: bulkEditPreviewError,
                  setImageError: setBulkEditPreviewError,
                })}
              </div>
              <div className="space-y-4 overflow-y-auto pr-2 min-h-0">
              <datalist id="bulk-vendor-options">
                {vendors.map((v) => (
                  <option key={v.id} value={v.name} />
                ))}
              </datalist>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Vendor Name</Label>
                  <Input
                    list="bulk-vendor-options"
                    value={bulkEditForm.vendor_name}
                    onChange={(e) => setBulkEditForm((prev) => ({ ...prev, vendor_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Invoice Number</Label>
                  <Input
                    value={bulkEditForm.invoice_number}
                    onChange={(e) => setBulkEditForm((prev) => ({ ...prev, invoice_number: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Invoice Date</Label>
                  <Input
                    type="date"
                    value={bulkEditForm.invoice_date}
                    onChange={(e) => setBulkEditForm((prev) => ({ ...prev, invoice_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Due Date</Label>
                  <Input
                    type="date"
                    value={bulkEditForm.due_date}
                    onChange={(e) => setBulkEditForm((prev) => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    value={bulkEditForm.amount}
                    onChange={(e) => setBulkEditForm((prev) => ({ ...prev, amount: Number(e.target.value || 0) }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Input
                    value={bulkEditForm.currency}
                    onChange={(e) => setBulkEditForm((prev) => ({ ...prev, currency: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Billing Address</Label>
                <textarea
                  value={bulkEditForm.billing_address}
                  onChange={(e) => setBulkEditForm((prev) => ({ ...prev, billing_address: e.target.value }))}
                  className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-left w-28">HSN/SAC</th>
                      <th className="p-2 text-left w-40">Tax</th>
                      <th className="p-2 text-right w-24">Qty</th>
                      <th className="p-2 text-right w-28">Unit Price</th>
                      <th className="p-2 text-right w-28">Amount</th>
                      <th className="p-2 text-right w-14"></th>
                    </tr>
                  </thead>
                </table>
                <div className="max-h-[30vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {bulkEditForm.line_items.map((line, index) => (
                        <tr key={index} className="border-b last:border-b-0">
                          <td className="p-2">
                            <Input
                              value={line.description}
                              onChange={(e) => updateBulkEditLineItem(index, 'description', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={line.hsn_sac}
                              onChange={(e) => updateBulkEditLineItem(index, 'hsn_sac', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={line.tax || 'CGST + SGST 18%'}
                              onChange={(e) => updateBulkEditLineItem(index, 'tax', e.target.value)}
                              className="h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                            >
                              {TAX_RATES.map((tax) => (
                                <option key={tax.value} value={tax.value}>
                                  {tax.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={line.quantity}
                              onChange={(e) => updateBulkEditLineItem(index, 'quantity', Number(e.target.value || 0))}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={line.unit_price}
                              onChange={(e) => updateBulkEditLineItem(index, 'unit_price', Number(e.target.value || 0))}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={line.amount}
                              onChange={(e) => updateBulkEditLineItem(index, 'amount', Number(e.target.value || 0))}
                            />
                          </td>
                          <td className="p-2 text-right">
                            {bulkEditForm.line_items.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setBulkEditForm((prev) => ({
                                    ...prev,
                                    line_items: prev.line_items.filter((_, i) => i !== index),
                                  }))
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    setBulkEditForm((prev) => ({
                      ...prev,
                      line_items: [
                        ...prev.line_items,
                        {
                          description: '',
                          quantity: 1,
                          unit_price: 0,
                          amount: 0,
                          hsn_sac: '',
                          tax: 'CGST + SGST 18%',
                        },
                      ],
                    }))
                  }
                >
                  Add Line
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setBulkEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveBulkEditChanges}>Save Changes</Button>
                </div>
              </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog - Split Screen */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0" data-testid="view-invoice-dialog">
          {selectedInvoice && (
            <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] h-[85vh]">
              {/* Left: PDF/Image Preview (35% width) */}
              <div className="border-r h-full">
                {renderPdfPreview({
                  invoice: selectedInvoice,
                  zoom: pdfZoom,
                  imageError: viewPreviewError,
                  setImageError: setViewPreviewError,
                })}
              </div>

              {/* Right: Invoice Details (65% width) */}
              <div className="p-6 overflow-y-auto">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-bold flex items-center justify-between">
                    <span>Invoice {selectedInvoice.invoice_number}</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeClass(selectedInvoice.status)}`}>
                      {selectedInvoice.status}
                    </span>
                  </DialogTitle>
                </DialogHeader>

                <Tabs value={viewTab} onValueChange={setViewTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="details"><FileText className="h-4 w-4 mr-2" />Details</TabsTrigger>
                    <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />History ({invoiceHistory.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-6">
                    {/* Vendor Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Vendor Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Vendor Name</Label>
                          <p className="font-medium">{selectedInvoice.vendor_name}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Bill Number</Label>
                          <p className="font-['JetBrains_Mono'] font-medium">{selectedInvoice.invoice_number}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Billing Date</Label>
                          <p className="font-medium">{format(new Date(selectedInvoice.invoice_date), 'MMMM do, yyyy')}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Due Date</Label>
                          <p className="font-medium">{format(new Date(selectedInvoice.due_date), 'MMMM do, yyyy')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="p-4 bg-primary/5 rounded-lg border">
                      <Label className="text-xs text-muted-foreground">Total Amount</Label>
                      <p className="text-3xl font-bold font-['JetBrains_Mono'] text-primary">₹{selectedInvoice.amount.toLocaleString('en-IN')}</p>
                    </div>

                    {/* Line Items */}
                    {selectedInvoice.line_items && selectedInvoice.line_items.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Line Items</h3>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted/50 border-b">
                              <tr>
                                <th className="p-3 text-left text-xs font-medium">Description</th>
                                <th className="p-3 text-right text-xs font-medium">Qty</th>
                                <th className="p-3 text-right text-xs font-medium">Unit Price</th>
                                <th className="p-3 text-right text-xs font-medium">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedInvoice.line_items.map((item, index) => (
                                <tr key={index} className="border-b last:border-0">
                                  <td className="p-3 text-sm">{item.description}</td>
                                  <td className="p-3 text-sm text-right font-['JetBrains_Mono']">{item.quantity || '-'}</td>
                                  <td className="p-3 text-sm text-right font-['JetBrains_Mono']">{item.unit_price ? `₹${item.unit_price.toLocaleString('en-IN')}` : '-'}</td>
                                  <td className="p-3 text-sm text-right font-['JetBrains_Mono'] font-semibold">₹{item.amount.toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Created By */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Created by {selectedInvoice.created_by_name} on {format(new Date(selectedInvoice.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4">
                    {loadingHistory ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : invoiceHistory.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No history records found</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />
                        <div className="space-y-4">
                          {invoiceHistory.map((entry, index) => (
                            <div key={entry.id} className="relative flex gap-4">
                              <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 border-background shadow-sm ${entry.action_type === 'Created' || entry.action_type === 'Approved' || entry.action_type === 'Payment Released' ? 'bg-emerald-100' : entry.action_type === 'Rejected' ? 'bg-red-100' : entry.action_type === 'Edited' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                {getHistoryIcon(entry.action_type)}
                              </div>
                              <div className="flex-1 pb-4">
                                <div className="bg-card border rounded-lg p-4 shadow-sm">
                                  <div className="flex items-start justify-between mb-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getHistoryBadgeClass(entry.action_type)}`}>{entry.action_type}</span>
                                    <div className="text-right text-xs text-muted-foreground">
                                      <p>{format(new Date(entry.timestamp), 'dd MMM yyyy')}</p>
                                      <p>{format(new Date(entry.timestamp), 'hh:mm a')}</p>
                                    </div>
                                  </div>
                                  <p className="text-sm mb-3">{entry.action_description}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    <span className="font-medium">{entry.user_name}</span>
                                    <span>|</span>
                                    <span className="bg-muted px-2 py-0.5 rounded">{entry.user_role}</span>
                                  </div>
                                  {entry.changes && entry.changes.length > 0 && (
                                    <div className="mt-3 pt-3 border-t">
                                      <p className="text-xs font-medium text-muted-foreground mb-2">Changes:</p>
                                      {entry.changes.map((change, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                          <span className="font-medium capitalize">{change.field_name.replace(/_/g, ' ')}:</span>
                                          <span className="text-red-500 line-through">{change.old_value || 'empty'}</span>
                                          <ArrowRight className="h-3 w-3" />
                                          <span className="text-emerald-600">{change.new_value || 'empty'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="flex gap-3 pt-4 mt-4 border-t">
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)} className="flex-1">Close</Button>
                  {canEdit(selectedInvoice.status) && (
                    <Button onClick={() => { setViewDialogOpen(false); handleEditInvoice(selectedInvoice); }} className="flex-1">
                      <Pencil className="h-4 w-4 mr-2" />Edit Invoice
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog - Full Screen (Sidebar hidden) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0" data-testid="edit-invoice-dialog">
          <DialogHeader className="sr-only">
            <DialogTitle>
              Edit Invoice {selectedInvoice?.invoice_number || ''}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && formData && (
            <div className="h-[90vh]">
              {/* Header with Back */}
              <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditDialogOpen(false)}
                    className="text-gray-600 hover:text-gray-800 p-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-semibold text-sm">Edit Invoice - {selectedInvoice.invoice_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleUpdateInvoice}>
                    Update Invoice
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] h-[calc(100%-50px)]">
                {/* Left: PDF Preview (35% width) */}
                <div className="border-r h-full">
                  {renderPdfPreview({
                    invoice: selectedInvoice,
                    zoom: pdfZoom,
                    imageError: viewPreviewError,
                    setImageError: setViewPreviewError,
                  })}
                </div>

                {/* Right: Edit Form (65% width) */}
                <div className="p-4 overflow-y-auto">
                  {renderInvoiceForm({ isEdit: true })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

