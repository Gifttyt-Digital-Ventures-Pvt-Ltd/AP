import { useEffect, useMemo, useState } from 'react';

const normalizeGstin = (value = '') => String(value || '').trim().toUpperCase();

export const resolveVendorActiveGstin = (vendor, selectedGstin = '') => {
  const normalized = normalizeGstin(selectedGstin);
  const registrations = vendor?.gstRegistrations ?? [];
  if (normalized && registrations.some((entry) => normalizeGstin(entry.gstin) === normalized)) {
    return normalized;
  }
  if (registrations[0]?.gstin) return normalizeGstin(registrations[0].gstin);
  return normalizeGstin(vendor?.gstin);
};

export function useVendorGstSelection(vendors = [], { initialVendorId = '' } = {}) {
  const [vendorId, setVendorId] = useState(initialVendorId);
  const [selectedGstin, setSelectedGstin] = useState('');

  const selectedVendor = useMemo(() => {
    if (!vendorId || vendorId === 'all') return null;
    return vendors.find((vendor) => vendor.id === vendorId) ?? null;
  }, [vendorId, vendors]);

  const gstRegistrations = selectedVendor?.gstRegistrations ?? [];
  const hasMultipleGstins = gstRegistrations.length > 1;
  const activeGstin = selectedVendor ? resolveVendorActiveGstin(selectedVendor, selectedGstin) : '';

  useEffect(() => {
    if (!selectedVendor) {
      setSelectedGstin('');
      return;
    }

    setSelectedGstin((previous) => {
      const options = selectedVendor.gstRegistrations ?? [];
      const normalizedPrevious = normalizeGstin(previous);
      if (normalizedPrevious && options.some((entry) => normalizeGstin(entry.gstin) === normalizedPrevious)) {
        return normalizedPrevious;
      }
      if (options[0]?.gstin) return normalizeGstin(options[0].gstin);
      return normalizeGstin(selectedVendor.gstin);
    });
  }, [selectedVendor]);

  const setVendorIdAndReset = (nextVendorId) => {
    setVendorId(nextVendorId);
    setSelectedGstin('');
  };

  return {
    vendorId,
    setVendorId: setVendorIdAndReset,
    selectedVendor,
    selectedGstin,
    setSelectedGstin,
    activeGstin,
    gstRegistrations,
    hasMultipleGstins,
  };
}
