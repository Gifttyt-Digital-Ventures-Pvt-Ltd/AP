import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Mail,
  PlugZap,
} from "lucide-react";

import { useGetApIntegrationSummaryQuery } from "../../../Services/apis/integrationsApi";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { useRBAC } from "../../../contexts/RBACContext";
import {
  ERP_PROVIDER,
  INTEGRATION_CONNECTION_STATUS,
  getIntegrationStatusLabel,
  isIntegrationConnected,
  selectEmailIntegration,
  selectErpIntegration,
} from "../integrationSummary";
import { formatDateTime } from "../utils";
import { providerRoutes } from "../providerDefinitions";

const statusClassName = (status = "") => {
  switch (status) {
    case INTEGRATION_CONNECTION_STATUS.CONNECTED:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case INTEGRATION_CONNECTION_STATUS.CONNECTING:
    case INTEGRATION_CONNECTION_STATUS.ACTION_REQUIRED:
      return "border-amber-200 bg-amber-50 text-amber-700";
    case INTEGRATION_CONNECTION_STATUS.ERROR:
      return "border-red-200 bg-red-50 text-red-700";
    case INTEGRATION_CONNECTION_STATUS.DISCONNECTED:
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
};

const DetailRow = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="mt-1 text-sm font-medium text-foreground">{value || "—"}</p>
  </div>
);

const CollapsibleIntegrationSection = ({
  title,
  description,
  defaultOpen = true,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const ToggleIcon = open ? ChevronDown : ChevronRight;

  return (
    <section className="space-y-3">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <ToggleIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </section>
  );
};

const IntegrationSummaryCard = ({
  icon: Icon,
  title,
  subtitle,
  status,
  details,
  route,
  error,
  note,
  disabled,
}) => {
  const connected = status === INTEGRATION_CONNECTION_STATUS.CONNECTED;
  const actionLabel = connected
    ? "Manage"
    : status === INTEGRATION_CONNECTION_STATUS.ACTION_REQUIRED
      ? "Complete setup"
      : status === INTEGRATION_CONNECTION_STATUS.ERROR
        ? "Reconnect"
        : "Connect";

  return (
    <Card className="flex h-full flex-col rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border bg-muted p-2.5">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <Badge variant="outline" className={statusClassName(status)}>
            {connected ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : null}
            {getIntegrationStatusLabel(status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {details.map((detail) => (
            <DetailRow key={detail.label} {...detail} />
          ))}
        </div>

        {note ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {note}
          </div>
        ) : null}

        {error?.message ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error.message}</span>
          </div>
        ) : null}

        <div className="mt-auto pt-2">
          <Button asChild className="w-full" disabled={disabled}>
            <Link to={route}>
              {actionLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const IntegrationsOverview = () => {
  const { isCorporateSectionEnabled, hasAnyPermission } = useRBAC();
  const {
    data: summary,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetApIntegrationSummaryQuery();
  const emailIntegration = selectEmailIntegration(summary);
  const erpIntegration = selectErpIntegration(summary);
  const canViewGmail =
    hasAnyPermission(["settings-interaction"]) &&
    isCorporateSectionEnabled("GMAIL_INTEGRATION_ALL");
  const canViewErp =
    hasAnyPermission([
      "integrations.view",
      "integrations.connect",
      "integrations.disconnect",
      "integrations.mapping.edit",
      "integrations.sync.trigger",
      "integrations.review.resolve",
    ]) && isCorporateSectionEnabled("SETTINGS_INTEGRATIONS");
  const activeErpProvider = erpIntegration.provider;

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-xl border bg-card">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            Loading integration summary...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3 text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Unable to load integrations</p>
              <p className="text-sm">
                We could not load the current integration summary.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {canViewGmail ? (
        <CollapsibleIntegrationSection title="Email Integration" defaultOpen={false}>
          <IntegrationSummaryCard
            icon={Mail}
            title="Email"
            subtitle="Auto-ingest vendor invoice attachments from a dedicated mailbox."
            status={emailIntegration.connectionStatus}
            route={providerRoutes.gmail}
            error={emailIntegration.error}
            details={[
              {
                label: "Mailbox",
                value:
                  emailIntegration.details?.email ||
                  emailIntegration.displayName ||
                  "No mailbox connected",
              },
              {
                label: "Last activity",
                value: formatDateTime(emailIntegration.lastActivityAt),
              },
              {
                label: "Poll query",
                value: emailIntegration.details?.pollQuery || "Not configured",
              },
              {
                label: "Connection",
                value: isIntegrationConnected(emailIntegration)
                  ? "Active"
                  : "Not active",
              },
            ]}
          />
        </CollapsibleIntegrationSection>
      ) : null}

      {canViewErp ? (
        <CollapsibleIntegrationSection
          title="ERP Integration"
          description="Only one ERP provider can be active at a time."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <IntegrationSummaryCard
              icon={PlugZap}
              title="Zoho Books"
              subtitle="Sync vendors, ledgers, invoices, payments, and ERP master data."
              status={
                activeErpProvider === ERP_PROVIDER.ZOHO_BOOKS
                  ? erpIntegration.connectionStatus
                  : INTEGRATION_CONNECTION_STATUS.DISCONNECTED
              }
              route={providerRoutes.zoho}
              error={
                activeErpProvider === ERP_PROVIDER.ZOHO_BOOKS
                  ? erpIntegration.error
                  : null
              }
              note={
                activeErpProvider === ERP_PROVIDER.TALLY
                  ? "Tally is currently your active ERP integration. To connect Zoho Books, the current ERP integration must first be switched or disconnected."
                  : ""
              }
              details={[
                {
                  label: "Organization",
                  value:
                    activeErpProvider === ERP_PROVIDER.ZOHO_BOOKS
                      ? erpIntegration.organization?.name ||
                        erpIntegration.displayName ||
                        "Organization pending"
                      : "Not active",
                },
                {
                  label: "Last activity",
                  value:
                    activeErpProvider === ERP_PROVIDER.ZOHO_BOOKS
                      ? formatDateTime(erpIntegration.lastActivityAt)
                      : "Never",
                },
                {
                  label: "Token expires",
                  value:
                    activeErpProvider === ERP_PROVIDER.ZOHO_BOOKS
                      ? formatDateTime(erpIntegration.details?.tokenExpiresAt)
                      : "—",
                },
                {
                  label: "Provider",
                  value:
                    activeErpProvider === ERP_PROVIDER.ZOHO_BOOKS
                      ? "Active ERP"
                      : "Available",
                },
              ]}
            />
            <IntegrationSummaryCard
              icon={CalendarClock}
              title="Tally"
              subtitle="Pair the local connector and run manual Tally sync jobs."
              status={
                activeErpProvider === ERP_PROVIDER.TALLY
                  ? erpIntegration.connectionStatus
                  : INTEGRATION_CONNECTION_STATUS.DISCONNECTED
              }
              route={providerRoutes.tally}
              error={
                activeErpProvider === ERP_PROVIDER.TALLY
                  ? erpIntegration.error
                  : null
              }
              note={
                activeErpProvider === ERP_PROVIDER.ZOHO_BOOKS
                  ? "Zoho Books is currently your active ERP integration. To connect Tally, the current ERP integration must first be switched or disconnected."
                  : ""
              }
              details={[
                {
                  label: "Company",
                  value:
                    activeErpProvider === ERP_PROVIDER.TALLY
                      ? erpIntegration.organization?.name ||
                        erpIntegration.displayName ||
                        "Company pending"
                      : "Not active",
                },
                {
                  label: "Last activity",
                  value:
                    activeErpProvider === ERP_PROVIDER.TALLY
                      ? formatDateTime(erpIntegration.lastActivityAt)
                      : "Never",
                },
                {
                  label: "Connector",
                  value:
                    activeErpProvider === ERP_PROVIDER.TALLY
                      ? erpIntegration.details?.connectorName ||
                        erpIntegration.details?.connectorStatus ||
                        "Connector pending"
                      : "—",
                },
                {
                  label: "Last heartbeat",
                  value:
                    activeErpProvider === ERP_PROVIDER.TALLY
                      ? formatDateTime(erpIntegration.details?.lastHeartbeatAt)
                      : "—",
                },
              ]}
            />
          </div>
        </CollapsibleIntegrationSection>
      ) : null}

      {!canViewGmail && !canViewErp ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            You do not have access to any integration providers.
          </CardContent>
        </Card>
      ) : null}

      {isFetching ? (
        <p className="text-xs text-muted-foreground">Refreshing integration state...</p>
      ) : null}
    </div>
  );
};

export default IntegrationsOverview;
