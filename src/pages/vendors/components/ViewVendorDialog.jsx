import React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';

const ViewVendorDialog = ({ open, onOpenChange, vendor }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Vendor Details</DialogTitle>
        <DialogDescription>
          Review the selected vendor information.
        </DialogDescription>
      </DialogHeader>
      {vendor && (
        <div className="space-y-6 text-sm">
          <div>
            <h3 className="font-semibold mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-muted-foreground">Name</p><p className="font-medium">{vendor.name || '-'}</p></div>
              <div><p className="text-muted-foreground">Type</p><p className="font-medium">{vendor.vendor_type || 'Company'}</p></div>
              <div><p className="text-muted-foreground">Status</p><p className="font-medium">{vendor.status || 'Pending Approval'}</p></div>
              <div><p className="text-muted-foreground">Category</p><p className="font-medium">{vendor.category || '-'}</p></div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-muted-foreground">Email</p><p className="font-medium">{vendor.email || '-'}</p></div>
              <div><p className="text-muted-foreground">Mobile</p><p className="font-medium">{vendor.mobile || '-'}</p></div>
              <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{vendor.phone || '-'}</p></div>
              <div><p className="text-muted-foreground">Contact Person</p><p className="font-medium">{vendor.contact_person || '-'}</p></div>
              <div><p className="text-muted-foreground">Website</p><p className="font-medium">{vendor.website || '-'}</p></div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Tax Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-muted-foreground">PAN</p><p className="font-medium font-['JetBrains_Mono']">{vendor.pan || '-'}</p></div>
              <div><p className="text-muted-foreground">GSTIN</p><p className="font-medium font-['JetBrains_Mono']">{vendor.gstin || '-'}</p></div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-muted-foreground">Address Line 1</p><p className="font-medium">{vendor.address_line1 || '-'}</p></div>
              <div><p className="text-muted-foreground">Address Line 2</p><p className="font-medium">{vendor.address_line2 || '-'}</p></div>
              <div><p className="text-muted-foreground">City</p><p className="font-medium">{vendor.city || '-'}</p></div>
              <div><p className="text-muted-foreground">State</p><p className="font-medium">{vendor.state || '-'}</p></div>
              <div><p className="text-muted-foreground">Pincode</p><p className="font-medium">{vendor.pincode || '-'}</p></div>
              <div><p className="text-muted-foreground">Country</p><p className="font-medium">{vendor.country || '-'}</p></div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-muted-foreground">Bank Name</p><p className="font-medium">{vendor.bank_name || '-'}</p></div>
              <div><p className="text-muted-foreground">Account Holder Name</p><p className="font-medium">{vendor.account_holder_name || '-'}</p></div>
              <div><p className="text-muted-foreground">Account Number</p><p className="font-medium font-['JetBrains_Mono']">{vendor.account_number || '-'}</p></div>
              <div><p className="text-muted-foreground">IFSC</p><p className="font-medium font-['JetBrains_Mono']">{vendor.ifsc_code || '-'}</p></div>
              <div><p className="text-muted-foreground">Branch</p><p className="font-medium">{vendor.branch || '-'}</p></div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Additional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-muted-foreground">Currency</p><p className="font-medium">{vendor.currency || '-'}</p></div>
              <div className="md:col-span-2"><p className="text-muted-foreground">Notes</p><p className="font-medium whitespace-pre-wrap">{vendor.notes || '-'}</p></div>
            </div>
          </div>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default ViewVendorDialog;
