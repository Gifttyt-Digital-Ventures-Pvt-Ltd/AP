import React from "react";

import { useGetApIntegrationSummaryQuery } from "../../../Services/apis/integrationsApi";
import {
  ERP_PROVIDER,
  selectErpIntegration,
} from "../integrationSummary";
import IntegrationModuleLayout from "./IntegrationModuleLayout";
import IntegrationProviderLayout from "./IntegrationProviderLayout";
import TallyIntegrationCard from "./TallyIntegrationCard";

const TallyIntegrationPage = () => {
  const { data: summary } = useGetApIntegrationSummaryQuery();
  const erpIntegration = selectErpIntegration(summary);
  const zohoIsActive = erpIntegration.provider === ERP_PROVIDER.ZOHO_BOOKS;

  return (
    <IntegrationModuleLayout
      title="Tally Integration"
      description="Manage the local Tally connector, heartbeat, pairing, and sync jobs."
      breadcrumbPage="Tally"
      breadcrumbCategory="ERP"
    >
      <IntegrationProviderLayout
        alert={
          zohoIsActive
            ? {
                title: "Zoho Books is currently your active ERP integration",
                description:
                  "To connect Tally, the current ERP integration must first be switched or disconnected. Opening this page will not disconnect Zoho Books.",
              }
            : null
        }
      >
        <TallyIntegrationCard />
      </IntegrationProviderLayout>
    </IntegrationModuleLayout>
  );
};

export default TallyIntegrationPage;
