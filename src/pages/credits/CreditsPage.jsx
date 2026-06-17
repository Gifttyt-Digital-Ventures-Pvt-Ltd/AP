import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Coins, History, RefreshCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ActionRateList from "@/components/credits/ActionRateList";
import CreditAmount, { formatCredits } from "@/components/credits/CreditAmount";
import CreditSettingsPanel from "@/components/credits/CreditSettingsPanel";
import LedgerTable from "@/components/credits/LedgerTable";
import TokenTopUpRequestDialog from "@/components/credits/TokenTopUpRequestDialog";
import { useRBAC } from "@/contexts/RBACContext";
import { parseCreditAmount } from "@/utils/creditMath";
import {
  useGetClientActionTypesQuery,
  useGetClientLedgerQuery,
  useGetClientWalletQuery,
} from "@/Services/apis/creditsApi";

const LEDGER_TYPES = [
  "ALL",
  "TOP_UP",
  "BONUS",
  "DEDUCTION",
  "REFUND",
  "WITHDRAWAL",
  "ADJUSTMENT",
];

const LEDGER_VIEW_PERMISSIONS = [
  "credits-ledger",
  "credits-manage",
  "VIEW_LEDGER",
  "MANAGE_BILLING",
];
const HISTORY_LEDGER_PAGE_SIZE = 25;

const formatWalletUpdatedAt = (value) => {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const getLedgerMeta = (ledger) => {
  const page = Math.max(Number(ledger?.page) || 1, 1);
  const pageSize = Math.max(Number(ledger?.pageSize) || HISTORY_LEDGER_PAGE_SIZE, 1);
  const total = Math.max(Number(ledger?.total) || 0, 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = total === 0 ? 0 : Math.min(page * pageSize, total);

  return { page, pageSize, total, totalPages, startRecord, endRecord };
};

const LedgerPagination = ({ ledger, onPageChange, testIdPrefix = "credits-ledger" }) => {
  const { page, total, totalPages, startRecord, endRecord } = getLedgerMeta(ledger);

  const visiblePageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    const start = Math.min(Math.max(page - 2, 1), totalPages - 4);
    return Array.from({ length: 5 }, (_, index) => start + index);
  }, [page, totalPages]);

  if (total === 0) return null;

  if (totalPages <= 1) {
    return (
      <p className="text-sm text-muted-foreground" data-testid={`${testIdPrefix}-pagination-summary`}>
        Showing {startRecord}-{endRecord} of {total.toLocaleString("en-IN")} entries
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground" data-testid={`${testIdPrefix}-pagination-summary`}>
        Showing {startRecord}-{endRecord} of {total.toLocaleString("en-IN")} entries
      </p>
      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onPageChange(page - 1);
              }}
              className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
              data-testid={`${testIdPrefix}-pagination-previous`}
            />
          </PaginationItem>
          {visiblePageNumbers.map((pageNumber) => (
            <PaginationItem key={pageNumber}>
              <PaginationLink
                href="#"
                isActive={pageNumber === page}
                onClick={(event) => {
                  event.preventDefault();
                  onPageChange(pageNumber);
                }}
                data-testid={`${testIdPrefix}-pagination-page-${pageNumber}`}
              >
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onPageChange(page + 1);
              }}
              className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
              data-testid={`${testIdPrefix}-pagination-next`}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

const CreditsPage = () => {
  const { hasAnyPermission, canPerformAction } = useRBAC();
  const canViewLedger = hasAnyPermission(LEDGER_VIEW_PERMISSIONS);
  const canManageBillingSettings = canPerformAction("billing.updateSettings");
  const canRequestTokens = canPerformAction("billing.requestTokens");
  const [activeTab, setActiveTab] = useState("overview");
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);
  const [ledgerType, setLedgerType] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ratesOpen, setRatesOpen] = useState(true);

  const {
    data: wallet,
    isLoading: walletLoading,
    refetch: refetchWallet,
  } = useGetClientWalletQuery();
  const {
    data: actionTypes,
    isLoading: actionTypesLoading,
    refetch: refetchActions,
  } = useGetClientActionTypesQuery();

  const ledgerParams = useMemo(
    () => ({
      ...(ledgerType !== "ALL" ? { type: ledgerType } : {}),
      from: fromDate || undefined,
      to: toDate || undefined,
      page: ledgerPage,
      pageSize: HISTORY_LEDGER_PAGE_SIZE,
    }),
    [fromDate, ledgerPage, ledgerType, toDate],
  );

  const {
    data: ledger,
    isLoading: ledgerLoading,
    refetch: refetchLedger,
  } = useGetClientLedgerQuery(ledgerParams, {
    skip: !canViewLedger || activeTab !== "history",
  });

  useEffect(() => {
    setLedgerPage(1);
  }, [ledgerType, fromDate, toDate]);

  useEffect(() => {
    if (canViewLedger || activeTab === "overview" || activeTab === "settings") return;
    setActiveTab("overview");
  }, [activeTab, canViewLedger]);

  const balance = parseCreditAmount(wallet?.balance);
  const lowBalanceThreshold = parseCreditAmount(wallet?.lowBalanceThreshold);
  const isLowBalance = lowBalanceThreshold > 0 && balance < lowBalanceThreshold;
  const walletUpdatedLabel = formatWalletUpdatedAt(wallet?.updatedAt);

  const refreshAll = () => {
    refetchWallet();
    refetchActions();
    if (canViewLedger && activeTab === "history") {
      refetchLedger();
    }
  };

  const handleHistoryPageChange = useCallback(
    (nextPage) => {
      const { totalPages } = getLedgerMeta(ledger);
      const clampedPage = Math.min(Math.max(nextPage, 1), Math.max(totalPages, 1));
      setLedgerPage(clampedPage);
    },
    [ledger],
  );

  const clearHistoryFilters = () => {
    setLedgerType("ALL");
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="space-y-6" data-testid="credits-page">
      <div className="flex flex-wrap justify-end gap-2">
        {canRequestTokens && (
          <Button onClick={() => setTopUpDialogOpen(true)}>
            <Coins className="mr-2 h-4 w-4" />
            Request tokens
          </Button>
        )}
        <Button variant="outline" onClick={refreshAll}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {isLowBalance && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Wallet balance is below threshold</AlertTitle>
          <AlertDescription>
            Available balance is {formatCredits(balance)} tokens. Arrange a
            top-up with Optifii to avoid hard blocks on paid actions.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {canViewLedger && <TabsTrigger value="history">History</TabsTrigger>}
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CreditAmount value={wallet?.balance || 0} className="text-3xl" />
                {!walletLoading && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {walletUpdatedLabel
                      ? `Last updated ${walletUpdatedLabel}`
                      : "Spendable prepaid tokens"}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lifetime spent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CreditAmount value={wallet?.totalSpent || 0} className="text-3xl" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Paid in
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CreditAmount value={wallet?.totalPaidIn || 0} className="text-3xl" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Refunded
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CreditAmount value={wallet?.totalRefunded || 0} className="text-3xl" />
              </CardContent>
            </Card>
          </div>

          <Collapsible open={ratesOpen} onOpenChange={setRatesOpen} asChild>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle>Action rates</CardTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    {ratesOpen ? (
                      <>
                        Collapse
                        <ChevronUp className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Expand
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <ActionRateList actionTypes={actionTypes} loading={actionTypesLoading} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>

        {canViewLedger && (
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <CardTitle>Transaction history</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <Select value={ledgerType} onValueChange={setLedgerType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Entry type" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEDGER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type === "ALL" ? "All entry types" : type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                  <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                  <Button variant="outline" onClick={clearHistoryFilters}>
                    Clear filters
                  </Button>
                </div>
                <LedgerTable ledger={ledger} loading={ledgerLoading} />
                <LedgerPagination
                  ledger={ledger}
                  onPageChange={handleHistoryPageChange}
                  testIdPrefix="credits-history-ledger"
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="settings" className="space-y-4">
          <CreditSettingsPanel
            wallet={wallet}
            canManage={canManageBillingSettings}
            onSaved={refetchWallet}
          />
        </TabsContent>
      </Tabs>

      <TokenTopUpRequestDialog
        open={topUpDialogOpen}
        onOpenChange={setTopUpDialogOpen}
        onRequested={refreshAll}
      />
    </div>
  );
};

export default CreditsPage;
