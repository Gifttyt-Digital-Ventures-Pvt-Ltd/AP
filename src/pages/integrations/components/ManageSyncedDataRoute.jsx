import React from "react";
import { useParams } from "react-router";

import {
  useGetApIntegrationSummaryQuery,
  useGetIntegrationConnectionQuery,
} from "../../../Services/apis/integrationsApi";
import { selectErpIntegration } from "../integrationSummary";
import { getSyncDataConnectionProvider } from "../syncDataUtils";
import { LoadingState } from "./shared";
import ManageSyncedData from "./ManageSyncedData";

const ManageSyncedDataRoute = () => {
  const { connectionId, categoryCode } = useParams();
  const { data: summary, isFetching: summaryFetching } = useGetApIntegrationSummaryQuery();
  const activeErpIntegration = selectErpIntegration(summary);
  const activeErpProvider =
    activeErpIntegration.connectionId === connectionId
      ? activeErpIntegration.provider
      : "";
  const { data: connection, isFetching } = useGetIntegrationConnectionQuery(connectionId, {
    skip: !connectionId || Boolean(activeErpProvider),
  });

  if ((summaryFetching && !summary) || (isFetching && !connection)) {
    return <LoadingState label="Loading connection..." />;
  }

  return (
    <ManageSyncedData
      mode="connection"
      connectionId={connectionId}
      provider={activeErpProvider || getSyncDataConnectionProvider(connection || {})}
      categoryCode={categoryCode}
    />
  );
};

export default ManageSyncedDataRoute;
