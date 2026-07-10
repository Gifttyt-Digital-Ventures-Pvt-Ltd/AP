import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck,
  Loader2,
  RotateCcw,
  Save,
  Truck,
  XCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import GrnStatusBadge from './GrnStatusBadge';
import GrnSourceBadge from './GrnSourceBadge';
import GrnCreateFormFields from './GrnCreateFormFields';
import { GRN_SOURCE, GRN_STATUS } from '../constants';
import { formatCurrency, formatDate } from '../utils';

const toDateInputValue = (value) => {
  if (!value) return '';
  return String(value).split('T')[0];
};

const createEditableGrnForm = (grn = {}, formatConfig = {}) => {
  const source = grn || {};
  return {
    ...source,
    source_type: source.source_type || source.sourceType || GRN_SOURCE.STANDALONE,
    grn_format_id: source.grn_format_id || source.grnFormatId || formatConfig?.id || '',
    vendor_id: source.vendor_id || source.vendorId || '',
    vendor_name: source.vendor_name || source.vendorName || '',
    po_id: source.po_id || source.poId || '',
    po_number: source.po_number || source.poNumber || '',
    receipt_date: toDateInputValue(source.receipt_date || source.receiptDate),
    received_at_location: source.received_at_location || source.receivedAtLocation || '',
    delivery_note_number:
      source.delivery_note_number || source.deliveryNoteNumber || source.delivery_challan_no || '',
    delivery_challan_no:
      source.delivery_challan_no || source.deliveryChallanNo || source.delivery_note_number || '',
    eway_bill_no: source.eway_bill_no || source.ewayBillNo || '',
    transporter_name: source.transporter_name || source.transporterName || '',
    vehicle_number: source.vehicle_number || source.vehicleNumber || '',
    lr_number: source.lr_number || source.lrNumber || '',
    received_by: source.received_by || source.receivedBy || '',
    remarks: source.remarks || '',
    line_items: source.line_items || source.lineItems || [],
  };
};

const GrnDetailDialog = ({
  grn,
  open,
  onOpenChange,
  formatConfig,
  vendors = [],
  initialEditMode = false,
  canApprove = false,
  canPost = false,
  posting = false,
  saving = false,
  onOpenReview,
  onPost,
  onSaveDraft,
  onSaveAndSubmit,
  onDownloadPdf,
  downloadingPdf = false,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [draftForm, setDraftForm] = useState(() => createEditableGrnForm(grn, formatConfig));

  useEffect(() => {
    if (!open || !grn) return;
    setEditMode(Boolean(initialEditMode));
    setDraftForm(createEditableGrnForm(grn, formatConfig));
  }, [formatConfig, grn, initialEditMode, open]);

  const isEditable = [GRN_STATUS.DRAFT, GRN_STATUS.SENT_BACK].includes(grn?.status);
  const isPoLinked = draftForm.source_type === GRN_SOURCE.PO || Boolean(draftForm.po_id);
  const canEditVendor = isEditable && !isPoLinked;
  const submitLabel = formatConfig?.approval_enabled ? 'Submit for Approval' : 'Post GRN';
  const draftChanged = useMemo(
    () =>
      JSON.stringify(draftForm || {}) !==
      JSON.stringify(createEditableGrnForm(grn, formatConfig)),
    [draftForm, formatConfig, grn],
  );

  if (!grn) return null;

  const handleSaveDraft = () => {
    onSaveDraft?.(draftForm);
  };

  const handleSaveAndSubmit = () => {
    onSaveAndSubmit?.(draftForm);
  };

  const handleSubmit = () => {
    if (editMode && draftChanged) {
      handleSaveAndSubmit();
      return;
    }
    onPost?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] w-[96vw] max-w-4xl flex-col overflow-hidden p-0"
        data-testid="grn-detail-dialog"
      >
        <DialogHeader className="border-b px-6 pb-3 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            {grn.grn_number || 'Goods Receipt'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {grn.vendor_name || '—'} · {formatDate(grn.receipt_date)}
          </p>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="flex flex-wrap gap-2">
            <GrnStatusBadge status={grn.status} />
            <GrnSourceBadge source={grn.source_type} />
            {grn.po_number && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {grn.po_number}
              </span>
            )}
          </div>

          {grn.status === GRN_STATUS.PENDING_APPROVAL && canApprove && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="py-3">
                <CardTitle className="text-sm text-amber-900">Pending your approval</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <Button onClick={() => onOpenReview?.(grn)} data-testid="review-grn-btn">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Review GRN
                </Button>
              </CardContent>
            </Card>
          )}

          {grn.status === GRN_STATUS.SENT_BACK && (grn.send_back_reason || grn.reject_reason) && (
            <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Sent back for revision</p>
                <p>{grn.send_back_reason || grn.reject_reason}</p>
              </div>
            </div>
          )}

          {grn.status === GRN_STATUS.REJECTED && grn.reject_reason && (
            <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950/30">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Rejection reason</p>
                <p>{grn.reject_reason}</p>
              </div>
            </div>
          )}

          {!editMode && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Header</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Vendor</p>
                  <p className="font-medium">{grn.vendor_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Receipt Date</p>
                  <p className="font-medium">{formatDate(grn.receipt_date)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Received By</p>
                  <p className="font-medium">{grn.received_by_name || grn.received_by || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Total Received Value</p>
                  <p className="font-medium">{formatCurrency(grn.total_received_value)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {!editMode && (grn.delivery_note_number || grn.transporter_name || grn.vehicle_number) && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Delivery Note</p>
                  <p>{grn.delivery_note_number || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Transporter</p>
                  <p>{grn.transporter_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p>{grn.vehicle_number || '—'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {isEditable && !editMode && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
              <p className="text-sm text-blue-900">
                Use the Edit action from the table to revise this GRN before submitting.
              </p>
            </div>
          )}

          {editMode ? (
            <Card>
              <CardHeader className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm">Edit GRN Details</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDraftForm(createEditableGrnForm(grn, formatConfig));
                        setEditMode(false);
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveDraft}
                      disabled={saving || !draftChanged}
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save GRN
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {canEditVendor ? (
                  <div className="space-y-2">
                    <Label>Vendor *</Label>
                    <Select
                      value={draftForm.vendor_id ? String(draftForm.vendor_id) : ''}
                      onValueChange={(vendorId) => {
                        const vendor = vendors.find((item) => String(item.id) === String(vendorId));
                        setDraftForm((current) => ({
                          ...current,
                          vendor_id: vendorId,
                          vendor_name: vendor?.name ?? vendor?.vendor_name ?? '',
                        }));
                      }}
                    >
                      <SelectTrigger className="h-9 bg-white/80" data-testid="grn-detail-vendor-select">
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={String(vendor.id)}>
                            {vendor.name ?? vendor.vendor_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs uppercase text-muted-foreground">Vendor</p>
                    <p className="font-medium">{grn.vendor_name || draftForm.vendor_name || '—'}</p>
                    {isPoLinked && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Vendor is locked because this GRN is linked to a PO.
                      </p>
                    )}
                  </div>
                )}

                <GrnCreateFormFields
                  form={draftForm}
                  setForm={setDraftForm}
                  formatConfig={formatConfig}
                  selectedPo={null}
                  poLinked={isPoLinked}
                />
              </CardContent>
            </Card>
          ) : (
            <div>
              <Label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Line Items ({grn.line_items?.length || 0})
              </Label>
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Accepted</TableHead>
                      <TableHead>Rejected</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grn.line_items?.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>{item.line_number ?? index + 1}</TableCell>
                        <TableCell>{item.item_description || '—'}</TableCell>
                        <TableCell>{item.received_quantity}</TableCell>
                        <TableCell className="text-green-600">{item.accepted_quantity}</TableCell>
                        <TableCell className="text-red-600">
                          {item.rejected_quantity}
                          {item.rejection_reason && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({item.rejection_reason})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(item.line_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {!editMode && grn.remarks && (
            <div>
              <Label className="text-sm text-muted-foreground">Remarks</Label>
              <p className="mt-1 text-sm">{grn.remarks}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t px-6 py-4 sm:justify-between">
          <Button variant="outline" onClick={onDownloadPdf} disabled={downloadingPdf}>
            {downloadingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {downloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {isEditable && canPost && (
              <Button onClick={handleSubmit} disabled={posting || saving} data-testid="post-grn-btn">
                {(posting || saving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <FileCheck className="mr-2 h-4 w-4" />
                {submitLabel}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GrnDetailDialog;
