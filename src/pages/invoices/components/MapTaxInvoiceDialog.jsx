import React from 'react';
import { Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';

/** Map tax invoice to PI — upload new invoice only (no link-existing). */
const MapTaxInvoiceDialog = ({
  open,
  onOpenChange,
  piInvoice,
  onUploadNew,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md" data-testid="map-tax-invoice-dialog">
      <DialogHeader>
        <DialogTitle>Upload tax invoice</DialogTitle>
        <DialogDescription>
          Upload a new tax invoice to link to{' '}
          <strong>{piInvoice?.invoiceNumber || 'this proforma invoice'}</strong>. Only new
          uploads are supported — existing invoices cannot be linked.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <Upload className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Scan or upload a tax invoice</p>
            <p className="text-muted-foreground">
              The uploaded invoice will be linked to{' '}
              <strong>{piInvoice?.invoiceNumber || 'this PI'}</strong> and routed through
              maker-checker approval. After checker approval, it becomes{' '}
              <strong>Approved</strong> or <strong>Pending Payment</strong> if payments are
              enabled.
            </p>
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        <Button
          type="button"
          onClick={() => {
            onUploadNew?.(piInvoice);
            onOpenChange(false);
          }}
          data-testid="map-tax-invoice-upload-confirm"
        >
          Continue to upload
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default MapTaxInvoiceDialog;
