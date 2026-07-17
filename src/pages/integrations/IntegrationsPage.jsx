import React from "react";
import { useLocation, useParams } from "react-router-dom";

import ConnectionWizard from "./components/ConnectionWizard";
import GmailIntegrationPage from "./components/GmailIntegrationPage";
import IntegrationConnectionHome from "./components/IntegrationConnectionHome";
import IntegrationLanding from "./components/IntegrationLanding";
import MappingEditor from "./components/MappingEditor";
import ObjectReview from "./components/ObjectReview";
import SyncLogs from "./components/SyncLogs";
import TallyIntegrationPage from "./components/TallyIntegrationPage";
import ZohoIntegrationPage from "./components/ZohoIntegrationPage";

const IntegrationsPage = () => {
  const { connectionId, object } = useParams();
  const { pathname: path } = useLocation();

  if (path === "/integrations/gmail") return <GmailIntegrationPage />;
  if (path === "/integrations/erp/zoho") return <ZohoIntegrationPage />;
  if (path === "/integrations/erp/tally") return <TallyIntegrationPage />;
  if (path.includes("/connect/")) return <ConnectionWizard />;
  if (path.includes("/mapping")) return <MappingEditor />;
  if (path.includes("/objects/") && object) return <ObjectReview />;
  if (path.includes("/logs")) return <SyncLogs />;
  if (connectionId) return <IntegrationConnectionHome />;
  return <IntegrationLanding />;
};

export default IntegrationsPage;
