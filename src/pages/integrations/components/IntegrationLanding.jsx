import React from "react";

import IntegrationModuleLayout from "./IntegrationModuleLayout";
import IntegrationsOverview from "./IntegrationsOverview";

const IntegrationLanding = () => (
  <IntegrationModuleLayout
    title="Integrations"
    description="Manage email ingestion and ERP integrations from one dedicated module."
  >
    <IntegrationsOverview />
  </IntegrationModuleLayout>
);

export default IntegrationLanding;
