import { useMemo } from 'react';
import { useGetVendorsQuery } from '../../../Services/apis/invoicesVendorsApi';
import {
  getFirstVendorGstin,
  getVendorGstRegistrations,
} from '../../vendors/components/VendorGstRegistrationsPanel';

/** AP vendors for GST tabs — includes all GST registrations per vendor. */
export function useGstVendors({ enabled = true } = {}) {
  const { data: vendorsData = [], isLoading, isFetching } = useGetVendorsQuery(undefined, {
    skip: !enabled,
  });

  const vendors = useMemo(() => {
    const list = Array.isArray(vendorsData) ? vendorsData : [];
    return list
      .map((vendor) => {
        const gstRegistrations = getVendorGstRegistrations(vendor);
        const normalizedVendor = { ...vendor, gstRegistrations };
        const gstin = getFirstVendorGstin(normalizedVendor);
        return {
          id: String(vendor.id ?? vendor.vendorId ?? vendor.vendor_id ?? ''),
          name: vendor.name ?? vendor.vendorName ?? '—',
          gstin,
          gstRegistrations,
          state: vendor.state || gstRegistrations[0]?.state || '',
        };
      })
      .filter((vendor) => vendor.id);
  }, [vendorsData]);

  return {
    vendors,
    isLoading: isLoading || isFetching,
  };
};
