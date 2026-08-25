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
  const [connectedVendor, setConnectedVendor] = useState(null);

  const effectiveVendors = useMemo(() => {
    if (!connectedVendor) return vendors;
    const connectedVendorId = connectedVendor.id ?? connectedVendor.vendorId ?? connectedVendor.vendor_id;
    if (!connectedVendorId) return vendors;
    const exists = vendors.some((vendor) =>
      String(vendor.id ?? vendor.vendorId ?? vendor.vendor_id) === String(connectedVendorId));
    return exists ? vendors : [connectedVendor, ...vendors];
  }, [connectedVendor, vendors]);

  const selectedVendor = useMemo(() => {
    if (!vendorId || vendorId === 'all') return null;
    return effectiveVendors.find((vendor) =>
      String(vendor.id ?? vendor.vendorId ?? vendor.vendor_id) === String(vendorId)) ?? null;
  }, [effectiveVendors, vendorId]);

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

  const setVendorIdAndReset = (nextVendorId, vendor = null) => {
    if (vendor) {
      setConnectedVendor(vendor);
    } else if (!nextVendorId || nextVendorId === 'all') {
      setConnectedVendor(null);
    }
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
