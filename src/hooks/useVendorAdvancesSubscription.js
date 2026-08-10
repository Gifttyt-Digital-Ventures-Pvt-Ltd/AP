import { useRBAC } from "../contexts/RBACContext";

export const VENDOR_ADVANCES = "VENDOR_ADVANCES";

export const useVendorAdvancesSubscription = () => {
  const { isCorporateSectionEnabled } = useRBAC();

  return {
    isVendorAdvancesEnabled: isCorporateSectionEnabled(VENDOR_ADVANCES),
  };
};

export default useVendorAdvancesSubscription;
