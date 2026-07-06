import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck,
  Loader2,
  RotateCcw,
  Truck,
  XCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../../../components/ui/sheet';
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
import GrnLineItemsEditor from './GrnLineItemsEditor';
import { GRN_STATUS } from '../constants';
import { formatCurrency, formatDate } from '../utils';

const GrnDetailSheet = ({
  grn,
  open,
  onOpenChange,
  formatConfig,
  canApprove = false,
  canPost = false,
  posting = false,
  onOpenReview,
  onPost,
  onDownloadPdf,
}) => {
  if (!grn) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-2xl lg:max-w-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            {grn.grn_number}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {grn.vendor_name} · {formatDate(grn.receipt_date)}
          </p>
        </SheetHeader>

        <div className="flex-1 space-y-4 py-4">
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

          {(grn.delivery_note_number || grn.transporter_name || grn.vehicle_number) && (
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

          <div>
            <Label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Line Items ({grn.line_items?.length || 0})
            </Label>
            {grn.status === GRN_STATUS.DRAFT ? (
              <GrnLineItemsEditor
                lines={grn.line_items}
                onChange={() => {}}
                qcEnabled={formatConfig?.qc_enabled}
                poLinked={Boolean(grn.po_id)}
                formatConfig={formatConfig}
                readOnly
              />
            ) : (
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
            )}
          </div>

          {grn.remarks && (
            <div>
              <Label className="text-sm text-muted-foreground">Remarks</Label>
              <p className="mt-1 text-sm">{grn.remarks}</p>
            </div>
          )}
        </div>

        <SheetFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={onDownloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {grn.status === GRN_STATUS.DRAFT && canPost && (
              <Button onClick={onPost} disabled={posting} data-testid="post-grn-btn">
                {posting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <FileCheck className="mr-2 h-4 w-4" />
                Post GRN
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default GrnDetailSheet;
