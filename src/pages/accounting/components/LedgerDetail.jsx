import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { useGetCoaTreeQuery, useGetLedgerQuery } from "../../../Services/apis/accountingApi";
import { ACCOUNT_STATUS, ERP_SOURCE_LABELS } from "../constants";
import {
  flattenLedgersFromTree,
  formatCurrencyCompact,
  formatDate,
  getAccountingErrorMessage,
  statusBadgeClass,
} from "../utils/coaUtils";

const LedgerDetail = () => {
  const { ledgerId } = useParams();
  const navigate = useNavigate();

  const { data: treeData } = useGetCoaTreeQuery();
  const { data, isLoading, isError, error } = useGetLedgerQuery(ledgerId, {
    skip: !ledgerId,
  });

  const treeLedgers = useMemo(
    () => flattenLedgersFromTree(treeData?.tree || []),
    [treeData?.tree],
  );
  const treeRow = treeLedgers.find((row) => row.id === ledgerId);

  const ledger = data?.ledger || treeRow;
  const transactions = data?.transactions || [];

  const connectedLabel =
    (treeData?.connectedErp || [])
      .map((source) => ERP_SOURCE_LABELS[source] || source)
      .join(" + ") || "—";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="accounting-page">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !ledger) {
    return (
      <div className="space-y-4" data-testid="accounting-page">
        <button
          type="button"
          onClick={() => navigate("/accounting/ledger-explorer")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Ledger Explorer
        </button>
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">
            {isError
              ? getAccountingErrorMessage(error, "This ledger could not be loaded.")
              : "This ledger could not be loaded."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="accounting-page">
      <button
        type="button"
        onClick={() => navigate("/accounting/ledger-explorer")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Ledger Explorer
      </button>

      <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={() => navigate("/accounting/ledger-explorer")}
          className="text-primary hover:underline"
        >
          Ledger Explorer
        </button>
        {treeRow?.category ? (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>{treeRow.category}</span>
          </>
        ) : null}
        {treeRow?.group || ledger.parentGroup ? (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>{treeRow?.group || ledger.parentGroup}</span>
          </>
        ) : null}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-foreground">{ledger.name}</span>
      </div>

      <div className="rounded-xl border p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ledger
            </p>
            <h1 className="text-2xl font-bold font-['Manrope'] text-primary">{ledger.name}</h1>
          </div>
          <Badge
            variant="outline"
            className={statusBadgeClass(ledger.status || ACCOUNT_STATUS.ACTIVE)}
          >
            {ledger.status || ACCOUNT_STATUS.ACTIVE}
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ["Ledger Code", ledger.code],
            ["ERP", connectedLabel],
            ["ERP ID", ledger.erpId],
            ["Category", treeRow?.category],
            ["Parent Group", ledger.parentGroup || treeRow?.group],
            ["Ledger Type", ledger.ledgerType],
            ["Status", ledger.status || ACCOUNT_STATUS.ACTIVE],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-sm font-medium">{value || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Spend", value: formatCurrencyCompact(ledger.spend) },
          { label: "Vendors", value: ledger.vendors ?? 0 },
          { label: "Invoices", value: ledger.invoices ?? 0 },
          { label: "Line Items", value: ledger.lineItems ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Transactions</h3>
          <span className="text-xs text-muted-foreground">Invoice → Line Item</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Line Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx, index) => (
                <TableRow key={`${tx.invoice}-${index}`}>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      {tx.invoice}
                      <ExternalLink className="h-3 w-3" />
                    </span>
                  </TableCell>
                  <TableCell>{tx.vendor}</TableCell>
                  <TableCell>{tx.item}</TableCell>
                  <TableCell>{tx.qty ?? "—"}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrencyCompact(tx.amount)}
                  </TableCell>
                  <TableCell>{formatDate(tx.date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadgeClass(tx.status)}>
                      {tx.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No transactions mapped to this ledger.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => navigate("/accounting/ledger-explorer")}>
          Back to explorer
        </Button>
      </div>
    </div>
  );
};

export default LedgerDetail;
