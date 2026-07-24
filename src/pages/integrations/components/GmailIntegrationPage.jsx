import React from "react";

import GmailInvoiceIntegrationCard from "../../invoices/components/GmailInvoiceIntegrationCard";
import IntegrationModuleLayout from "./IntegrationModuleLayout";
import IntegrationProviderLayout from "./IntegrationProviderLayout";

const GmailIntegrationPage = () => (
  <IntegrationModuleLayout
    title="Gmail Integration"
    description="Manage invoice ingestion from your AP mailbox."
    breadcrumbPage="Gmail"
    breadcrumbCategory="Email"
  >
    <IntegrationProviderLayout>
      <GmailInvoiceIntegrationCard />
    </IntegrationProviderLayout>
  </IntegrationModuleLayout>
);

export default GmailIntegrationPage;
