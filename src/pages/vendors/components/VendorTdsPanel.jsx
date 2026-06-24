import React from 'react';
import TdsSelectionField from '../../invoices/components/TdsSelectionField';
import {
  createEmptyVendorTds,
  formatVendorTdsLabel,
  hasConfiguredVendorTds,
  normalizeVendorTds,
  vendorTdsFromSelection,
  vendorTdsToSelectionValue,
} from '../utils/vendorTds';

const VendorTdsPanel = ({
  tdsMapping = null,
  onChange,
  disabled = false,
  readOnly = false,
}) => {
  const mapping = normalizeVendorTds(tdsMapping);
  const selectionValue = vendorTdsToSelectionValue(mapping);

  if (readOnly) {
    if (!hasConfiguredVendorTds(mapping)) {
      return (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          No TDS configured.
        </div>
      );
    }

    return (
      <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-sm font-medium">
        {formatVendorTdsLabel(mapping)}
      </span>
    );
  }

  return (
    <TdsSelectionField
      value={selectionValue}
      onChange={(selection) => {
        if (!selection?.tds) {
          onChange?.(createEmptyVendorTds());
          return;
        }
        onChange?.(vendorTdsFromSelection(selection));
      }}
      disabled={disabled}
      showLabel={false}
      testIdPrefix="vendor-tds"
    />
  );
};

export default VendorTdsPanel;
