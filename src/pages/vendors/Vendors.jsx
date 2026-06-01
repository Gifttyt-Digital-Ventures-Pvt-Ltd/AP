import React, { useEffect, useMemo, useState } from 'react';
import {
  useGetVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useGetPendingVendorApprovalsQuery,
  useApproveVendorMutation,
} from '../../Services/apis/invoicesVendorsApi';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, Plus, Pencil, Trash2, Eye, X, Check, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useActionGuard } from '../../hooks/useActionGuard';
import { useRBAC } from '../../contexts/RBACContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGetCorporateUserDetailsQuery } from '../../Services/apis/corporateApi';
import {
  buildCurrentUserIdentity,
  canEditVendor,
  canSaveVendorEdit,
  extractApiErrorDetail,
  formatWorkflowStatus,
  NEEDS_CORRECTION_ACTION,
  NEEDS_CORRECTION_STATUS,
} from '../../utils/approvalWorkflow';
import VendorDetailsDialog from '../../components/vendors/VendorDetailsDialog';
import * as XLSX from '@e965/xlsx';
import AppDataTable from '../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../components/ui/table';
import MultipleVendorUploadDialog from './components/MultipleVendorUploadDialog';
import { getVendorValidationErrors } from '../../utils/vendorValidation';
import BulkUploadReviewDialog from './components/BulkUploadReviewDialog';
import DeleteVendorDialog from './components/DeleteVendorDialog';
import ViewVendorDialog from './components/ViewVendorDialog';
import VendorApprovalDialog from './components/VendorApprovalDialog';

const VENDOR_UPLOAD_FIELDS = [
  'name',
  'vendor_type',
  'email',
  'mobile',
  'phone',
  'contact_person',
  'pan',
  'gstin',
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

const VENDOR_UPLOAD_MANDATORY_FIELDS = [
  'name',
  'vendor_type',
  'email',
  'mobile',
  'contact_person',
  'address_line1',
  'address_line2',
  'city',
  'state',
  'pincode',
  'country',
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
  account_holder_name: 'Account Name',
  account_number: 'Account Number',
  ifsc_code: 'IFSC Code',
  bank_name: 'Bank Name',
  branch: 'Branch',
  notes: 'Remarks',
};

const VENDOR_UPLOAD_OPTIONAL_FIELDS = VENDOR_UPLOAD_FIELDS.filter(
  (field) => !VENDOR_UPLOAD_MANDATORY_FIELDS.includes(field),
);

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
  };
};

const getVendorApiErrorMessages = (response) => {
  if (!response || !Array.isArray(response.failed)) return [];
  return response.failed.flatMap((item) =>
    Array.isArray(item?.errors) ? item.errors.filter(Boolean) : [],
  );
};

const Vendors = () => {
  const {
    data: vendorsData = [],
    isError: vendorsError,
  } = useGetVendorsQuery();
  const {
    data: pendingApprovalsData = [],
    isError: pendingApprovalsError,
  } = useGetPendingVendorApprovalsQuery();

  const [createVendor, { isLoading: createVendorLoading }] = useCreateVendorMutation();
  const [updateVendor] = useUpdateVendorMutation();
  const [deleteVendor] = useDeleteVendorMutation();
  const [approveVendor] = useApproveVendorMutation();
  const { user } = useAuth();
  const { data: corporateUserContext = null } = useGetCorporateUserDetailsQuery();
  const { guardAction, canPerformAction } = useActionGuard();
  const { isCorporateAdmin } = useRBAC();
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
    notes: ''
  });

  const vendors = Array.isArray(vendorsData) ? vendorsData : [];
  const pendingApprovalVendors = Array.isArray(pendingApprovalsData) ? pendingApprovalsData : [];

  useEffect(() => {
    if (vendorsError) {
      toast.error('Failed to load vendors');
    }
  }, [vendorsError]);
  useEffect(() => {
    if (pendingApprovalsError) {
      toast.error('Failed to load pending vendor approvals');
    }
  }, [pendingApprovalsError]);

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
      requireEmail: true,
      requirePincode: true,
    });
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

    try {
      if (editingVendor) {
        await updateVendor({ id: editingVendor.id, body: formData }).unwrap();
        toast.success('Vendor updated successfully');
      } else {
        const response = await createVendor(formData).unwrap();
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
        .map((row) => toBulkVendorPayload(row))
        .filter((vendor) => vendor.name);

      if (!vendorsPayload.length) {
        return {
          errors: ['No valid vendor records found. Please include at least a vendor name column'],
        };
      }

      const response = await createVendor(vendorsPayload).unwrap();
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
    } catch (_error) {
      return { errors: ['Failed to parse or upload vendor file'] };
    }
  };

  const validateVendorUploadRow = (row, rowIndex) =>
    getVendorValidationErrors(row, {
      rowIndex,
      requireEmail: true,
      requireVendorType: true,
      requirePincode: true,
    });

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
      'Account Name',
      'Account Number',
      'IFSC Code',
      'Bank Name',
      'Branch',
      'Remarks',
    ];

    const guideRows = [
      ['Parameter', 'Type'],
      ['Company Name', 'Mandatory'],
      ['Vendor Type', 'Mandatory (Company/Individual)'],
      ['Email ID', 'Mandatory'],
      ['Mobile No', 'Mandatory'],
      ['Phone No', 'Optional'],
      ['Contact person', 'Mandatory'],
      ['Category', 'Optional'],
      ['Website', 'Optional'],
      ['Currency', 'Optional'],
      ['Address Line 1', 'Mandatory'],
      ['Address Line 2', 'Mandatory'],
      ['City', 'Mandatory'],
      ['State', 'Mandatory'],
      ['Pincode', 'Mandatory. Must be 6 digits when Country is India, otherwise any postal code text'],
      ['Country', 'Mandatory'],
      ['PAN No', 'Mandatory when Country is India, otherwise Optional'],
      ['GST no', 'Mandatory when Country is India, otherwise Optional'],
      ['Account Name', 'Optional'],
      ['Account Number', 'Optional'],
      ['IFSC Code', 'Optional'],
      ['Bank Name', 'Optional'],
      ['Branch', 'Optional'],
      ['Remarks', 'Optional'],
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
    setFormData({
      name: vendor.name || '',
      vendor_type: vendor.vendor_type || 'Company',
      email: vendor.email || '',
      phone: vendor.phone || '',
      mobile: vendor.mobile || '',
      pan: vendor.pan || '',
      gstin: vendor.gstin || '',
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
      notes: vendor.notes || ''
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
      notes: ''
    });
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredPendingVendorIds = new Set(
    pendingApprovalVendors
      .map((vendor) => (vendor?.id !== undefined && vendor?.id !== null ? String(vendor.id) : null))
      .filter((id) => id !== undefined && id !== null),
  );
  const canCreateVendor = canPerformAction('vendors.create');
  const canEditVendorPermission = canUpdateVendorPermission;
  const canDeleteVendor = canPerformAction('vendors.delete');
  const canApproveVendor = canPerformAction('vendors.approve');

  const isPendingApprovalVendor = (vendor) => {
    const normalizedStatus = String(vendor?.status || '')
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ');
    if (normalizedStatus === 'pending approval') return true;
    const vendorId = vendor?.id !== undefined && vendor?.id !== null ? String(vendor.id) : '';
    return vendorId ? filteredPendingVendorIds.has(vendorId) : false;
  };

  const vendorsTableHeader = [
    { key: 'vendor', title: 'Vendor' },
    { key: 'type', title: 'Type' },
    { key: 'status', title: 'Status' },
    { key: 'contact', title: 'Contact' },
    { key: 'pan', title: 'PAN' },
    { key: 'gstin', title: 'GSTIN' },
    { key: 'actions', title: 'Actions', headerClassName: 'text-left' },
  ];

  const renderVendorRow = (vendor, rowIndex, headers) => (
    <TableRow
      key={vendor.id ?? rowIndex}
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
                <div className="text-sm text-muted-foreground">{vendor.category || 'Uncategorized'}</div>
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
          case 'gstin':
            value = vendor.gstin ? `${vendor.gstin.substring(0, 4)}...${vendor.gstin.slice(-4)}` : '-';
            break;
          case 'actions':
            value = (
              <div className="inline-flex justify-start items-center gap-1 pl-3">
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
          header.key === 'pan' || header.key === 'gstin' ? "  text-sm" : '',
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
  );

  return (
    <div data-testid="vendors-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2" data-testid="vendors-title">
            Vendors
          </h1>
          <p className="text-muted-foreground">Manage your vendor relationships</p>
        </div>
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

      <MultipleVendorUploadDialog
        open={multipleVendorUploadOpen}
        onOpenChange={setMultipleVendorUploadOpen}
        onDownloadTemplate={downloadVendorTemplate}
        onDataParsed={handleBulkVendorUpload}
        disabled={createVendorLoading}
        expectedHeaders={VENDOR_UPLOAD_FIELDS}
        uploadHeaderMap={VENDOR_UPLOAD_HEADER_MAP}
        nonMandatoryFields={VENDOR_UPLOAD_OPTIONAL_FIELDS}
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
        title={editingVendor ? 'Edit Vendor' : 'Create Vendor'}
        description="Add contact details and payment info of your vendor in OptiFii"
        submitLabel={editingVendor ? 'Update Vendor' : 'Create Vendor'}
        requireEmail
        requireFullMandatory
        testId="vendor-dialog"
      />

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search and filter"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="vendor-search-input"
          />
        </div>
      </div>

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
        onOpenChange={(open) => !open && setVendorDeleteTarget(null)}
        onConfirm={confirmDeleteVendor}
      />

      <ViewVendorDialog
        open={Boolean(viewingVendor)}
        onOpenChange={(open) => !open && setViewingVendor(null)}
        vendor={viewingVendor}
      />

      <VendorApprovalDialog
        open={Boolean(approvalTarget)}
        onOpenChange={(open) => !open && setApprovalTarget(null)}
        approvalTarget={approvalTarget}
        approvalComments={approvalComments}
        onCommentsChange={setApprovalComments}
        onConfirm={confirmVendorApprovalAction}
      />
    </div>
  );
};

export default Vendors;
