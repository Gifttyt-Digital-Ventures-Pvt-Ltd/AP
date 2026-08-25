import React, { useMemo, useState } from 'react';
import { Input } from '../../../../components/ui/input';
import { ConnectedVendorPicker } from '../../../../components/common/ConnectedVendorPicker';
import { TaxSelect } from '../TaxUi';

const FieldShell = ({
  label,
  required,
  optional,
  children,
  className = '',
  variant = 'plain',
}) => {
  if (variant === 'gst-form') {
    return (
      <div className={className}>
        <p className="mb-1.5 text-xs font-medium text-foreground">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
          {optional ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
        </p>
        {children}
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? ' *' : ''}
        {optional ? ' (optional)' : ''}
      </label>
      {children}
    </div>
  );
};

const buildGstinOptions = (registrations = []) =>
  registrations.map((registration) => ({
    value: registration.gstin,
    label: registration.state
      ? `${registration.gstin} · ${registration.state}`
      : registration.gstin,
  }));

const VendorGstPickerFields = ({
  vendors = [],
  vendorsLoading = false,
  vendorId,
  onVendorIdChange,
  selectedGstin,
  onSelectedGstinChange,
  activeGstin = '',
  gstRegistrations = [],
  hasMultipleGstins = false,
  allowAll = false,
  vendorRequired = false,
  vendorOptional = false,
  vendorLabel = 'Vendor',
  gstinLabel = 'Vendor GSTIN',
  vendorPlaceholder,
  vendorClassName = '',
  gstinClassName = '',
  variant = 'plain',
  onVendorChange,
  useConnectedVendorPicker = false,
  onVendorSelected,
}) => {
  const [connectedVendor, setConnectedVendor] = useState(null);
  const connectedVendorId = connectedVendor?.id ?? connectedVendor?.vendorId ?? connectedVendor?.vendor_id ?? '';
  const resolvedVendors = useMemo(() => {
    if (!connectedVendorId) return vendors;
    const hasConnectedVendor = vendors.some((vendor) => String(vendor.id ?? vendor.vendorId ?? vendor.vendor_id) === String(connectedVendorId));
    return hasConnectedVendor ? vendors : [connectedVendor, ...vendors];
  }, [connectedVendor, connectedVendorId, vendors]);

  const vendorValue = allowAll
    ? (vendorId || 'all')
    : (vendorId || 'placeholder');

  const vendorOptions = allowAll
    ? [{ value: 'all', label: 'All Vendors' }, ...resolvedVendors.map((vendor) => ({
      value: vendor.id ?? vendor.vendorId ?? vendor.vendor_id,
      label: vendor.gstin ? `${vendor.name} · ${vendor.gstin}` : vendor.name,
    }))]
    : [
      { value: 'placeholder', label: vendorPlaceholder || 'Search or select vendor…' },
      ...resolvedVendors.map((vendor) => ({
      value: vendor.id ?? vendor.vendorId ?? vendor.vendor_id,
        label: vendor.gstin ? `${vendor.name} · ${vendor.gstin}` : vendor.name,
      })),
    ];

  const handleVendorChange = (value) => {
    if (allowAll) {
      if (value === 'all') setConnectedVendor(null);
      onVendorIdChange(value === 'all' ? '' : value, null);
    } else if (value !== 'placeholder') {
      onVendorIdChange(value, null);
    } else {
      return;
    }
    onVendorChange?.();
  };

  const selectedVendor = resolvedVendors.find((vendor) => String(vendor.id ?? vendor.vendorId ?? vendor.vendor_id) === String(vendorId)) ?? null;

  const handleConnectedVendorSelect = (vendor) => {
    const nextVendorId = vendor?.id ?? vendor?.vendorId ?? vendor?.vendor_id ?? '';
    if (!nextVendorId) return;
    setConnectedVendor(vendor);
    onVendorSelected?.(vendor);
    onVendorIdChange(String(nextVendorId), vendor);
    onVendorChange?.();
  };

  const gstinDisplay = activeGstin || selectedGstin || '';
  const showGstinField = !allowAll || Boolean(vendorId);
  const gstinSelectValue = activeGstin || selectedGstin || gstRegistrations[0]?.gstin || '';

  return (
    <>
      <FieldShell
        label={vendorLabel}
        required={vendorRequired}
        optional={vendorOptional}
        className={vendorClassName}
        variant={variant}
      >
        {useConnectedVendorPicker ? (
          <div className="flex min-w-0 gap-2">
            {allowAll ? (
              <button
                type="button"
                onClick={() => handleVendorChange('all')}
                className={`h-9 shrink-0 rounded-md border px-3 text-sm ${
                  !vendorId
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-background text-foreground'
                }`}
              >
                All Vendors
              </button>
            ) : null}
            <ConnectedVendorPicker
              value={selectedVendor?.name || ''}
              onSelect={handleConnectedVendorSelect}
              placeholder={vendorsLoading ? 'Loading vendors…' : vendorPlaceholder || 'Search vendor'}
              className="min-w-[220px]"
            />
          </div>
        ) : (
          <TaxSelect
            value={vendorValue}
            onValueChange={handleVendorChange}
            placeholder={vendorsLoading ? 'Loading vendors…' : vendorPlaceholder}
            options={vendorOptions}
          />
        )}
      </FieldShell>

      {showGstinField ? (
        <FieldShell
          label={gstinLabel}
          className={gstinClassName}
          variant={variant}
        >
          {hasMultipleGstins ? (
            <TaxSelect
              value={gstinSelectValue}
              onValueChange={onSelectedGstinChange}
              placeholder="Select vendor GSTIN"
              options={buildGstinOptions(gstRegistrations)}
            />
          ) : (
            <Input
              readOnly
              value={gstinDisplay}
              placeholder={vendorId ? 'No GSTIN on file for this vendor' : 'Auto-populated from vendor'}
              className="font-mono text-xs bg-muted/40"
            />
          )}
        </FieldShell>
      ) : null}
    </>
  );
};

export default VendorGstPickerFields;
