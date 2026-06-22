import { useCallback } from 'react';
import { toast } from 'sonner';
import { useCheckGstSessionMutation } from '../../../Services/apis/taxApi';
import { buildGstPortalFetchCredentials } from '../../../utils/organisationGst';
import { useGstPortalOtp } from './useGstPortalOtp';

function getApiErrorMessage(error) {
  return error?.data?.message
    ?? error?.data?.detail
    ?? error?.message
    ?? 'GST portal request failed';
}

/**
 * Orchestrates taxpayer session check + OTP before GSTR compliance API calls.
 * Flow: POST /session/status → if inactive, show OTP → pass otp to execute().
 * Used by Documents (reconcile, 2A/2B) and Ledgers (cash-itc-balance).
 */
export function useGstTaxpayerSession() {
  const [checkSession] = useCheckGstSessionMutation();
  const otp = useGstPortalOtp();

  const runWithSession = useCallback(async ({
    orgCredential,
    contextLabel = 'GST Portal',
    execute,
  }) => {
    const portalCredentials = buildGstPortalFetchCredentials(orgCredential);
    if (!portalCredentials?.gst || !portalCredentials?.userName) {
      toast.error('Select a valid organisation GSTIN before continuing.');
      return null;
    }

    try {
      const status = await checkSession({
        username: portalCredentials.userName,
        gstin: portalCredentials.gst,
      }).unwrap();

      if (status?.sessionActive) {
        return execute(undefined, portalCredentials);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      return null;
    }

    return new Promise((resolve) => {
      otp.requestOtpForFetch({
        gstin: portalCredentials.gst,
        contextLabel,
        onVerified: async (otpCode) => {
          try {
            const result = await execute(otpCode, portalCredentials);
            resolve(result);
          } catch (error) {
            toast.error(getApiErrorMessage(error));
            resolve(null);
          }
        },
      });
    });
  }, [checkSession, otp]);

  return {
    runWithSession,
    otpDialogProps: {
      open: otp.open,
      onOpenChange: otp.handleOpenChange,
      gstin: otp.gstin,
      contextLabel: otp.contextLabel,
      onVerified: otp.handleVerified,
    },
  };
}

export { getApiErrorMessage };
