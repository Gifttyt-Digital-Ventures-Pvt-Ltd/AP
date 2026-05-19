import React, { useEffect, useState } from 'react';
import {
  useGetVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useGetPendingVendorApprovalsQuery,
  useApproveVendorMutation,
  useLazyGetVendorHistoryQuery,
} from '../../Services/apis/invoicesVendorsApi';
import { Button } from '../../components/ui/button';
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
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Search, Plus, Pencil, Trash2, Eye, X, Check, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useActionGuard } from '../../hooks/useActionGuard';
import { Textarea } from '../../components/ui/textarea';
import VendorDetailsDialog from '../../components/vendors/VendorDetailsDialog';

const Vendors = () => {
  const {
    data: vendorsData = [],
    isError: vendorsError,
  } = useGetVendorsQuery();
  const {
    data: pendingApprovalsData = [],
    isError: pendingApprovalsError,
  } = useGetPendingVendorApprovalsQuery();

  const [createVendor] = useCreateVendorMutation();
  const [updateVendor] = useUpdateVendorMutation();
  const [deleteVendor] = useDeleteVendorMutation();
  const [approveVendor] = useApproveVendorMutation();
  const [triggerVendorHistory] = useLazyGetVendorHistoryQuery();
  const { guardAction, canPerformAction } = useActionGuard();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [viewingVendor, setViewingVendor] = useState(null);
  const [vendorDeleteTarget, setVendorDeleteTarget] = useState(null);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvalComments, setApprovalComments] = useState('');
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
    payment_terms: '30',
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
    const actionKey = editingVendor ? 'vendors.update' : 'vendors.create';
    if (!guardAction(actionKey)) return;

    try {
      if (editingVendor) {
        await updateVendor({ id: editingVendor.id, body: formData }).unwrap();
        toast.success('Vendor updated successfully');
      } else {
        await createVendor(formData).unwrap();
        toast.success('Vendor created successfully');
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save vendor');
    }
  };

  const handleEdit = (vendor) => {
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
      payment_terms: vendor.payment_terms || '30',
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

  const handleViewVendorHistory = async (vendor) => {
    try {
      await triggerVendorHistory(vendor.id).unwrap();
    } catch (_error) {
      // History button is hidden for now; keep API helper for future enablement.
    }
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'Approved') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (status === 'Rejected') return 'bg-red-100 text-red-800 border-red-200';
    if (status === 'Draft' || status === 'Sent Back') return 'bg-slate-100 text-slate-800 border-slate-200';
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
      payment_terms: '30',
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
  const canEditVendor = canPerformAction('vendors.update');
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
          <Button data-testid="new-vendor-button" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Vendor
          </Button>
        )}
      </div>

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
        <table className="w-full" data-testid="vendors-table">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-4 text-left text-sm font-medium">Vendor</th>
              <th className="p-4 text-left text-sm font-medium">Type</th>
              <th className="p-4 text-left text-sm font-medium">Status</th>
              <th className="p-4 text-left text-sm font-medium">Contact</th>
              <th className="p-4 text-left text-sm font-medium">PAN</th>
              <th className="p-4 text-left text-sm font-medium">GSTIN</th>
              <th className="p-4 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVendors.map((vendor) => (
              <tr
                key={vendor.id}
                className="border-b border-border hover:bg-muted/50 transition-colors"
                data-testid={`vendor-row-${vendor.id}`}
              >
                <td className="p-4">
                  <div>
                    <div className="font-medium">{vendor.name}</div>
                    <div className="text-sm text-muted-foreground">{vendor.category || 'Uncategorized'}</div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    vendor.vendor_type === 'Company'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-purple-100 text-purple-800 border border-purple-200'
                  }`}>
                    {vendor.vendor_type || 'Company'}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(vendor.status)}`}>
                    {vendor.status || 'Pending Approval'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    <div>{vendor.email || '-'}</div>
                    <div className="text-muted-foreground">{vendor.mobile || vendor.phone || '-'}</div>
                  </div>
                </td>
                <td className="p-4 font-['JetBrains_Mono'] text-sm">
                  {vendor.pan || '-'}
                </td>
                <td className="p-4 font-['JetBrains_Mono'] text-sm">
                  {vendor.gstin ? `${vendor.gstin.substring(0, 4)}...${vendor.gstin.slice(-4)}` : '-'}
                </td>
                <td className="p-4 text-right">
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
                          onClick={() => openVendorApprovalDialog(vendor, 'Sent Back')}
                          title="Send Back"
                          data-testid={`sendback-vendor-${vendor.id}`}
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
                    {(canEditVendor || canDeleteVendor) && (
                      <>
                        {canEditVendor && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0 rounded-md"
                            onClick={() => handleEdit(vendor)}
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredVendors.length === 0 && (
          <div className="text-center py-8 text-muted-foreground" data-testid="no-vendors">
            No vendors found. Create your first vendor to get started!
          </div>
        )}
      </div>

      <AlertDialog open={Boolean(vendorDeleteTarget)} onOpenChange={(open) => !open && setVendorDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this vendor? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteVendor}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(viewingVendor)} onOpenChange={(open) => !open && setViewingVendor(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
          </DialogHeader>
          {viewingVendor && (
            <div className="space-y-6 text-sm">
              <div>
                <h3 className="font-semibold mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{viewingVendor.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">{viewingVendor.vendor_type || 'Company'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">{viewingVendor.status || 'Pending Approval'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Category</p>
                    <p className="font-medium">{viewingVendor.category || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{viewingVendor.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mobile</p>
                    <p className="font-medium">{viewingVendor.mobile || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{viewingVendor.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Contact Person</p>
                    <p className="font-medium">{viewingVendor.contact_person || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Website</p>
                    <p className="font-medium">{viewingVendor.website || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Tax Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">PAN</p>
                    <p className="font-medium font-['JetBrains_Mono']">{viewingVendor.pan || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">GSTIN</p>
                    <p className="font-medium font-['JetBrains_Mono']">{viewingVendor.gstin || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Address Line 1</p>
                    <p className="font-medium">{viewingVendor.address_line1 || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Address Line 2</p>
                    <p className="font-medium">{viewingVendor.address_line2 || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">City</p>
                    <p className="font-medium">{viewingVendor.city || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">State</p>
                    <p className="font-medium">{viewingVendor.state || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pincode</p>
                    <p className="font-medium">{viewingVendor.pincode || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Country</p>
                    <p className="font-medium">{viewingVendor.country || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Bank Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Bank Name</p>
                    <p className="font-medium">{viewingVendor.bank_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Account Holder Name</p>
                    <p className="font-medium">{viewingVendor.account_holder_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Account Number</p>
                    <p className="font-medium font-['JetBrains_Mono']">{viewingVendor.account_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">IFSC</p>
                    <p className="font-medium font-['JetBrains_Mono']">{viewingVendor.ifsc_code || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Branch</p>
                    <p className="font-medium">{viewingVendor.branch || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Currency</p>
                    <p className="font-medium">{viewingVendor.currency || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment Terms</p>
                    <p className="font-medium">{viewingVendor.payment_terms || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium whitespace-pre-wrap">{viewingVendor.notes || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingVendor(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(approvalTarget)} onOpenChange={(open) => !open && setApprovalTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approvalTarget?.action || 'Update'} Vendor</DialogTitle>
          </DialogHeader>
          {approvalTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p><strong>Vendor:</strong> {approvalTarget.vendor.name || '-'}</p>
                <p><strong>Action:</strong> {approvalTarget.action}</p>
              </div>
              <div className="space-y-2">
                <Label>Comments</Label>
                <Textarea
                  value={approvalComments}
                  onChange={(event) => setApprovalComments(event.target.value)}
                  placeholder="Optional comments"
                  rows={3}
                  data-testid="vendor-approval-comments"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalTarget(null)}>Cancel</Button>
            <Button
              onClick={confirmVendorApprovalAction}
              variant={approvalTarget?.action === 'Rejected' ? 'destructive' : 'default'}
              data-testid="confirm-vendor-approval"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vendors;
