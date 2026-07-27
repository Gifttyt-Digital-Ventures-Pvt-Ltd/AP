import React from 'react';
import { Label } from '../../../components/ui/label';
import AppSelect from '../../../components/common/AppSelect';
import {
  DOCUMENT_TYPE,
  DOCUMENT_TYPE_OPTIONS,
  normalizeDocumentType,
} from '../constants/proformaInvoice';

const getSelectValue = (value) => value?.target?.value ?? value;

const InvoiceDocumentTypeFields = ({
  documentType = DOCUMENT_TYPE.TAX_INVOICE,
  onDocumentTypeChange,
  disabled = false,
}) => (
  <div className="space-y-2">
    <Label >Document Type</Label>
    <AppSelect
      value={normalizeDocumentType(getSelectValue(documentType))}
      onChange={(event) =>
        onDocumentTypeChange?.(normalizeDocumentType(getSelectValue(event)))
      }
      options={DOCUMENT_TYPE_OPTIONS}
      disabled={disabled}
      data-testid="invoice-document-type-select"
    />
  </div>
);

export default InvoiceDocumentTypeFields;
