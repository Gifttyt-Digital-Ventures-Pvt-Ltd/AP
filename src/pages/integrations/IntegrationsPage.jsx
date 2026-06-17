import React from "react";
import { useParams } from "react-router-dom";

import ConnectionWizard from "./components/ConnectionWizard";
import IntegrationConnectionHome from "./components/IntegrationConnectionHome";
import IntegrationLanding from "./components/IntegrationLanding";
import MappingEditor from "./components/MappingEditor";
import ObjectReview from "./components/ObjectReview";
import SyncLogs from "./components/SyncLogs";

const IntegrationsPage = () => {
  const { connectionId, object } = useParams();
  const path = typeof window === "undefined" ? "" : window.location.pathname;

  if (path.includes("/connect/")) return <ConnectionWizard />;
  if (path.includes("/mapping")) return <MappingEditor />;
  if (path.includes("/objects/") && object) return <ObjectReview />;
  if (path.includes("/logs")) return <SyncLogs />;
  if (connectionId) return <IntegrationConnectionHome />;
  return <IntegrationLanding />;
};

export default IntegrationsPage;
