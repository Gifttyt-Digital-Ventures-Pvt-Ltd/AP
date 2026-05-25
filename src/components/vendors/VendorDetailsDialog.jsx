import React from 'react';
import { Building2, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const VendorDetailsDialog = ({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  title = 'Create Vendor',
  description = 'Add contact details and payment info of your vendor in OptiFii',
  submitLabel = 'Save Vendor',
  submitting = false,
  requireEmail = true,
  requireGstin = false,
  testId = 'vendor-dialog',
}) => {
  if (!formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="tax">Tax Info</TabsTrigger>
              <TabsTrigger value="bank">Bank Details</TabsTrigger>
              <TabsTrigger value="additional">Additional</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Vendor Type *</Label>
                  <div className="flex gap-4 mt-2">
                    {['Company', 'Individual'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, vendor_type: type }))}
                        className={`flex-1 p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                          formData.vendor_type === type
                            ? 'border-accent bg-accent/10'
                            : 'border-border hover:border-accent/50'
                        }`}
                      >
                        {type === 'Company' ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                        <span className="font-medium">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <Label>{formData.vendor_type === 'Company' ? 'Company Name' : 'Full Name'} *</Label>
                  <Input
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder={formData.vendor_type === 'Company' ? 'e.g., Acme Corporation' : 'e.g., John Doe'}
                    data-testid="vendor-name-input"
                    required
                  />
                </div>

                <div>
                  <Label>Email{requireEmail ? ' *' : ''}</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="vendor@example.com"
                    data-testid="vendor-email-input"
                    required={requireEmail}
                  />
                </div>

                <div>
                  <Label>Mobile Number</Label>
                  <Input
                    value={formData.mobile}
                    onChange={(event) => setFormData((prev) => ({ ...prev, mobile: event.target.value }))}
                    placeholder="+91 98765 43210"
                    data-testid="vendor-mobile-input"
                  />
                </div>

                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={formData.phone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="+91 22 1234 5678"
                    data-testid="vendor-phone-input"
                  />
                </div>

                <div>
                  <Label>Contact Person</Label>
                  <Input
                    value={formData.contact_person}
                    onChange={(event) => setFormData((prev) => ({ ...prev, contact_person: event.target.value }))}
                    placeholder="e.g., Rahul Sharma"
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <select
                    value={formData.category}
                    onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
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
                  <Label>Website</Label>
                  <Input
                    value={formData.website}
                    onChange={(event) => setFormData((prev) => ({ ...prev, website: event.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <Label>Currency</Label>
                  <select
                    value={formData.currency}
                    onChange={(event) => setFormData((prev) => ({ ...prev, currency: event.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <Label>Address Line 1</Label>
                  <Input
                    value={formData.address_line1}
                    onChange={(event) => setFormData((prev) => ({ ...prev, address_line1: event.target.value }))}
                    placeholder="Building/Street address"
                  />
                </div>

                <div className="col-span-2">
                  <Label>Address Line 2</Label>
                  <Input
                    value={formData.address_line2}
                    onChange={(event) => setFormData((prev) => ({ ...prev, address_line2: event.target.value }))}
                    placeholder="Apartment, suite, etc."
                  />
                </div>

                <div>
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(event) => setFormData((prev) => ({ ...prev, city: event.target.value }))}
                    placeholder="e.g., Mumbai"
                  />
                </div>

                <div>
                  <Label>State</Label>
                  <Input
                    value={formData.state}
                    onChange={(event) => setFormData((prev) => ({ ...prev, state: event.target.value }))}
                    placeholder="e.g., Maharashtra"
                  />
                </div>

                <div>
                  <Label>Pincode</Label>
                  <Input
                    value={formData.pincode}
                    onChange={(event) => setFormData((prev) => ({ ...prev, pincode: event.target.value }))}
                    placeholder="e.g., 400001"
                  />
                </div>

                <div>
                  <Label>Country</Label>
                  <Input
                    value={formData.country}
                    onChange={(event) => setFormData((prev) => ({ ...prev, country: event.target.value }))}
                    placeholder="India"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tax" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>PAN Number</Label>
                  <Input
                    value={formData.pan}
                    onChange={(event) => setFormData((prev) => ({ ...prev, pan: event.target.value.toUpperCase() }))}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    10-digit alphanumeric PAN number
                  </p>
                </div>

                <div>
                  <Label>GSTIN{requireGstin ? ' *' : ''}</Label>
                  <Input
                    value={formData.gstin}
                    onChange={(event) => setFormData((prev) => ({ ...prev, gstin: event.target.value.toUpperCase() }))}
                    placeholder="29ABCDE1234F1Z5"
                    maxLength={15}
                    className="uppercase"
                    required={requireGstin}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    15-digit GST Identification Number
                  </p>
                </div>

                <div>
                  <Label>Payment Terms (Days)</Label>
                  <select
                    value={formData.payment_terms}
                    onChange={(event) => setFormData((prev) => ({ ...prev, payment_terms: event.target.value }))}
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
            </TabsContent>

            <TabsContent value="bank" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Account Holder Name</Label>
                  <Input
                    value={formData.account_holder_name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, account_holder_name: event.target.value }))}
                    placeholder="As per bank records"
                  />
                </div>

                <div>
                  <Label>Account Number</Label>
                  <Input
                    value={formData.account_number}
                    onChange={(event) => setFormData((prev) => ({ ...prev, account_number: event.target.value }))}
                    placeholder="1234567890"
                  />
                </div>

                <div>
                  <Label>IFSC Code</Label>
                  <Input
                    value={formData.ifsc_code}
                    onChange={(event) => setFormData((prev) => ({ ...prev, ifsc_code: event.target.value.toUpperCase() }))}
                    placeholder="ICIC0001234"
                    className="uppercase"
                  />
                </div>

                <div>
                  <Label>Bank Name</Label>
                  <Input
                    value={formData.bank_name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, bank_name: event.target.value }))}
                    placeholder="e.g., ICICI Bank"
                  />
                </div>

                <div>
                  <Label>Branch</Label>
                  <Input
                    value={formData.branch}
                    onChange={(event) => setFormData((prev) => ({ ...prev, branch: event.target.value }))}
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

            <TabsContent value="additional" className="space-y-4 mt-4">
              <div>
                <Label>Notes</Label>
                <textarea
                  value={formData.notes}
                  onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Add any additional notes or special instructions..."
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" data-testid="vendor-submit-button" disabled={submitting}>
              {submitting ? 'Saving...' : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VendorDetailsDialog;
