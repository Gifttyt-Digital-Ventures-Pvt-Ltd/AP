import React, { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import ConnectionSettings from "./ConnectionSettings";
import SyncDashboard from "./SyncDashboard";
import SyncLogs from "./SyncLogs";

const IntegrationConnectionHome = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const openDashboard = () => setActiveTab("dashboard");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full min-h-0 flex-col">
      <div className="border-b bg-background px-6 pt-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
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
      <TabsContent value="danger" className="m-0 min-h-0 flex-1">
        <ConnectionSettings onOpenDashboard={openDashboard} />
      </TabsContent>
    </Tabs>
  );
};

export default IntegrationConnectionHome;
