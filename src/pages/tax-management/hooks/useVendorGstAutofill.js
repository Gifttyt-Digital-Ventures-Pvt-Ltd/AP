import { useCallback, useRef } from 'react';
import { useGetVendorGstDetailsMutation } from '../../../Services/apis/taxApi';
import { mapVendorGstDetailsToForm } from '../utils/gstApiMappers';
import { getApiErrorMessage } from './useGstTaxpayerSession';
import { GSTIN_PATTERN, isValidVendorGstin } from '../../../utils/vendorValidation';

/**
 * Debounced GSTIN lookup for vendor create/edit forms.
 * Calls POST /tax/gst/vendor/details (no taxpayer OTP required).
 */
export function useVendorGstAutofill({ debounceMs = 400 } = {}) {
  const [lookup, { isLoading }] = useGetVendorGstDetailsMutation();
  const timerRef = useRef(null);

  const lookupGstin = useCallback(async (gstin, onResult) => {
    const normalized = String(gstin || '').trim().toUpperCase();
    if (!normalized || !isValidVendorGstin(normalized)) {
      return;
    }

    try {
      const data = await lookup({ gstin: normalized }).unwrap();
      const mapped = mapVendorGstDetailsToForm(data?.currentData ?? data);
      onResult?.({ success: true, data: mapped, history: data?.history ?? [] });
    } catch (error) {
      onResult?.({ success: false, error: getApiErrorMessage(error) });
    }
  }, [lookup]);

  const autofillByGstin = useCallback((gstin, onResult) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    const normalized = String(gstin || '').trim().toUpperCase();
    if (!normalized || normalized.length !== 15 || !GSTIN_PATTERN.test(normalized)) {
      return () => {};
    }

    timerRef.current = window.setTimeout(() => {
      lookupGstin(normalized, onResult);
    }, debounceMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [debounceMs, lookupGstin]);

  const verifyGstinNow = useCallback((gstin, onResult) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    lookupGstin(gstin, onResult);
  }, [lookupGstin]);

  return {
    autofillByGstin,
    verifyGstinNow,
    isLoading,
  };
}

export { GSTIN_PATTERN, isValidVendorGstin as isValidGstin };
