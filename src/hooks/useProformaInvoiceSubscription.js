import { useRBAC } from '../contexts/RBACContext';

/** Corporate subscription gate for Proforma Invoice features (PI / PI_ALL). */
export const useProformaInvoiceSubscription = () => {
  const { isCorporateScreenAllowed, isCorporateSectionEnabled } = useRBAC();

  const isPiSubscriptionEnabled =
    isCorporateScreenAllowed('PI') && isCorporateSectionEnabled('PI_ALL');

  return { isPiSubscriptionEnabled };
};

export default useProformaInvoiceSubscription;
