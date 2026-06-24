import { useCallback } from 'react';
import { useGetVendorGstDetailsMutation } from '../../../Services/apis/taxApi';
import { getApiErrorMessage } from '../../tax-management/hooks/useGstTaxpayerSession';
import { getVendorFetchValidationError, resolveVendorFetchSource } from '../../../utils/vendorValidation';
import { DUMMY_VENDOR_GST_LOOKUP, USE_DUMMY_VENDOR_DATA } from '../data/dummyVendors';
import {
  buildVendorGstDetailsRequestBody,
  fetchVendorGstDetailsFromLookup,
  mapVendorGstDetailsToFetchRecords,
} from '../utils/vendorGstFetch';

export function useVendorGstDetailsFetch({ lookup = DUMMY_VENDOR_GST_LOOKUP } = {}) {
  const [getVendorGstDetails, { isLoading }] = useGetVendorGstDetailsMutation();

  const fetchVendorDetails = useCallback(
    async ({ pan, gstin } = {}) => {
      const validationError = getVendorFetchValidationError({ pan, gstin });
      if (validationError) {
        return { success: false, error: validationError };
      }

      const source = resolveVendorFetchSource({ pan, gstin });
      const requestBody = buildVendorGstDetailsRequestBody({ pan, gstin });
      if (!requestBody || !source) {
        return { success: false, error: 'Enter PAN or GSTIN to fetch details' };
      }

      if (USE_DUMMY_VENDOR_DATA) {
        return fetchVendorGstDetailsFromLookup({ pan, gstin }, lookup);
      }

      try {
        const response = await getVendorGstDetails(requestBody).unwrap();
        const mapped = mapVendorGstDetailsToFetchRecords(response, source.mode);
        if (!mapped.records.length) {
          return {
            success: false,
            error:
              source.mode === 'pan'
                ? 'No GST registrations found for this PAN.'
                : 'No vendor found for this GSTIN.',
          };
        }

        return {
          success: true,
          ...mapped,
        };
      } catch (error) {
        return {
          success: false,
          error: getApiErrorMessage(error) || 'Failed to fetch vendor details',
        };
      }
    },
    [getVendorGstDetails, lookup],
  );

  const fetchVendorDetailsByPan = useCallback(
    (pan) => fetchVendorDetails({ pan }),
    [fetchVendorDetails],
  );

  return {
    fetchVendorDetails,
    fetchVendorDetailsByPan,
    isLoading,
  };
}
