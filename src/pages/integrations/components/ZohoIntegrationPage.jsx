import React from "react";

import { useGetApIntegrationSummaryQuery } from "../../../Services/apis/integrationsApi";
import ZohoIntegrationCard from "../../settings/components/ZohoIntegrationCard";
import {
  ERP_PROVIDER,
  selectErpIntegration,
} from "../integrationSummary";
import IntegrationModuleLayout from "./IntegrationModuleLayout";
import IntegrationProviderLayout from "./IntegrationProviderLayout";

const ZohoIntegrationPage = () => {
  const { data: summary } = useGetApIntegrationSummaryQuery();
  const erpIntegration = selectErpIntegration(summary);
  const tallyIsActive = erpIntegration.provider === ERP_PROVIDER.TALLY;

  return (
    <IntegrationModuleLayout
      title="Zoho Books Integration"
      description="Manage Zoho Books connection, organization selection, sync, and mappings."
      breadcrumbPage="Zoho Books"
      breadcrumbCategory="ERP"
    >
      <IntegrationProviderLayout
        alert={
          tallyIsActive
            ? {
                title: "Tally is currently your active ERP integration",
                description:
                  "To connect Zoho Books, the current ERP integration must first be switched or disconnected. Opening this page will not disconnect Tally.",
              }
            : null
        }
      >
        <ZohoIntegrationCard />
      </IntegrationProviderLayout>
    </IntegrationModuleLayout>
  );
};

export default ZohoIntegrationPage;
