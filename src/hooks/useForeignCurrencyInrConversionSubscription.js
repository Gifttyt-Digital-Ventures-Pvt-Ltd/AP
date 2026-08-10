import { useRBAC } from "../contexts/RBACContext";

export const FOREIGN_CURRENCY_INR_CONVERSION =
  "FOREIGN_CURRENCY_INR_CONVERSION";

export const useForeignCurrencyInrConversionSubscription = () => {
  const { isCorporateSectionEnabled } = useRBAC();

  return {
    isForeignCurrencyInrConversionEnabled: isCorporateSectionEnabled(
      FOREIGN_CURRENCY_INR_CONVERSION,
    ),
  };
};

export default useForeignCurrencyInrConversionSubscription;
