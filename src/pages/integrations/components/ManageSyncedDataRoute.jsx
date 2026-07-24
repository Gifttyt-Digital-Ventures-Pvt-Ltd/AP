import React from "react";
import { useParams } from "react-router-dom";

import { useGetIntegrationConnectionQuery } from "../../../Services/apis/integrationsApi";
import { getSyncDataConnectionProvider } from "../syncDataUtils";
import { LoadingState } from "./shared";
import ManageSyncedData from "./ManageSyncedData";

const ManageSyncedDataRoute = () => {
  const { connectionId, categoryCode } = useParams();
  const { data: connection, isFetching } = useGetIntegrationConnectionQuery(connectionId, {
    skip: !connectionId,
  });

  if (isFetching && !connection) {
    return <LoadingState label="Loading connection..." />;
  }

  return (
    <ManageSyncedData
      mode="connection"
      connectionId={connectionId}
      provider={getSyncDataConnectionProvider(connection || {})}
      categoryCode={categoryCode}
    />
  );
};

export default ManageSyncedDataRoute;
