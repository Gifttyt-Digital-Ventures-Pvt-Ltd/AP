import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2, Search } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import AppDataTable from "../../../components/common/AppDataTable";
import { Input } from "../../../components/ui/input";
import {
  useGetCoaTreeQuery,
} from "../../../Services/apis/accountingApi";
import {
  flattenLedgersFromTree,
  formatCurrencyCompact,
  getAccountingErrorMessage,
} from "../utils/coaUtils";

const LedgerExplorer = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch } = useGetCoaTreeQuery();
  const ledgers = useMemo(
    () => flattenLedgersFromTree(data?.tree || []),
    [data?.tree],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ledgers;
    return ledgers.filter(
      (row) =>
        row.name?.toLowerCase().includes(query) ||
        row.category?.toLowerCase().includes(query) ||
        row.group?.toLowerCase().includes(query) ||
        row.code?.toLowerCase().includes(query),
    );
  }, [ledgers, search]);

  const totalSpend = ledgers.reduce((sum, row) => sum + Number(row.spend || 0), 0);

  const columns = useMemo(
    () => [
      {
        key: "category",
        header: "Category",
        cellClassName: "text-muted-foreground",
        render: (row) => row.category || "—",
      },
      {
        key: "group",
        header: "Group",
        cellClassName: "text-muted-foreground",
        render: (row) => row.group || "—",
      },
      {
        key: "name",
        header: "Ledger",
        cellClassName: "font-medium text-primary",
      },
      {
        key: "spend",
        header: "Spend",
        cellClassName: "font-semibold",
        render: (row) => formatCurrencyCompact(row.spend),
      },
      {
        key: "vendors",
        header: "Vendors",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (row) => row.vendors ?? 0,
      },
      {
        key: "invoices",
        header: "Invoices",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (row) => row.invoices ?? 0,
      },
      {
        key: "lineItems",
        header: "Line Items",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (row) => row.lineItems ?? 0,
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col" data-testid="accounting-page">
      <div className="border-b bg-card px-1 pb-4">
        <button
          type="button"
          onClick={() => navigate("/accounting")}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold font-['Manrope'] text-primary">Ledger Explorer</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {ledgers.length} ledgers · Total Spend:{" "}
              <span className="font-medium text-foreground">
                {formatCurrencyCompact(totalSpend)}
              </span>
            </p>
          </div>
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ledger…"
              className="pl-9"
              data-testid="ledger-explorer-search"
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <Card className="shadow-sm">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {getAccountingErrorMessage(error, "Failed to load ledgers.")}
              <div className="mt-4">
                <Button variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <AppDataTable
                columns={columns}
                rows={filtered}
                rowKey="id"
                emptyMessage="No ledgers found."
                getRowClassName={() => "cursor-pointer hover:bg-muted/50"}
                getRowProps={(row) => ({
                  onClick: () =>
                    navigate(`/accounting/ledger-explorer/${encodeURIComponent(row.id)}`),
                })}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LedgerExplorer;
