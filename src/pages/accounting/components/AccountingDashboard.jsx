import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Database,
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { useActionGuard } from "../../../hooks/useActionGuard";
import {
  useGetAccountingReadyQueueQuery,
  useGetCoaTreeQuery,
  useSyncCoaMutation,
} from "../../../Services/apis/accountingApi";
import { ACC_STATUS, ERP_SOURCE_LABELS } from "../constants";
import {
  flattenLedgersFromTree,
  formatCurrencyCompact,
  formatDateTime,
  getAccountingErrorMessage,
} from "../utils/coaUtils";
import { PageShell } from "../utils/PageShell";
import ReadyForAccountingQueue from "./ReadyForAccountingQueue";

const WORKFLOW_LEGEND = [
  { label: ACC_STATUS.NOT_READY, className: "border-slate-200 bg-slate-100 text-slate-600" },
  { label: ACC_STATUS.READY, className: "border-blue-200 bg-blue-50 text-blue-700" },
  { label: ACC_STATUS.QUEUED, className: "border-amber-200 bg-amber-50 text-amber-800" },
  { label: ACC_STATUS.SYNCED, className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { label: ACC_STATUS.FAILED, className: "border-rose-200 bg-rose-50 text-rose-800" },
];

const AccountingDashboard = () => {
  const navigate = useNavigate();
  const { guardAction, canPerformAction } = useActionGuard();

  const { data: treeData, isLoading: treeLoading, isError: treeError } = useGetCoaTreeQuery();
  const { data: queueData, isLoading: queueLoading } = useGetAccountingReadyQueueQuery();
  const [syncCoa, { isLoading: syncing }] = useSyncCoaMutation();

  const ledgers = useMemo(
    () => flattenLedgersFromTree(treeData?.tree || []),
    [treeData?.tree],
  );
  const totalSpend = useMemo(
    () => ledgers.reduce((sum, row) => sum + Number(row.spend || 0), 0),
    [ledgers],
  );

  const queueItems = queueData?.items || [];
  const syncCounts = useMemo(
    () => ({
      synced: queueItems.filter((item) => item.accStatus === ACC_STATUS.SYNCED).length,
      queued: queueItems.filter((item) => item.accStatus === ACC_STATUS.QUEUED).length,
      failed: queueItems.filter((item) => item.accStatus === ACC_STATUS.FAILED).length,
    }),
    [queueItems],
  );

  const connectedLabel =
    (treeData?.connectedErp || [])
      .map((source) => ERP_SOURCE_LABELS[source] || source)
      .join(" + ") || "—";

  const handleSync = async () => {
    if (!guardAction("accounting.coa.sync")) return;
    try {
      const result = await syncCoa().unwrap();
      toast.success(result?.message || "Chart of Accounts sync completed");
    } catch (error) {
      toast.error(getAccountingErrorMessage(error, "Failed to sync Chart of Accounts"));
    }
  };

  return (
    <PageShell
      title="Accounting"
      subtitle="Sync your ERP, browse the chart of accounts, and push documents for posting"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Chart of Accounts */}
        <Card className="shadow-sm">
          <CardContent className="flex h-full flex-col gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Chart of Accounts
                </p>
                <p className="text-sm font-semibold text-foreground">{connectedLabel}</p>
              </div>
            </div>
            {treeLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : treeError ? (
              <p className="text-sm text-muted-foreground">Unable to load COA summary.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Accounts</p>
                  <p className="text-sm font-semibold">{treeData?.totalAccounts ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Sync</p>
                  <p className="text-sm font-semibold">
                    {formatDateTime(treeData?.lastSyncAt)}
                  </p>
                </div>
              </div>
            )}
            <div className="mt-auto flex gap-2">
              <Button
                className="flex-1"
                onClick={() => navigate("/accounting/chart-of-accounts")}
              >
                View COA
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
              {canPerformAction("accounting.coa.sync") ? (
                <Button variant="outline" onClick={handleSync} disabled={syncing}>
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">{syncing ? "Syncing…" : "Sync"}</span>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Ledger Explorer */}
        <Card className="shadow-sm">
          <CardContent className="flex h-full flex-col gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Ledger Explorer
                </p>
                <p className="text-sm font-semibold text-foreground">Operational View</p>
              </div>
            </div>
            {treeLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : treeError ? (
              <p className="text-sm text-muted-foreground">Unable to load ledger summary.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Ledgers</p>
                  <p className="text-sm font-semibold">{ledgers.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Spend</p>
                  <p className="text-sm font-semibold">{formatCurrencyCompact(totalSpend)}</p>
                </div>
              </div>
            )}
            <Button
              variant="secondary"
              className="mt-auto"
              onClick={() => navigate("/accounting/ledger-explorer")}
            >
              View Ledgers
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>

        {/* ERP Sync Status */}
        <Card className="border-primary/20 bg-primary text-primary-foreground shadow-sm md:col-span-2 xl:col-span-1">
          <CardContent className="flex h-full flex-col gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-primary-foreground/70">
                  ERP Sync Status
                </p>
                <p className="text-sm font-semibold">
                  {connectedLabel !== "—" ? `${connectedLabel} Connected` : "Not connected"}
                </p>
              </div>
            </div>
            {queueLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Synced", syncCounts.synced],
                  ["Queued", syncCounts.queued],
                  ["Failed", syncCounts.failed],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-white/10 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-primary-foreground/70">
                      {label}
                    </p>
                    <p className="text-xl font-bold">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workflow legend */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">Accounting Workflow:</span>
        {WORKFLOW_LEGEND.map(({ label, className }) => (
          <Badge key={label} variant="outline" className={className}>
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
            {label}
          </Badge>
        ))}
      </div>

      <ReadyForAccountingQueue />
    </PageShell>
  );
};

export default AccountingDashboard;
