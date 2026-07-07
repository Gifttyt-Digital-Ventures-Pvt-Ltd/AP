import React from 'react';
import { Label } from '../../../components/ui/label';
import AppSelect from '../../../components/common/AppSelect';
import {
  DOCUMENT_TYPE,
  DOCUMENT_TYPE_OPTIONS,
} from '../constants/proformaInvoice';

const InvoiceDocumentTypeFields = ({
  documentType = DOCUMENT_TYPE.TAX_INVOICE,
  onDocumentTypeChange,
  disabled = false,
}) => (
  <div className="space-y-2">
    <Label>Document Type</Label>
    <AppSelect
      value={documentType}
      onChange={onDocumentTypeChange}
      options={DOCUMENT_TYPE_OPTIONS}
      disabled={disabled}
      data-testid="invoice-document-type-select"
    />
  </div>
);

export default InvoiceDocumentTypeFields;
