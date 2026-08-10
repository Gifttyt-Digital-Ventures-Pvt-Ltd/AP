import { useRBAC } from "../contexts/RBACContext";
import { VENDOR_ADVANCES } from "./useVendorAdvancesSubscription";

export const AP_PAYMENT_TERMS = "AP_PAYMENT_TERMS";

export const usePaymentTermsSubscription = () => {
  const { isCorporateSectionEnabled } = useRBAC();
  const isVendorAdvancesEnabled = isCorporateSectionEnabled(VENDOR_ADVANCES);

  return {
    isPaymentTermsEnabled:
      isVendorAdvancesEnabled && isCorporateSectionEnabled(AP_PAYMENT_TERMS),
  };
};

export default usePaymentTermsSubscription;
