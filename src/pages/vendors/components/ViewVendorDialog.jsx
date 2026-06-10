import React, { useEffect, useState } from 'react';
import { FileText, History } from 'lucide-react';
import { toast } from 'sonner';
import { formatWorkflowStatus } from '../../../utils/approvalWorkflow';
import { formatMsmeLabel } from '../../../utils/vendorValidation';
import { useLazyGetVendorHistoryQuery } from '../../../Services/apis/invoicesVendorsApi';
import ApprovalHistoryTimeline from '../../../components/common/ApprovalHistoryTimeline';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';

const VendorDetailsTab = ({ vendor }) => (
  <div className="space-y-6 text-sm">
    <div>
      <h3 className="font-semibold mb-3">Basic Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><p className="text-muted-foreground">Name</p><p className="font-medium">{vendor.name || '-'}</p></div>
        <div><p className="text-muted-foreground">Type</p><p className="font-medium">{vendor.vendor_type || 'Company'}</p></div>
        <div><p className="text-muted-foreground">Status</p><p className="font-medium">{formatWorkflowStatus(vendor.status) || 'Pending Approval'}</p></div>
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
        <div><p className="text-muted-foreground">PAN</p><p className="font-medium  ">{vendor.pan || '-'}</p></div>
        <div><p className="text-muted-foreground">GSTIN</p><p className="font-medium  ">{vendor.gstin || '-'}</p></div>
        <div><p className="text-muted-foreground">MSME</p><p className="font-medium">{formatMsmeLabel(vendor.msme)}</p></div>
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
        <div><p className="text-muted-foreground">Account Number</p><p className="font-medium  ">{vendor.account_number || '-'}</p></div>
        <div><p className="text-muted-foreground">IFSC</p><p className="font-medium  ">{vendor.ifsc_code || '-'}</p></div>
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
);

const ViewVendorDialog = ({ open, onOpenChange, vendor, canApprove, isPendingApproval, onApproveAction }) => {
  const [viewTab, setViewTab] = useState('details');
  const [vendorHistory, setVendorHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [triggerVendorHistory] = useLazyGetVendorHistoryQuery();

  useEffect(() => {
    if (!open || !vendor?.id) {
      setViewTab('details');
      setVendorHistory([]);
      return undefined;
    }

    let cancelled = false;
    setLoadingHistory(true);
    setVendorHistory([]);

    triggerVendorHistory(vendor.id)
      .unwrap()
      .then((response) => {
        if (!cancelled) {
          setVendorHistory(Array.isArray(response) ? response : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Failed to load vendor history');
          setVendorHistory([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, vendor?.id, triggerVendorHistory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{vendor?.name ? `Vendor: ${vendor.name}` : 'Vendor Details'}</DialogTitle>
          <DialogDescription>
            Review vendor information and approval history.
          </DialogDescription>
        </DialogHeader>

        {vendor && (
          <Tabs value={viewTab} onValueChange={setViewTab} className="flex-1 min-h-0 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">
                <FileText className="h-4 w-4 mr-2" />
                Details
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                History ({vendorHistory.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 flex-1 overflow-y-auto scrollbar-thin-muted">
              <VendorDetailsTab vendor={vendor} />
            </TabsContent>

            <TabsContent value="history" className="mt-4 flex-1 overflow-y-auto scrollbar-thin-muted">
              <ApprovalHistoryTimeline
                history={vendorHistory}
                loading={loadingHistory}
                emptyMessage="No vendor history records found"
              />
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="flex justify-between items-center w-full gap-2 sm:justify-between">
          <div className="flex gap-2">
            {canApprove && isPendingApproval && vendor && (
              <>
                <Button
                  variant="outline"
                  className="border-amber-200 hover:bg-amber-50 text-amber-700 h-9"
                  onClick={() => onApproveAction(vendor, 'Needs Correction')}
                >
                  Needs Correction
                </Button>
                <Button
                  variant="destructive"
                  className="h-9"
                  onClick={() => onApproveAction(vendor, 'Rejected')}
                >
                  Reject
                </Button>
                <Button
                  className="bg-button-primary hover:bg-button-primary-hover text-button-primary-foreground h-9 font-medium"
                  onClick={() => onApproveAction(vendor, 'Approved')}
                >
                  Approve
                </Button>
              </>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewVendorDialog;
