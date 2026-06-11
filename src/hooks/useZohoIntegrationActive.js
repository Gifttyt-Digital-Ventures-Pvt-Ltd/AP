import { useMemo } from "react";
import { useGetIntegrationConnectionsQuery } from "../Services/apis/integrationsApi";
import { useRBAC } from "../contexts/RBACContext";
import {
  getConnectionStatus,
  normalizeConnections,
} from "../pages/integrations/utils";

const useZohoIntegrationActive = () => {
  const { isCorporateSectionEnabled } = useRBAC();
  const isIntegrationsEnabled = isCorporateSectionEnabled("SETTINGS_INTEGRATIONS");
  const { data: connectionsResponse, isLoading, isFetching } = useGetIntegrationConnectionsQuery(
    undefined,
    { skip: !isIntegrationsEnabled },
  );

  const hasConnectedZoho = useMemo(() => {
    if (!isIntegrationsEnabled) return false;
    const connections = normalizeConnections(connectionsResponse);
    return connections.some((connection) => getConnectionStatus(connection) === "CONNECTED");
  }, [connectionsResponse, isIntegrationsEnabled]);

  return {
    isIntegrationsEnabled,
    hasConnectedZoho,
    showIntegrationColumn: isIntegrationsEnabled && hasConnectedZoho,
    isLoading: isIntegrationsEnabled && (isLoading || isFetching),
  };
};

export default useZohoIntegrationActive;
