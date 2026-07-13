import { useRBAC } from "../contexts/RBACContext";

const TDS_SCREEN_TOKENS = ["TDS", "TAX", "TAX_MANAGEMENT"];
const TDS_SECTION_TOKENS = ["TDS", "TAX_TDS", "TAX_TDS_COMPLIANCE", "TDS_ALL"];

export const useTdsSubscription = () => {
  const { isCorporateScreenAllowed, isCorporateSectionEnabled } = useRBAC();

  const hasTdsScreen = TDS_SCREEN_TOKENS.some((token) => isCorporateScreenAllowed(token));
  const hasTdsSection = TDS_SECTION_TOKENS.some((token) => isCorporateSectionEnabled(token));

  return {
    isTdsSubscriptionEnabled: hasTdsScreen && hasTdsSection,
  };
};

export default useTdsSubscription;
