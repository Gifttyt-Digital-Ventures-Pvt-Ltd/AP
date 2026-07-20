import React, { useState } from "react";
import { useParams } from "react-router-dom";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import {
  useGetIntegrationConnectionQuery,
  useGetSyncDataCategoriesQuery,
} from "../../../Services/apis/integrationsApi";
import {
  getIntegrationProviderPathValue,
  getSyncDataConnectionProvider,
  isGranularSyncSupported,
} from "../syncDataUtils";
import ConnectionSettings from "./ConnectionSettings";
import ManageSyncedData from "./ManageSyncedData";
import SyncDashboard from "./SyncDashboard";
import SyncLogs from "./SyncLogs";

const IntegrationConnectionHome = () => {
  const { connectionId } = useParams();
  const [activeTab, setActiveTab] = useState("dashboard");
  const openDashboard = () => setActiveTab("dashboard");
  const { data: connection } = useGetIntegrationConnectionQuery(connectionId, {
    skip: !connectionId,
  });
  const provider = getSyncDataConnectionProvider(connection || {});
  const providerPath = getIntegrationProviderPathValue(provider);
  const { data: syncDataSummary } = useGetSyncDataCategoriesQuery(
    { provider, connectionId },
    { skip: !connectionId || !providerPath },
  );
  const canManageSyncData = isGranularSyncSupported(syncDataSummary);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full min-h-0 flex-col">
      <div className="border-b bg-background px-6 pt-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          {canManageSyncData && <TabsTrigger value="syncData">Manage Synced Data</TabsTrigger>}
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="danger">Connection</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="dashboard" className="m-0 min-h-0 flex-1">
        <SyncDashboard />
      </TabsContent>
      <TabsContent value="logs" className="m-0 min-h-0 flex-1">
        <SyncLogs onOpenDashboard={openDashboard} />
      </TabsContent>
      {canManageSyncData && (
        <TabsContent value="syncData" className="m-0 min-h-0 flex-1">
          <ManageSyncedData
            mode="connection"
            connectionId={connectionId}
            provider={provider}
            embedded
          />
        </TabsContent>
      )}
      <TabsContent value="danger" className="m-0 min-h-0 flex-1">
        <ConnectionSettings onOpenDashboard={openDashboard} />
      </TabsContent>
    </Tabs>
  );
};

export default IntegrationConnectionHome;
