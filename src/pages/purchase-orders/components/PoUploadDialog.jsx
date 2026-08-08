import React, { useEffect, useRef, useState } from 'react';
import * as XLSX from '@e965/xlsx';
import { Download, Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import AppSelect from '../../../components/common/AppSelect';
import MeteredActionCostHint from '../../../components/credits/MeteredActionCostHint';
import { CREDIT_ACTION_CODES } from '../../../constants/creditActions';
import { useRBAC } from '../../../contexts/RBACContext';
import { useMeteredActionEstimate } from '../../../hooks/useMeteredActionEstimate';

export const PO_REFERENCE_DOCUMENT_TYPES = [
  {
    value: 'PI',
    label: 'Proforma Invoice (PI)',
  },
  {
    value: 'CUSTOMER_PO',
    label: 'Purchase Order (PO)',
  },
  {
    value: 'LOI',
    label: 'Letter of Intent (LOI)',
  },
  {
    value: 'EXCEL',
    label: 'Excel',
  },
];

const PO_EXCEL_LINE_ITEM_HEADERS = [
  'Line item No.',
  'Item Code',
  'Description',
  'HSN/SAC Code',
  'UoM',
  'Order Qty',
  'Rate/Unit',
  'Freight/Unit',
  'Discount (%)',
  'CGST (%)',
  'SGST (%)',
  'IGST (%)',
  'Total Amount',
  'Taxable Amount',
];

const PO_EXCEL_TEMPLATE_ROWS = [
  ['Vendor Details'],
  ['Vendor Name', ''],
  ['Vendor Address', ''],
  ['City', ''],
  ['State', ''],
  ['Country', 'India'],
  ['Contact Person', ''],
  ['Phone Number', ''],
  ['Email ID', ''],
  ['GSTIN', ''],
  ['PAN Number', ''],
  [],
  ['Bill To'],
  ['Bill to', ''],
  [],
  ['Ship To'],
  ['Shipping Address', ''],
  [],
  ['Order Details'],
  ['Order Type', ''],
  ['Order Number', ''],
  ['Reference Document No.', ''],
  ['Order Status', ''],
  ['Date of Approval', ''],
  ['Purchase Requisition Number', ''],
  ['Date of PR', ''],
  ['CAS no. & date', ''],
  ['PO Type', ''],
  ['Delivery Date', ''],
  ['Currency', 'INR'],
  [],
  PO_EXCEL_LINE_ITEM_HEADERS,
  [1, '', '', '', '', '', '', '', '', '', '', '', '', ''],
  [2, '', '', '', '', '', '', '', '', '', '', '', '', ''],
  [3, '', '', '', '', '', '', '', '', '', '', '', '', ''],
  [4, '', '', '', '', '', '', '', '', '', '', '', '', ''],
  [5, '', '', '', '', '', '', '', '', '', '', '', '', ''],
  [],
  ['Terms and Conditions'],
  ['Payment Terms', ''],
  ['Delivery Terms', ''],
  ['Freight Charges', ''],
  ['Packing Charges', ''],
  ['Forwarding Charges', ''],
  ['Unloading at Sandhar', ''],
  ['Transit Insurance', ''],
  ['Mode of Shipment', ''],
  ['Installation & commissioning', ''],
  ['Training', ''],
  ['Despatch Through', ''],
  ['WARRANTY', ''],
  ['Special Instructions', ''],
];

const PO_EXCEL_GUIDE_ROWS = [
  ['Field', 'Guidance'],
  ['Vendor Name', 'Required. Vendor name as per the customer reference document.'],
  ['Vendor Address', 'Optional but recommended. Full supplier/vendor address.'],
  ['GSTIN', 'Optional. Used to match the vendor GST registration when available.'],
  ['PAN Number', 'Optional. Used as vendor PAN when available.'],
  ['Bill to', 'Optional. Buyer billing address.'],
  ['Shipping Address', 'Optional. Delivery/shipping address.'],
  ['Order Number', 'Required when available in the source document.'],
  ['Reference Document No.', 'Optional. PI, customer PO, LOI, or Excel source document number.'],
  ['Delivery Date', 'Optional. Use DD-MM-YYYY or YYYY-MM-DD.'],
  ['Currency', 'Optional. Defaults to INR when blank.'],
  ['Line item No.', 'Required for each line item row. Use sequential numbers.'],
  ['Description', 'Required for each line item row.'],
  ['Order Qty', 'Required for each line item row. Numeric only.'],
  ['Rate/Unit', 'Required for each line item row. Numeric only.'],
  ['Discount (%)', 'Optional. Numeric percentage.'],
  ['CGST (%) / SGST (%)', 'Use for intra-state GST split. Example: 9 and 9 for 18% GST.'],
  ['IGST (%)', 'Use for inter-state GST. Example: 18. Do not combine with CGST/SGST on the same row.'],
  ['Total Amount', 'Optional. Backend may recalculate from qty/rate/tax when blank.'],
  ['Taxable Amount', 'Optional. Backend may recalculate when blank.'],
  ['Guide sheet', 'Informational only. Backend should parse Sheet1.'],
];

const downloadPoExcelTemplate = () => {
  const workbook = XLSX.utils.book_new();
  const detailsSheet = XLSX.utils.aoa_to_sheet(PO_EXCEL_TEMPLATE_ROWS);
  detailsSheet['!cols'] = [
    { wch: 26 },
    { wch: 26 },
    { wch: 36 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
  ];

  const guideSheet = XLSX.utils.aoa_to_sheet(PO_EXCEL_GUIDE_ROWS);
  guideSheet['!cols'] = [{ wch: 28 }, { wch: 92 }];

  XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Sheet1');
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Guide');

  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'PO_Upload_Format.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const PoUploadDialog = ({
  open,
  onOpenChange,
  onFileSelected,
  disabled = false,
}) => {
  const { isTokenBasedSubscription } = useRBAC();
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [referenceDocumentType, setReferenceDocumentType] = useState('PI');
  const estimate = useMeteredActionEstimate(CREDIT_ACTION_CODES.PO_UPLOAD, pendingFile ? 1 : 0);

  useEffect(() => {
    if (!open) {
      setPendingFile(null);
      setIsDragging(false);
      setReferenceDocumentType('PI');
    }
  }, [open]);

  const uploadFile = async (file) => {
    const shouldClose = await onFileSelected(file, { referenceDocumentType });
    if (shouldClose !== false) {
      setPendingFile(null);
      onOpenChange(false);
    }
  };

  const handleFile = async (fileList) => {
    const file = Array.from(fileList || []).filter(Boolean)[0];
    if (disabled || !file) return;

    if (!isTokenBasedSubscription) {
      await uploadFile(file);
      return;
    }

    setPendingFile(file);
  };

  const handleConfirmUpload = async () => {
    if (disabled || !pendingFile || estimate.isDisabled) return;
    await uploadFile(pendingFile);
  };

  const openFilePicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer?.files);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        data-testid="po-upload-dialog"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Upload Purchase Order</DialogTitle>
          <DialogDescription>
            Upload a customer reference document. Backend will extract PO draft data for review before save.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/20 p-5">
          <div className="mb-4 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Reference Document Type
            </label>
            <AppSelect
              value={referenceDocumentType}
              onChange={(event) => setReferenceDocumentType(event.target.value)}
              options={PO_REFERENCE_DOCUMENT_TYPES}
              className="h-9 bg-background text-sm"
              data-testid="po-reference-document-type-select"
            />
            {referenceDocumentType === 'EXCEL' ? (
              <div className="mt-3 flex flex-col gap-2 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="mb-0 text-xs text-muted-foreground">
                  Download the template, fill Sheet1, and keep the Guide sheet for field help.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-center sm:w-auto"
                  onClick={downloadPoExcelTemplate}
                  data-testid="download-po-excel-template-btn"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download template
                </Button>
              </div>
            ) : null}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={referenceDocumentType === 'EXCEL' ? '.xls,.xlsx,.csv' : 'image/*,.pdf'}
            className="hidden"
            onChange={(event) => {
              handleFile(event.target.files);
              event.target.value = '';
            }}
          />

          {!pendingFile ? (
            <div
              role="button"
              tabIndex={disabled ? -1 : 0}
              data-testid="po-upload-dropzone"
              aria-label="Upload purchase order file"
              onClick={openFilePicker}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openFilePicker();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (!disabled) setIsDragging(true);
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                if (!disabled) setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed px-4 py-10 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-[#6311CB] bg-[#3725EA26]'
              } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
            >
              <Upload className="h-8 w-8 text-primary" />
              <p className="mb-0 text-lg font-medium text-primary">Upload purchase order</p>
              <p className="mb-0 text-sm text-muted-foreground">
                Click to upload or drag and drop the selected reference document
              </p>
              <p className="mb-0 text-xs text-muted-foreground">
                {referenceDocumentType === 'EXCEL'
                  ? 'XLS, XLSX, and CSV formats are supported'
                  : 'PDF, PNG, and JPG formats are supported'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border bg-background p-4">
                <p className="text-sm font-medium text-primary-text">Selected file</p>
                <p className="mt-2 text-sm text-muted-foreground">{pendingFile.name}</p>
              </div>
              <MeteredActionCostHint actionCode={CREDIT_ACTION_CODES.PO_UPLOAD} unitCount={1} />
              <Button type="button" variant="outline" onClick={() => setPendingFile(null)}>
                Choose a different file
              </Button>
            </div>
          )}

          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-3.5 w-3.5" />
            Cancel upload
          </button>
        </div>

        {pendingFile ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={disabled || estimate.isDisabled || estimate.loading}
              data-testid="po-upload-confirm-button"
            >
              Scan PO
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default PoUploadDialog;
