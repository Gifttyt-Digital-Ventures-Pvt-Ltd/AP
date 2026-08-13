import React from "react";
import { Link } from "react-router";
import { Plug } from "lucide-react";

import { useGetApIntegrationSummaryQuery } from "../../../Services/apis/integrationsApi";
import { Button } from "../../../components/ui/button";
import {
  ERP_PROVIDER,
  INTEGRATION_CONNECTION_STATUS,
  selectErpIntegration,
} from "../integrationSummary";
import { EmptyState, LoadingState, PageShell } from "./shared";
import SyncDashboard from "./SyncDashboard";

const PROVIDER_META = {
  [ERP_PROVIDER.ZOHO_BOOKS]: {
    label: "Zoho Books",
    setupPath: "/integrations/erp/zoho",
  },
  [ERP_PROVIDER.TALLY]: {
    label: "Tally",
    setupPath: "/integrations/erp/tally",
  },
};

const ProviderSyncDashboardRoute = ({ provider }) => {
  const expectedProvider = String(provider || "").toUpperCase();
  const meta = PROVIDER_META[expectedProvider] || PROVIDER_META[ERP_PROVIDER.ZOHO_BOOKS];
  const { data: summary, isFetching } = useGetApIntegrationSummaryQuery();
  const erpIntegration = selectErpIntegration(summary);
  const hasRequestedProvider =
    erpIntegration.provider === expectedProvider && Boolean(erpIntegration.connectionId);
  const isConnected =
    erpIntegration.connectionStatus === INTEGRATION_CONNECTION_STATUS.CONNECTED;

  if (isFetching && !summary) {
    return <LoadingState label={`Loading ${meta.label} dashboard...`} />;
  }

  if (!hasRequestedProvider) {
    return (
      <PageShell
        title={`${meta.label} Dashboard`}
        description={`Connect ${meta.label} before opening its dashboard.`}
      >
        <EmptyState
          icon={Plug}
          title={`${meta.label} is not the active ERP integration`}
          description="Only the active ERP connection can open this dashboard."
          action={
            <Button asChild>
              <Link to={meta.setupPath}>Open {meta.label} Integration</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  if (!isConnected) {
    return (
      <PageShell
        title={`${meta.label} Dashboard`}
        description={`${meta.label} setup must be completed before sync dashboard data is available.`}
      >
        <EmptyState
          icon={Plug}
          title={`${meta.label} setup is incomplete`}
          description="Complete the ERP connection setup to unlock dashboard, mapping, and sync controls."
          action={
            <Button asChild>
              <Link to={`${meta.setupPath}/dashboard?tab=zoho-setup`}>
                Complete Setup
              </Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  return <SyncDashboard connectionId={erpIntegration.connectionId} />;
};

export default ProviderSyncDashboardRoute;
