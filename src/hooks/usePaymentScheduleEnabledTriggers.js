import { useMemo } from "react";
import { useRBAC } from "../contexts/RBACContext";

const BASE_PAYMENT_SCHEDULE_TRIGGERS = ["PO", "TI"];

const usePaymentScheduleEnabledTriggers = () => {
  const { isCorporateScreenAllowed, isCorporateSectionEnabled } = useRBAC();

  const isGrnSubscriptionEnabled =
    isCorporateScreenAllowed("GRN") && isCorporateSectionEnabled("GRN_ALL");
  const isPiSubscriptionEnabled =
    isCorporateScreenAllowed("PI") && isCorporateSectionEnabled("PI_ALL");

  return useMemo(
    () => [
      BASE_PAYMENT_SCHEDULE_TRIGGERS[0],
      ...(isGrnSubscriptionEnabled ? ["GRN"] : []),
      ...(isPiSubscriptionEnabled ? ["PI"] : []),
      BASE_PAYMENT_SCHEDULE_TRIGGERS[1],
    ],
    [isGrnSubscriptionEnabled, isPiSubscriptionEnabled],
  );
};

export default usePaymentScheduleEnabledTriggers;
