import React, { useEffect, useState } from 'react';
import {
  useGetVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
} from '../Services/apiSlice';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Search, Plus, Pencil, Trash2, Building2, User } from 'lucide-react';
import { toast } from 'sonner';

export const Vendors = () => {
  const {
    data: vendorsData = [],
    refetch: refetchVendors,
    isError: vendorsError,
  } = useGetVendorsQuery();
  const [createVendor] = useCreateVendorMutation();
  const [updateVendor] = useUpdateVendorMutation();
  const [deleteVendor] = useDeleteVendorMutation();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
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

  useEffect(() => {
    if (vendorsError) {
      toast.error('Failed to load vendors');
    }
  }, [vendorsError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      refetchVendors();
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
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    
    try {
      await deleteVendor(id).unwrap();
      toast.success('Vendor deleted successfully');
      refetchVendors();
    } catch (error) {
      toast.error('Failed to delete vendor');
    }
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

  return (
    <div data-testid="vendors-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2" data-testid="vendors-title">
            Vendors
          </h1>
          <p className="text-muted-foreground">Manage your vendor relationships</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="new-vendor-button">
              <Plus className="h-4 w-4 mr-2" />
              New Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="vendor-dialog">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingVendor ? 'Edit Vendor' : 'Create Vendor'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Add contact details and payment info of your vendor in OptiFii
              </p>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="tax">Tax Info</TabsTrigger>
                  <TabsTrigger value="bank">Bank Details</TabsTrigger>
                  <TabsTrigger value="additional">Additional</TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="vendor_type">Vendor Type *</Label>
                      <div className="flex gap-4 mt-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, vendor_type: 'Company' })}
                          className={`flex-1 p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                            formData.vendor_type === 'Company'
                              ? 'border-accent bg-accent/10'
                              : 'border-border hover:border-accent/50'
                          }`}
                        >
                          <Building2 className="h-5 w-5" />
                          <span className="font-medium">Company</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, vendor_type: 'Individual' })}
                          className={`flex-1 p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                            formData.vendor_type === 'Individual'
                              ? 'border-accent bg-accent/10'
                              : 'border-border hover:border-accent/50'
                          }`}
                        >
                          <User className="h-5 w-5" />
                          <span className="font-medium">Individual</span>
                        </button>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="name">
                        {formData.vendor_type === 'Company' ? 'Company Name' : 'Full Name'} *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder={formData.vendor_type === 'Company' ? 'e.g., Acme Corporation' : 'e.g., John Doe'}
                        data-testid="vendor-name-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder="vendor@example.com"
                        data-testid="vendor-email-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="mobile">Mobile Number *</Label>
                      <Input
                        id="mobile"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        placeholder="+91 98765 43210"
                        data-testid="vendor-mobile-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 22 1234 5678"
                        data-testid="vendor-phone-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="contact_person">Contact Person</Label>
                      <Input
                        id="contact_person"
                        value={formData.contact_person}
                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                        placeholder="e.g., Rahul Sharma"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="category">Category</Label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select Category</option>
                        <option value="IT Services">IT Services</option>
                        <option value="Office Supplies">Office Supplies</option>
                        <option value="Consulting">Consulting</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Legal">Legal</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://example.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <select
                        id="currency"
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="INR">INR - Indian Rupee</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="address_line1">Address Line 1</Label>
                      <Input
                        id="address_line1"
                        value={formData.address_line1}
                        onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                        placeholder="Building/Street address"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="address_line2">Address Line 2</Label>
                      <Input
                        id="address_line2"
                        value={formData.address_line2}
                        onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                        placeholder="Apartment, suite, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g., Mumbai"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="e.g., Maharashtra"
                      />
                    </div>

                    <div>
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input
                        id="pincode"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        placeholder="e.g., 400001"
                      />
                    </div>

                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        placeholder="India"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Tax Information Tab */}
                <TabsContent value="tax" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pan">PAN Number</Label>
                      <Input
                        id="pan"
                        value={formData.pan}
                        onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        className="uppercase"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        10-digit alphanumeric PAN number
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="gstin">GSTIN</Label>
                      <Input
                        id="gstin"
                        value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                        placeholder="29ABCDE1314R9Z6"
                        maxLength={15}
                        className="uppercase"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        15-digit GST Identification Number
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="payment_terms">Payment Terms (Days)</Label>
                      <select
                        id="payment_terms"
                        value={formData.payment_terms}
                        onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="0">Immediate</option>
                        <option value="7">Net 7</option>
                        <option value="15">Net 15</option>
                        <option value="30">Net 30</option>
                        <option value="45">Net 45</option>
                        <option value="60">Net 60</option>
                        <option value="90">Net 90</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 border border-border mt-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <span className="text-accent">i</span>
                      Tax Information Note
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>PAN is mandatory for vendors with transactions above ₹2 lakhs</li>
                      <li>GSTIN is required for claiming input tax credit</li>
                      <li>Ensure tax details are verified before processing payments</li>
                    </ul>
                  </div>
                </TabsContent>

                {/* Bank Details Tab */}
                <TabsContent value="bank" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="account_holder_name">Account Holder Name</Label>
                      <Input
                        id="account_holder_name"
                        value={formData.account_holder_name}
                        onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                        placeholder="As per bank records"
                      />
                    </div>

                    <div>
                      <Label htmlFor="account_number">Account Number</Label>
                      <Input
                        id="account_number"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        placeholder="1234567890"
                      />
                    </div>

                    <div>
                      <Label htmlFor="ifsc_code">IFSC Code</Label>
                      <Input
                        id="ifsc_code"
                        value={formData.ifsc_code}
                        onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                        placeholder="ICIC0001234"
                        className="uppercase"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bank_name">Bank Name</Label>
                      <Input
                        id="bank_name"
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        placeholder="e.g., ICICI Bank"
                      />
                    </div>

                    <div>
                      <Label htmlFor="branch">Branch</Label>
                      <Input
                        id="branch"
                        value={formData.branch}
                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                        placeholder="e.g., Andheri West"
                      />
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-900 mt-4">
                    <h4 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">
                      Warning: Bank Details Security
                    </h4>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      To modify vendor's bank details, you need to delete and re-enter the information. This ensures payment security and prevents unauthorized changes.
                    </p>
                  </div>
                </TabsContent>

                {/* Additional Information Tab */}
                <TabsContent value="additional" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Add any additional notes or special instructions..."
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                    <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                      Vendor Management Tips
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                      <li>Keep vendor information up-to-date for smooth payment processing</li>
                      <li>Verify bank details before making first payment</li>
                      <li>Use categories to organize and filter vendors efficiently</li>
                      <li>Regular audits of vendor data ensure compliance</li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" data-testid="vendor-submit-button">
                  {editingVendor ? 'Update Vendor' : 'Create Vendor'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(vendor)}
                      data-testid={`edit-vendor-${vendor.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(vendor.id)}
                      data-testid={`delete-vendor-${vendor.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
    </div>
  );
};

