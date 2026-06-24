import React, { useEffect, useMemo, useState } from 'react';
import {
  useGetVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useApproveVendorMutation,
} from '../../Services/apis/invoicesVendorsApi';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  Map as MapIcon,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useActionGuard } from '../../hooks/useActionGuard';
import { useCreditErrorHandler } from '../../contexts/CreditErrorContext';
import { useRBAC } from '../../contexts/RBACContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGetCorporateUserDetailsQuery } from '../../Services/apis/corporateApi';
import {
  buildCurrentUserIdentity,
  canEditVendor,
  canSaveVendorEdit,
  extractApiErrorDetail,
  formatWorkflowStatus,
  isSavedVendorStatus,
  NEEDS_CORRECTION_ACTION,
  NEEDS_CORRECTION_STATUS,
  resolveBulkCreateVendorStatus,
  resolveSavedVendorSubmitStatus,
} from '../../utils/approvalWorkflow';
import VendorDetailsDialog from '../../components/vendors/VendorDetailsDialog';
import * as XLSX from '@e965/xlsx';
import AppDataTable from '../../components/common/AppDataTable';
import RefreshButton from '../../components/common/RefreshButton';
import { TableCell, TableRow } from '../../components/ui/table';
import MultipleVendorUploadDialog from './components/MultipleVendorUploadDialog';
import {
  getVendorUploadMandatoryFieldKeys,
  isVendorFieldRequired,
  VENDOR_FIELD_SECTIONS,
  VENDOR_FORM_KEY_TO_SECTION,
} from '../../utils/vendorFieldConfig';
import {
  getBulkVendorUploadValidationErrors,
  getVendorValidationErrors,
  parseMsmeValue,
} from '../../utils/vendorValidation';
import BulkUploadReviewDialog from './components/BulkUploadReviewDialog';
import DeleteVendorDialog from './components/DeleteVendorDialog';
import ViewVendorDialog from './components/ViewVendorDialog';
import {
  getFirstVendorGstin,
  getVendorGstRegistrations,
  getVendorMultiStateCount,
  getVendorRegistrationStates,
} from './components/VendorGstRegistrationsPanel';
import VendorMultiGstBadge from './components/VendorMultiGstBadge';
import VendorTableGstExpandedRow from './components/VendorTableGstExpandedRow';
import {
  createEmptyVendorDocuments,
  normalizeVendorDocuments,
} from './utils/vendorDocuments';
import {
  getVendorTdsValidationErrors,
  normalizeVendorTds,
} from './utils/vendorTds';
import { normalizeVendorForSave } from './utils/vendorSave';
import VendorApprovalDialog from './components/VendorApprovalDialog';
import IntegrationSourceBadge from '../../components/integrations/IntegrationSourceBadge';
import useZohoIntegrationActive from '../../hooks/useZohoIntegrationActive';
import { withIntegrationTableHeader } from '../../utils/integrationProvenance';

const VENDOR_UPLOAD_FIELDS = [
  'name',
  'vendor_type',
  'email',
  'mobile',
  'phone',
  'contact_person',
  'pan',
  'gstin',
  'msme',
  'category',
  'website',
  'currency',
  'address_line1',
  'address_line2',
  'city',
  'state',
  'pincode',
  'country',
  'account_holder_name',
  'account_number',
  'ifsc_code',
  'bank_name',
  'branch',
  'notes',
];

const VENDOR_UPLOAD_HEADER_MAP = {
  name: 'Company Name',
  vendor_type: 'Vendor Type',
  email: 'Email ID',
  mobile: 'Mobile No',
  phone: 'Phone No',
  contact_person: 'Contact person',
  category: 'Category',
  website: 'Website',
  currency: 'Currency',
  address_line1: 'Address Line 1',
  address_line2: 'Address Line 2',
  city: 'City',
  state: 'State',
  pincode: 'Pincode',
  country: 'Country',
  pan: 'PAN No',
  gstin: 'GST no',
  msme: 'MSME',
  account_holder_name: 'Account Name',
  account_number: 'Account Number',
  ifsc_code: 'IFSC Code',
  bank_name: 'Bank Name',
  branch: 'Branch',
  notes: 'Remarks',
};

const toBulkVendorPayload = (row) => {
  const name = String(row.name || '').trim();
  const vendorTypeRaw = String(row.vendor_type || '').trim().toLowerCase();
  const vendorType = vendorTypeRaw === 'individual' ? 'Individual' : 'Company';
  return {
    name,
    vendor_type: vendorType,
    email: String(row.email || '').trim(),
    phone: String(row.phone || '').trim(),
    mobile: String(row.mobile || '').trim(),
    pan: String(row.pan || '').trim().toUpperCase(),
    gstin: String(row.gstin || '').trim().toUpperCase(),
    address_line1: String(row.address_line1 || '').trim(),
    address_line2: String(row.address_line2 || '').trim(),
    city: String(row.city || '').trim(),
    state: String(row.state || '').trim(),
    pincode: String(row.pincode || '').trim(),
    country: String(row.country || '').trim() || 'India',
    bank_name: String(row.bank_name || '').trim(),
    account_number: String(row.account_number || '').trim(),
    ifsc_code: String(row.ifsc_code || '').trim().toUpperCase(),
    branch: String(row.branch || '').trim(),
    account_holder_name: String(row.account_holder_name || '').trim(),
    category: String(row.category || '').trim(),
    currency: String(row.currency || '').trim() || 'INR',
    payment_terms: String(row.payment_terms || '').trim() || '30',
    contact_person: String(row.contact_person || '').trim(),
    website: String(row.website || '').trim(),
    notes: String(row.notes || '').trim(),
    msme: parseMsmeValue(row.msme) === true,
  };
};

const getVendorApiErrorMessages = (response) => {
  if (!response || !Array.isArray(response.failed)) return [];
  return response.failed.flatMap((item) =>
    Array.isArray(item?.errors) ? item.errors.filter(Boolean) : [],
  );
};

const getVendorType = (vendor) => vendor?.vendor_type || vendor?.vendorType || 'Company';

const GST_REGISTRATION_OWNED_VENDOR_SECTIONS = new Set([
  VENDOR_FIELD_SECTIONS.ADDRESS_LINE_1,
  VENDOR_FIELD_SECTIONS.ADDRESS_LINE_2,
  VENDOR_FIELD_SECTIONS.CITY,
  VENDOR_FIELD_SECTIONS.STATE,
  VENDOR_FIELD_SECTIONS.PINCODE,
  VENDOR_FIELD_SECTIONS.COUNTRY,
  VENDOR_FIELD_SECTIONS.ACCOUNT_NAME,
  VENDOR_FIELD_SECTIONS.ACCOUNT_NUMBER,
  VENDOR_FIELD_SECTIONS.IFSC_CODE,
  VENDOR_FIELD_SECTIONS.BANK_NAME,
  VENDOR_FIELD_SECTIONS.BRANCH,
]);

const getNormalizedVendorStatusKey = (status) =>
  String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');

const isPendingApprovalStatus = (status) =>
  getNormalizedVendorStatusKey(status) === 'pending approval';

const matchesVendorSearch = (vendor, query) => {
  if (!query) return true;
  const searchableText = [
    vendor?.name,
    vendor?.pan,
    vendor?.gstin,
    ...getVendorGstRegistrations(vendor).map((registration) =>
      [
        registration.gstin,
        registration.state,
      ].join(' '),
    ),
    vendor?.state,
    vendor?.city,
    vendor?.email,
    vendor?.mobile,
    vendor?.phone,
    vendor?.contact_person,
    vendor?.contactPerson,
    vendor?.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return searchableText.includes(query);
};

const VendorMetricCard = ({ label, value, icon: Icon, tone = 'primary' }) => {
  const toneClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    neutral: 'bg-slate-100 text-slate-700',
  };

  return (
    <Card className="rounded-md border-border shadow-none">
      <CardContent className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-none text-muted-foreground">{label}</p>
          <p className="mt-1 text-lg font-semibold leading-none tabular-nums text-foreground">{value}</p>
        </div>
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${toneClasses[tone]}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardContent>
    </Card>
  );
};

const Vendors = () => {
  const {
    data: vendorsData = [],
    isError: vendorsError,
    isFetching: vendorsFetching,
    refetch: refetchVendors,
  } = useGetVendorsQuery();

  const [createVendor, { isLoading: createVendorLoading }] = useCreateVendorMutation();
  const [updateVendor, { isLoading: updateVendorLoading }] = useUpdateVendorMutation();
  const [deleteVendor, { isLoading: deleteVendorLoading }] = useDeleteVendorMutation();
  const [approveVendor, { isLoading: approveVendorLoading }] = useApproveVendorMutation();
  const { user } = useAuth();
  const { data: corporateUserContext = null } = useGetCorporateUserDetailsQuery();
  const { guardAction, canPerformAction } = useActionGuard();
  const { handleCreditError } = useCreditErrorHandler();
  const { corporateScreens, isCorporateAdmin } = useRBAC();
  const { showIntegrationColumn } = useZohoIntegrationActive();
  const activeVendorFields = corporateScreens?.activeVendorFields ?? [];
  const vendorFieldConfiguration = corporateScreens?.vendorFieldConfiguration ?? [];
  const effectiveActiveVendorFields = useMemo(
    () =>
      activeVendorFields.filter(
        (section) => !GST_REGISTRATION_OWNED_VENDOR_SECTIONS.has(String(section).trim().toUpperCase()),
      ),
    [activeVendorFields],
  );
  const vendorUploadMandatoryFields = useMemo(
    () => getVendorUploadMandatoryFieldKeys(effectiveActiveVendorFields),
    [effectiveActiveVendorFields],
  );
  const vendorUploadOptionalFields = useMemo(
    () => VENDOR_UPLOAD_FIELDS.filter((field) => !vendorUploadMandatoryFields.includes(field)),
    [vendorUploadMandatoryFields],
  );
  const canUpdateVendorPermission = canPerformAction('vendors.update');
  const canRequestVendorPermission = canPerformAction('invoices.addVendor');
  const vendorEditContext = useMemo(
    () => ({
      ...buildCurrentUserIdentity({ user, corporateUserContext }),
      canUpdateVendor: canUpdateVendorPermission,
      canRequestVendor: canRequestVendorPermission,
      isCorporateAdmin,
    }),
    [
      user,
      corporateUserContext,
      canUpdateVendorPermission,
      canRequestVendorPermission,
      isCorporateAdmin,
    ],
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vendorUploadOptionOpen, setVendorUploadOptionOpen] = useState(false);
  const [multipleVendorUploadOpen, setMultipleVendorUploadOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [viewingVendor, setViewingVendor] = useState(null);
  const [vendorDeleteTarget, setVendorDeleteTarget] = useState(null);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [bulkReviewOpen, setBulkReviewOpen] = useState(false);
  const [bulkReviewData, setBulkReviewData] = useState(null);
  const [expandedVendorIds, setExpandedVendorIds] = useState(() => new Set());
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    vendor_type: 'Company',
    email: '',
    phone: '',
    mobile: '',
    
    // Tax Information
    pan: '',
    gstin: '',
    gstRegistrations: [],
    msme: false,
    
    // Address
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    
    // Bank Details
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch: '',
    account_holder_name: '',
    
    // Additional Information
    category: '',
    currency: 'INR',
    contact_person: '',
    website: '',
    notes: '',
    documents: createEmptyVendorDocuments(),
    tdsMapping: null,
  });

  const vendors = Array.isArray(vendorsData) ? vendorsData : [];

  useEffect(() => {
    if (vendorsError) {
      toast.error('Failed to load vendors');
    }
  }, [vendorsError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingVendor) {
      if (!canSaveVendorEdit(editingVendor, vendorEditContext)) {
        if (!guardAction('vendors.update')) return;
        toast.error('Only the creator can edit a vendor in Needs Correction status');
        return;
      }
    } else if (!guardAction('vendors.create')) {
      return;
    }

    const validationErrors = getVendorValidationErrors(formData, {
      activeVendorFields: effectiveActiveVendorFields,
      vendorFieldConfiguration,
    });
    const tdsValidationErrors = getVendorTdsValidationErrors(formData.tdsMapping);
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }
    if (tdsValidationErrors.length > 0) {
      toast.error(tdsValidationErrors[0]);
      return;
    }

    try {
      const vendorPayload = normalizeVendorForSave(formData);

      if (editingVendor) {
        const submittingSavedVendor = isSavedVendorStatus(editingVendor.status);
        await updateVendor({
          id: editingVendor.id,
          body: submittingSavedVendor
            ? { ...vendorPayload, status: resolveSavedVendorSubmitStatus() }
            : vendorPayload,
        }).unwrap();
        toast.success(
          submittingSavedVendor
            ? 'Vendor submitted for approval'
            : 'Vendor updated successfully',
        );
      } else {
        const response = await createVendor(vendorPayload).unwrap();
        const successCount = Number(response?.successCount ?? 0);
        const failedCount = Number(response?.failedCount ?? 0);
        const errorMessages = getVendorApiErrorMessages(response);

        if (failedCount > 0 && successCount === 0) {
          toast.error(errorMessages[0] || 'Vendor creation failed');
          return;
        }

        if (failedCount > 0) {
          toast.warning(`Vendor created with ${failedCount} issue(s)`);
        } else {
          toast.success('Vendor created successfully');
        }
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      if (handleCreditError(error)) return;
      toast.error(extractApiErrorDetail(error) || 'Failed to save vendor');
    }
  };

  const openSingleVendorDialog = () => {
    setVendorUploadOptionOpen(false);
    setEditingVendor(null);
    setDialogOpen(true);
  };

  const openMultipleVendorDialog = () => {
    setVendorUploadOptionOpen(false);
    setMultipleVendorUploadOpen(true);
  };

  const handleBulkVendorUpload = async (rows) => {
    if (!guardAction('vendors.create')) {
      return { errors: [] };
    }

    try {
      const vendorsPayload = rows
        .map((row) => normalizeVendorForSave(toBulkVendorPayload(row)))
        .filter((vendor) => vendor.name);

      if (!vendorsPayload.length) {
        return {
          errors: ['No valid vendor records found. Please include at least a vendor name column'],
        };
      }

      const bulkStatus = resolveBulkCreateVendorStatus();
      const response = await createVendor(
        vendorsPayload.map((vendor) => ({ ...vendor, status: bulkStatus })),
      ).unwrap();
      const successCount = Number(response?.successCount ?? 0);
      const failedCount = Number(response?.failedCount ?? 0);
      const errorMessages = getVendorApiErrorMessages(response);
      setBulkReviewData(response);
      setBulkReviewOpen(true);

      if (failedCount > 0 && successCount === 0) {
        return {
          errors: errorMessages.length > 0 ? errorMessages : ['Vendor upload failed'],
        };
      }

      if (failedCount > 0) {
        toast.warning(`${successCount} uploaded, ${failedCount} failed`);
      } else {
        toast.success(`${successCount || vendorsPayload.length} vendors uploaded successfully`);
      }
      setMultipleVendorUploadOpen(false);
      return { errors: [] };
    } catch (error) {
      if (handleCreditError(error)) {
        return { errors: ['Insufficient tokens or action unavailable'] };
      }
      return { errors: ['Failed to parse or upload vendor file'] };
    }
  };

  const validateVendorUploadRow = (row, rowIndex) =>
    getBulkVendorUploadValidationErrors(row, { rowIndex });

  const getUploadGuideType = (fieldKey, optionalText) => {
    const section = VENDOR_FORM_KEY_TO_SECTION[fieldKey];
    if (section && isVendorFieldRequired(section, effectiveActiveVendorFields)) {
      return 'Mandatory';
    }
    return optionalText;
  };

  const downloadVendorTemplate = () => {
    const headerRow = [
      'Company Name',
      'Vendor Type',
      'Email ID',
      'Mobile No',
      'Phone No',
      'Contact person',
      'Category',
      'Website',
      'Currency',
      'Address Line 1',
      'Address Line 2',
      'City',
      'State',
      'Pincode',
      'Country',
      'PAN No',
      'GST no',
      'MSME',
      'Account Name',
      'Account Number',
      'IFSC Code',
      'Bank Name',
      'Branch',
      'Remarks',
    ];

    const guideRows = [
      ['Parameter', 'Type'],
      ['Company Name', getUploadGuideType('name', 'Optional')],
      ['Vendor Type', getUploadGuideType('vendor_type', 'Optional (Company/Individual)')],
      ['Email ID', getUploadGuideType('email', 'Optional')],
      ['Mobile No', getUploadGuideType('mobile', 'Optional')],
      ['Phone No', getUploadGuideType('phone', 'Optional')],
      ['Contact person', getUploadGuideType('contact_person', 'Optional')],
      ['Category', getUploadGuideType('category', 'Optional')],
      ['Website', getUploadGuideType('website', 'Optional')],
      ['Currency', getUploadGuideType('currency', 'Optional')],
      ['Address Line 1', getUploadGuideType('address_line1', 'Optional')],
      ['Address Line 2', getUploadGuideType('address_line2', 'Optional')],
      ['City', getUploadGuideType('city', 'Optional')],
      ['State', getUploadGuideType('state', 'Optional')],
      [
        'Pincode',
        getUploadGuideType(
          'pincode',
          'Optional. Must be 6 digits when Country is India, otherwise any postal code text',
        ),
      ],
      ['Country', getUploadGuideType('country', 'Optional')],
      ['PAN No', getUploadGuideType('pan', 'Optional')],
      ['GST no', getUploadGuideType('gstin', 'Optional')],
      ['MSME', getUploadGuideType('msme', 'Optional (Yes/No)')],
      ['Account Name', getUploadGuideType('account_holder_name', 'Optional')],
      ['Account Number', getUploadGuideType('account_number', 'Optional')],
      ['IFSC Code', getUploadGuideType('ifsc_code', 'Optional')],
      ['Bank Name', getUploadGuideType('bank_name', 'Optional')],
      ['Branch', getUploadGuideType('branch', 'Optional')],
      ['Remarks', getUploadGuideType('notes', 'Optional')],
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headerRow]), 'Sheet1');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(guideRows), 'Guide');
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Vendor_Upload_Format.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleEdit = (vendor) => {
    if (!canEditVendor(vendor, vendorEditContext)) {
      const status = formatWorkflowStatus(vendor?.status);
      if (status === 'Rejected') {
        toast.error('Rejected vendors cannot be edited');
      } else if (status === NEEDS_CORRECTION_STATUS) {
        toast.error('Only the creator can edit a vendor in Needs Correction status');
      } else {
        toast.error('This vendor cannot be edited in its current status');
      }
      return;
    }
    setEditingVendor(vendor);
    const firstGstin = getFirstVendorGstin(vendor);
    setFormData({
      name: vendor.name || '',
      vendor_type: vendor.vendor_type || 'Company',
      email: vendor.email || '',
      phone: vendor.phone || '',
      mobile: vendor.mobile || '',
      pan: vendor.pan || '',
      gstin: firstGstin || '',
      gstRegistrations: getVendorGstRegistrations(vendor),
      msme: parseMsmeValue(vendor.msme) === true,
      address_line1: vendor.address_line1 || '',
      address_line2: vendor.address_line2 || '',
      city: vendor.city || '',
      state: vendor.state || '',
      pincode: vendor.pincode || '',
      country: vendor.country || 'India',
      bank_name: vendor.bank_name || '',
      account_number: vendor.account_number || '',
      ifsc_code: vendor.ifsc_code || '',
      branch: vendor.branch || '',
      account_holder_name: vendor.account_holder_name || '',
      category: vendor.category || '',
      currency: vendor.currency || 'INR',
      contact_person: vendor.contact_person || '',
      website: vendor.website || '',
      notes: vendor.notes || '',
      documents: normalizeVendorDocuments(vendor.documents),
      tdsMapping: normalizeVendorTds(vendor.tdsMapping ?? vendor.tdsMappings),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!guardAction('vendors.delete')) return;
    setVendorDeleteTarget(id);
  };

  const confirmDeleteVendor = async () => {
    if (!vendorDeleteTarget) return;
    try {
      await deleteVendor(vendorDeleteTarget).unwrap();
      toast.success('Vendor deleted successfully');
    } catch (error) {
      toast.error('Failed to delete vendor');
    } finally {
      setVendorDeleteTarget(null);
    }
  };

  const openVendorApprovalDialog = (vendor, action) => {
    if (!guardAction('vendors.approve')) return;
    setApprovalTarget({ vendor, action });
    setApprovalComments('');
  };

  const confirmVendorApprovalAction = async () => {
    if (!approvalTarget) return;

    try {
      await approveVendor({
        id: approvalTarget.vendor.id,
        body: {
          action: approvalTarget.action,
          comments: approvalComments.trim(),
        },
      }).unwrap();
      toast.success(`Vendor ${approvalTarget.action.toLowerCase()} successfully`);
      setApprovalTarget(null);
      setApprovalComments('');
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to update vendor approval');
    }
  };

  const getStatusBadgeClass = (status) => {
    const normalizedStatus = formatWorkflowStatus(status);
    if (normalizedStatus === 'Approved') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (normalizedStatus === 'Rejected') return 'bg-red-100 text-red-800 border-red-200';
    if (normalizedStatus === 'Saved') return 'bg-slate-100 text-slate-800 border-slate-200';
    if (normalizedStatus === 'Draft' || normalizedStatus === NEEDS_CORRECTION_STATUS) {
      return 'bg-amber-100 text-amber-900 border-amber-200';
    }
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  const resetForm = () => {
    setEditingVendor(null);
    setFormData({
      name: '',
      vendor_type: 'Company',
      email: '',
      phone: '',
      mobile: '',
      pan: '',
      gstin: '',
      gstRegistrations: [],
      msme: false,
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
      contact_person: '',
      website: '',
      notes: '',
      documents: createEmptyVendorDocuments(),
      tdsMapping: null,
    });
  };

  const vendorStats = useMemo(() => {
    const approved = vendors.filter((vendor) => formatWorkflowStatus(vendor.status) === 'Approved').length;
    const pendingApproval = vendors.filter((vendor) => isPendingApprovalStatus(vendor.status)).length;
    const saved = vendors.filter((vendor) => isSavedVendorStatus(vendor.status)).length;
    const multiState = getVendorMultiStateCount(vendors);

    return {
      total: vendors.length,
      approved,
      pendingApproval,
      saved,
      multiState,
    };
  }, [vendors]);

  const isEditingSavedVendor =
    Boolean(editingVendor) && isSavedVendorStatus(editingVendor?.status);

  const toggleVendorExpanded = (vendorId) => {
    setExpandedVendorIds((prev) => {
      const next = new Set(prev);
      if (next.has(vendorId)) {
        next.delete(vendorId);
      } else {
        next.add(vendorId);
      }
      return next;
    });
  };

  const filteredVendors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return vendors.filter((vendor) => {
      const vendorType = getVendorType(vendor).toLowerCase();
      const statusLabel = formatWorkflowStatus(vendor.status) || 'Pending Approval';
      const statusKey = getNormalizedVendorStatusKey(statusLabel);

      const matchesSearch = matchesVendorSearch(vendor, query);
      const matchesType = typeFilter === 'all' || vendorType === typeFilter;
      const matchesStatus = statusFilter === 'all' || statusKey === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [vendors, searchTerm, typeFilter, statusFilter]);

  const hasActiveFilters = Boolean(searchTerm.trim()) || typeFilter !== 'all' || statusFilter !== 'all';

  const resetVendorFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
  };

  const vendorFilterSummary = `${filteredVendors.length} of ${vendors.length} vendor${
    vendors.length === 1 ? '' : 's'
  } shown`;

  const isPendingApprovalVendor = (vendor) => isPendingApprovalStatus(vendor?.status);

  const vendorTypeOptions = useMemo(() => {
    const options = new Map([
      ['company', 'Company'],
      ['individual', 'Individual'],
    ]);
    vendors.forEach((vendor) => {
      const type = String(getVendorType(vendor)).trim();
      if (type) options.set(type.toLowerCase(), type);
    });
    return Array.from(options.values());
  }, [vendors]);

  const vendorStatusOptions = useMemo(
    () => {
      const options = new Map();
      vendors.forEach((vendor) => {
        const status = formatWorkflowStatus(vendor.status) || 'Pending Approval';
        if (status) options.set(getNormalizedVendorStatusKey(status), status);
      });
      return Array.from(options.values());
    },
    [vendors],
  );
  const canCreateVendor = canPerformAction('vendors.create');
  const canEditVendorPermission = canUpdateVendorPermission;
  const canDeleteVendor = canPerformAction('vendors.delete');
  const canApproveVendor = canPerformAction('vendors.approve');
  const vendorsRefreshing = vendorsFetching;

  const handleRefreshVendors = async () => {
    try {
      await refetchVendors();
      toast.success('Vendors refreshed');
    } catch {
      toast.error('Failed to refresh vendors');
    }
  };

  const vendorsTableHeader = useMemo(
    () =>
      withIntegrationTableHeader(
        [
          { key: 'vendor', title: 'Vendor' },
          { key: 'createdAt', title: 'Created Date', cellClassName: 'text-xs text-muted-foreground whitespace-nowrap' },
          { key: 'status', title: 'Status' },
          { key: 'contact', title: 'Contact' },
          { key: 'gstRegistrations', title: 'GSTINs' },
          { key: 'actions', title: 'Actions', headerClassName: 'text-left' },
        ],
        showIntegrationColumn,
      ),
    [showIntegrationColumn],
  );

  const renderVendorRow = (vendor, rowIndex, headers) => {
    const vendorId = vendor.id ?? rowIndex;
    const registrations = getVendorGstRegistrations(vendor);
    const registrationStates = getVendorRegistrationStates(vendor);
    const isExpanded = expandedVendorIds.has(vendorId);
    const canExpand = registrations.length > 0;

    return (
      <React.Fragment key={vendorId}>
        <TableRow
          className="border-b border-border hover:bg-muted/50 transition-colors"
          data-testid={`vendor-row-${vendor.id}`}
        >
          {headers.map((header) => {
            let value;

            switch (header.key) {
          case 'vendor':
            value = (
              <div>
                <div className="font-medium">{vendor.name}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{getVendorType(vendor)}</span>
                  {vendor.pan && <span className="font-mono">{vendor.pan}</span>}
                </div>
              </div>
            );
            break;
          case 'type':
            value = (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                vendor.vendor_type === 'Company'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-purple-100 text-purple-800 border border-purple-200'
              }`}>
                {vendor.vendor_type || 'Company'}
              </span>
            );
            break;
          case 'status':
            value = (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(vendor.status)}`}>
                {formatWorkflowStatus(vendor.status) || 'Pending Approval'}
              </span>
            );
            break;
          case 'contact':
            value = (
              <div className="text-sm">
                <div>{vendor.email || '-'}</div>
                <div className="text-muted-foreground">{vendor.mobile || vendor.phone || '-'}</div>
              </div>
            );
            break;
          case 'pan':
            value = vendor.pan || '-';
            break;
          case 'gstRegistrations':
            value = registrations.length > 0 ? (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleVendorExpanded(vendorId)}
                  className="inline-flex items-center gap-1.5 text-left"
                  data-testid={`toggle-vendor-gst-${vendor.id}`}
                >
                  <VendorMultiGstBadge count={registrations.length} states={registrationStates} />
                  {canExpand ? (
                    isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )
                  ) : null}
                </button>
                {registrations.length > 1 && !isExpanded ? (
                  <div className="text-xs text-muted-foreground">{registrationStates.join(' · ')}</div>
                ) : null}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            );
            break;
          case 'integration':
            value = <IntegrationSourceBadge record={vendor} />;
            break;
          case 'createdAt': {
            const createdAt = vendor.createdAt || vendor.created_at;
            const createdDate = createdAt ? new Date(createdAt) : null;
            value =
              createdDate && !Number.isNaN(createdDate.getTime())
                ? format(createdDate, 'dd MMM yy, hh:mm a')
                : '-';
            break;
          }
          case 'actions':
            value = (
              <div className="inline-flex justify-start items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 rounded-md"
                  onClick={() => setViewingVendor(vendor)}
                  title="View"
                  data-testid={`view-vendor-${vendor.id}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {canApproveVendor && isPendingApprovalVendor(vendor) && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 rounded-md"
                      onClick={() => openVendorApprovalDialog(vendor, NEEDS_CORRECTION_ACTION)}
                      title="Needs Correction"
                      data-testid={`needs-correction-vendor-${vendor.id}`}
                    >
                      <RotateCcw className="h-4 w-4 text-amber-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 rounded-md"
                      onClick={() => openVendorApprovalDialog(vendor, 'Rejected')}
                      title="Reject"
                      data-testid={`reject-vendor-${vendor.id}`}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 rounded-md"
                      onClick={() => openVendorApprovalDialog(vendor, 'Approved')}
                      title="Approve"
                      data-testid={`approve-vendor-${vendor.id}`}
                    >
                      <Check className="h-4 w-4 text-emerald-700" />
                    </Button>
                  </>
                )}
                {(canEditVendor(vendor, vendorEditContext) || canDeleteVendor) && (
                  <>
                    {canEditVendor(vendor, vendorEditContext) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 rounded-md"
                        onClick={() => handleEdit(vendor)}
                        title={
                          formatWorkflowStatus(vendor.status) === NEEDS_CORRECTION_STATUS
                            ? 'Edit vendor (creator)'
                            : 'Edit vendor'
                        }
                        data-testid={`edit-vendor-${vendor.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteVendor && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 rounded-md"
                        onClick={() => handleDelete(vendor.id)}
                        data-testid={`delete-vendor-${vendor.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            );
            break;
          default:
            value = '-';
        }

            const className = [
              header.cellClassName,
              header.key === 'pan' ? 'text-sm' : '',
              header.key === 'actions' ? 'text-left' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <TableCell key={header.key} className={className}>
                {value}
              </TableCell>
            );
          })}
        </TableRow>
        {isExpanded && canExpand ? (
          <VendorTableGstExpandedRow vendor={vendor} colSpan={headers.length} />
        ) : null}
      </React.Fragment>
    );
  };

  return (
    <div data-testid="vendors-page">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold font-['Manrope'] text-primary md:text-4xl" data-testid="vendors-title">
            Vendors
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage vendor legal entities and their GST registrations
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton
            onClick={handleRefreshVendors}
            refreshing={vendorsRefreshing}
          >
            Refresh
          </RefreshButton>
          {canCreateVendor && (
            <div className="relative">
              <Button data-testid="new-vendor-button" onClick={() => setVendorUploadOptionOpen((prev) => !prev)}>
                <Plus className="h-4 w-4 mr-2" />
                New Vendor
              </Button>
              {vendorUploadOptionOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-border bg-background p-2 shadow-md">
                  <button
                    type="button"
                    className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={openSingleVendorDialog}
                  >
                    Single Vendor
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={openMultipleVendorDialog}
                  >
                    Multiple Vendors
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <MultipleVendorUploadDialog
        open={multipleVendorUploadOpen}
        onOpenChange={setMultipleVendorUploadOpen}
        onDownloadTemplate={downloadVendorTemplate}
        onDataParsed={handleBulkVendorUpload}
        disabled={createVendorLoading}
        expectedHeaders={VENDOR_UPLOAD_FIELDS}
        uploadHeaderMap={VENDOR_UPLOAD_HEADER_MAP}
        nonMandatoryFields={vendorUploadOptionalFields}
        customValidation={validateVendorUploadRow}
      />

      <BulkUploadReviewDialog
        open={bulkReviewOpen}
        onOpenChange={setBulkReviewOpen}
        data={bulkReviewData}
      />

      <VendorDetailsDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        title={
          isEditingSavedVendor
            ? 'Complete Vendor'
            : editingVendor
              ? 'Edit Vendor'
              : 'Create Vendor'
        }
        description={
          isEditingSavedVendor
            ? 'Review imported vendor details, complete GSTIN and documents, then submit for approval.'
            : 'Add contact details and payment info of your vendor in OptiFii'
        }
        submitLabel={
          isEditingSavedVendor
            ? 'Submit for Approval'
            : editingVendor
              ? 'Update Vendor'
              : 'Create Vendor'
        }
        submitting={createVendorLoading || updateVendorLoading}
        activeVendorFields={effectiveActiveVendorFields}
        vendorFieldConfiguration={vendorFieldConfiguration}
        testId="vendor-dialog"
      />

      <div className="mb-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <VendorMetricCard
          label="Total Vendors"
          value={vendorStats.total}
          icon={Building2}
        />
        <VendorMetricCard
          label="Approved"
          value={vendorStats.approved}
          icon={CheckCircle2}
          tone="success"
        />
        <VendorMetricCard
          label="Pending Approval"
          value={vendorStats.pendingApproval}
          icon={Clock3}
          tone="warning"
        />
        <VendorMetricCard
          label="Multi-State"
          value={vendorStats.multiState}
          icon={MapIcon}
          tone="neutral"
        />
      </div>

      <Card className="mb-3 rounded-md border-border shadow-none">
        <CardContent className="p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search vendors by name, PAN, GSTIN, state, email, or phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-10"
                data-testid="vendor-search-input"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:w-[360px]">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9" data-testid="vendor-type-filter">
                  <SelectValue placeholder="Vendor type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {vendorTypeOptions.map((type) => (
                    <SelectItem key={type} value={type.toLowerCase()}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9" data-testid="vendor-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {vendorStatusOptions.map((status) => (
                    <SelectItem key={status} value={getNormalizedVendorStatusKey(status)}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{vendorFilterSummary}</span>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={resetVendorFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <AppDataTable
          tableHeader={vendorsTableHeader}
          tableData={filteredVendors}
          renderRow={renderVendorRow}
          emptyMessage="No vendors found. Create your first vendor to get started!"
          emptyTestId="no-vendors"
          tableClassName="w-full"
          striped={false}
        />
      </div>

      <DeleteVendorDialog
        open={Boolean(vendorDeleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteVendorLoading) setVendorDeleteTarget(null);
        }}
        onConfirm={confirmDeleteVendor}
        deleting={deleteVendorLoading}
      />

      <ViewVendorDialog
        open={Boolean(viewingVendor)}
        onOpenChange={(open) => !open && setViewingVendor(null)}
        vendor={viewingVendor}
        canApprove={canApproveVendor}
        isPendingApproval={viewingVendor ? isPendingApprovalVendor(viewingVendor) : false}
        onApproveAction={(vendor, action) => {
          setViewingVendor(null);
          openVendorApprovalDialog(vendor, action);
        }}
      />

      <VendorApprovalDialog
        open={Boolean(approvalTarget)}
        onOpenChange={(open) => {
          if (!open && !approveVendorLoading) setApprovalTarget(null);
        }}
        approvalTarget={approvalTarget}
        approvalComments={approvalComments}
        onCommentsChange={setApprovalComments}
        onConfirm={confirmVendorApprovalAction}
        confirming={approveVendorLoading}
      />
    </div>
  );
};

export default Vendors;
