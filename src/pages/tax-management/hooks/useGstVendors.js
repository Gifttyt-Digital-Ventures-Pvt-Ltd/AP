import { useMemo } from 'react';
import { useGetVendorsQuery } from '../../../Services/apis/invoicesVendorsApi';

/** AP vendors for GST Documents / Returns vendor pickers. */
export function useGstVendors({ enabled = true } = {}) {
  const { data: vendorsData = [], isLoading, isFetching } = useGetVendorsQuery(undefined, {
    skip: !enabled,
  });

  const vendors = useMemo(() => {
    const list = Array.isArray(vendorsData) ? vendorsData : [];
    return list
      .map((vendor) => ({
        id: String(vendor.id ?? vendor.vendorId ?? vendor.vendor_id ?? ''),
        name: vendor.name ?? vendor.vendorName ?? '—',
        gstin: String(vendor.gstin ?? vendor.gst ?? '').toUpperCase(),
      }))
      .filter((vendor) => vendor.id);
  }, [vendorsData]);

  return {
    vendors,
    isLoading: isLoading || isFetching,
  };
}
