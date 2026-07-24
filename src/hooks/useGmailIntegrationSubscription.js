import { useRBAC } from '../contexts/RBACContext';

export const useGmailIntegrationSubscription = () => {
  const { isCorporateSectionEnabled } = useRBAC();

  const isGmailIntegrationEnabled = isCorporateSectionEnabled('GMAIL_INTEGRATION_ALL');

  return { isGmailIntegrationEnabled };
};

export default useGmailIntegrationSubscription;
