import { useMemo } from "react";
import { useRBAC } from "../contexts/RBACContext";
import { isChecklistFlagsEnabled as isChecklistFlagsEnabledForCorporate } from "../utils/invoiceConfiguration";

/** CHECKLIST_FLAGS lives in activeInvoiceConfiguration (like INTERNAL_CHECKLIST), not enabledSections. */
export const useChecklistFlagsSubscription = () => {
  const { corporateScreens } = useRBAC();

  const isChecklistFlagsEnabled = useMemo(
    () => isChecklistFlagsEnabledForCorporate(corporateScreens?.activeInvoiceConfiguration ?? []),
    [corporateScreens?.activeInvoiceConfiguration],
  );

  return { isChecklistFlagsEnabled };
};

export default useChecklistFlagsSubscription;
