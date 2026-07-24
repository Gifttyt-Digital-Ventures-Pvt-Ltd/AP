import { useGetApIntegrationSummaryQuery } from "../Services/apis/integrationsApi";
import { useRBAC } from "../contexts/RBACContext";
import {
  ERP_PROVIDER,
  INTEGRATION_CONNECTION_STATUS,
  selectErpIntegration,
} from "../pages/integrations/integrationSummary";

const useZohoIntegrationActive = () => {
  const { isCorporateSectionEnabled } = useRBAC();
  const isIntegrationsEnabled = isCorporateSectionEnabled("SETTINGS_INTEGRATIONS");
  const { data: integrationSummary, isLoading, isFetching } = useGetApIntegrationSummaryQuery(
    undefined,
    { skip: !isIntegrationsEnabled },
  );

  const erpIntegration = selectErpIntegration(integrationSummary);
  const hasConnectedZoho =
    isIntegrationsEnabled &&
    erpIntegration.provider === ERP_PROVIDER.ZOHO_BOOKS &&
    erpIntegration.connectionStatus === INTEGRATION_CONNECTION_STATUS.CONNECTED;

  return {
    isIntegrationsEnabled,
    hasConnectedZoho,
    showIntegrationColumn: isIntegrationsEnabled && hasConnectedZoho,
    isLoading: isIntegrationsEnabled && (isLoading || isFetching),
  };
};

export default useZohoIntegrationActive;
