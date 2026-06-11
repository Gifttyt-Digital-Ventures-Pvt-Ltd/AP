import React, { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import {
  useGetBankingPayoutsQuery,
  useGetBankingPayoutByIdQuery,
} from "../../../Services/apis/connectedBankingApi";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { isNonTerminalPayoutStatus } from "../utils/payoutStatus";
import PayoutTransactionsTable from "./TransactionsTable";
import TransactionDetailDrawer from "./TransactionDetailDrawer";

const POLL_INTERVAL_MS = 45000;

const BankTransactionsPanel = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayoutId, setSelectedPayoutId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    data: payouts = [],
    isLoading,
    isFetching,
    refetch,
  } = useGetBankingPayoutsQuery();

  const hasPendingPayouts = payouts.some((p) =>
    isNonTerminalPayoutStatus(p.normalizedStatus),
  );

  const { data: payoutDetail } = useGetBankingPayoutByIdQuery(selectedPayoutId, {
    skip: !selectedPayoutId,
  });

  const detailIsPending =
    payoutDetail && isNonTerminalPayoutStatus(payoutDetail.normalizedStatus);

  useEffect(() => {
    if (!hasPendingPayouts && !detailIsPending) return undefined;
    const timer = window.setInterval(() => {
      refetch();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [hasPendingPayouts, detailIsPending, refetch]);

  const filteredPayouts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return payouts;
    return payouts.filter(
      (p) =>
        String(p.vendorName || "").toLowerCase().includes(term) ||
        String(p.utr || "").toLowerCase().includes(term) ||
        String(p.mode || "").toLowerCase().includes(term),
    );
  }, [payouts, searchTerm]);

  const handleRowClick = (payout) => {
    setSelectedPayoutId(payout.payoutId);
    setDrawerOpen(true);
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Transactions refreshed");
    } catch {
      toast.error("Failed to refresh transactions");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const detailPayout =
    payoutDetail ||
    payouts.find((p) => p.payoutId === selectedPayoutId) ||
    null;

  return (
    <div data-testid="bank-transactions-panel" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          ICICI payout history with normalized lifecycle status
        </p>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search vendor, UTR, mode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <PayoutTransactionsTable payouts={filteredPayouts} onRowClick={handleRowClick} />

      <TransactionDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        payout={detailPayout}
      />
    </div>
  );
};

export default BankTransactionsPanel;
