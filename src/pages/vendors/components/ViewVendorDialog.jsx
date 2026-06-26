import React, { useEffect, useState } from 'react';
import { CalendarDays, FileText, History } from 'lucide-react';
import { toast } from 'sonner';
import { formatWorkflowStatus } from '../../../utils/approvalWorkflow';
import { formatMsmeLabel } from '../../../utils/vendorValidation';
import { useLazyGetVendorHistoryQuery } from '../../../Services/apis/invoicesVendorsApi';
import ApprovalHistoryTimeline from '../../../components/common/ApprovalHistoryTimeline';
import VendorReturnPreferenceBlock from '../../../components/vendors/VendorReturnPreferenceBlock';
import VendorGstRegistrationsPanel, {
  getFirstVendorGstin,
  getVendorGstRegistrations,
  getVendorRegistrationStates,
} from './VendorGstRegistrationsPanel';
import VendorMultiGstBadge from './VendorMultiGstBadge';
import VendorDocumentsPanel from './VendorDocumentsPanel';
import VendorTdsPanel from './VendorTdsPanel';
import { useRBAC } from '../../../contexts/RBACContext';
import {
  getVisibleVendorDocumentTypes,
  hasVisibleVendorDocuments,
} from '../../../utils/vendorDocumentConfig';
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

const VendorDetailsTab = ({ vendor }) => {
  const { corporateScreens } = useRBAC();
  const activeVendorDocuments = corporateScreens?.activeVendorDocuments;
  const vendorDocumentConfiguration = corporateScreens?.vendorDocumentConfiguration ?? [];
  const visibleVendorDocumentTypes = getVisibleVendorDocumentTypes(
    activeVendorDocuments,
    vendorDocumentConfiguration,
  );
  const showVendorDocumentsSection = hasVisibleVendorDocuments(
    activeVendorDocuments,
    vendorDocumentConfiguration,
  );
  const registrations = getVendorGstRegistrations(vendor);
  const registrationStates = getVendorRegistrationStates(vendor);

  return (
  <div className="space-y-6 text-sm">
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">{vendor.name || '-'}</h3>
          {vendor.trade_name || vendor.tradeName ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Trade name: <span className="font-medium text-foreground">{vendor.trade_name || vendor.tradeName}</span>
            </p>
          ) : null}
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            PAN: {vendor.pan || '-'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium">
              {formatWorkflowStatus(vendor.status) || 'Pending Approval'}
            </span>
            {registrations.length > 0 ? (
              <VendorMultiGstBadge count={registrations.length} states={registrationStates} />
            ) : null}
          </div>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:min-w-44">
          <div><span className="font-medium text-foreground">Type:</span> {vendor.vendor_type || 'Company'}</div>
          <div><span className="font-medium text-foreground">Category:</span> {vendor.category || '-'}</div>
          {registrationStates.length > 0 ? (
            <div><span className="font-medium text-foreground">States:</span> {registrationStates.join(', ')}</div>
          ) : null}
        </div>
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
        <div><p className="text-muted-foreground">PAN</p><p className="font-medium font-mono">{vendor.pan || '-'}</p></div>
        <div><p className="text-muted-foreground">Primary GSTIN</p><p className="font-medium font-mono">{getFirstVendorGstin(vendor) || '-'}</p></div>
        <div><p className="text-muted-foreground">MSME</p><p className="font-medium">{formatMsmeLabel(vendor.msme)}</p></div>
      </div>
      <div className="mt-4">
        <p className="text-muted-foreground mb-2">TDS</p>
        <VendorTdsPanel tdsMapping={vendor.tdsMapping ?? vendor.tdsMappings} readOnly />
      </div>
    </div>

    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">GSTIN Details</h3>
        <span className="text-xs text-muted-foreground">
          {registrations.length} GSTIN{registrations.length === 1 ? '' : 's'}
          {registrationStates.length > 0 ? ` · ${registrationStates.length} state${registrationStates.length === 1 ? '' : 's'}` : ''}
        </span>
      </div>
      <VendorGstRegistrationsPanel vendor={vendor} />
    </div>

    {showVendorDocumentsSection ? (
      <div>
        <h3 className="font-semibold mb-3">Vendor Documents</h3>
        <VendorDocumentsPanel
          documents={vendor.documents}
          readOnly
          visibleDocumentTypes={visibleVendorDocumentTypes}
        />
      </div>
    ) : null}

    <div>
      <h3 className="font-semibold mb-3">Additional Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><p className="text-muted-foreground">Currency</p><p className="font-medium">{vendor.currency || '-'}</p></div>
        <div className="md:col-span-2"><p className="text-muted-foreground">Notes</p><p className="font-medium whitespace-pre-wrap">{vendor.notes || '-'}</p></div>
      </div>
    </div>
  </div>
  );
};

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
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{vendor?.name ? `Vendor: ${vendor.name}` : 'Vendor Details'}</DialogTitle>
          <DialogDescription>
            Review vendor information and approval history.
          </DialogDescription>
        </DialogHeader>

        {vendor && (
          <Tabs value={viewTab} onValueChange={setViewTab} className="flex-1 min-h-0 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">
                <FileText className="h-4 w-4 mr-2" />
                Details
              </TabsTrigger>
              <TabsTrigger value="gst-preference">
                <CalendarDays className="h-4 w-4 mr-2" />
                GST Preference
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                History ({vendorHistory.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 flex-1 overflow-y-auto scrollbar-thin-muted">
              <VendorDetailsTab vendor={vendor} />
            </TabsContent>

            <TabsContent value="gst-preference" className="mt-4 flex-1 overflow-y-auto scrollbar-thin-muted">
              <VendorReturnPreferenceBlock
                gstin={getFirstVendorGstin(vendor)}
                vendorName={vendor.name}
              />
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
