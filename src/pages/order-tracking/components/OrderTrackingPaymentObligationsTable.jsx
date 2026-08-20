import React, { useMemo } from "react";
import AppDataTable from "../../../components/common/AppDataTable";
import { Badge } from "../../../components/ui/badge";
import { formatCurrency } from "../../../utils/currency";
import { formatDate } from "../utils";
import { TableRow, TableCell } from "../../../components/ui/table";

/**
 * Stage · Scheduled · Triggered · Paid · Status · Due Date (spec §12.3).
 * Explicitly includes Triggered and Paid — a Scheduled-only table makes
 * Outstanding untraceable, per the spec's own gap callout. `status` uses the
 * internal obligation state machine vocabulary, not the SOW's Due/Discounted
 * set — see docs/order-tracking-api-contract.md §3.3 for why that choice
 * isn't a full reconciliation of spec §17's open item.
 */
const OBLIGATION_STATUS_COLORS = {
  PENDING:
    "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  TRIGGERED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  APPROVED:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  PARTIALLY_PAID:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-muted text-muted-foreground",
  WAIVED: "bg-muted text-muted-foreground",
};

const OrderTrackingPaymentObligationsTable = ({
  obligations = [],
  currency,
}) => {
  const columns = useMemo(
    () => [
      {
        key: "stage",
        header: "Stage",
        cellClassName: "font-medium",
      },
      {
        key: "scheduled",
        header: "Scheduled",
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
      {
        key: "triggered",
        header: "Triggered",
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
      {
        key: "paid",
        header: "Paid",
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
      // {
      //   key: "outstanding",
      //   header: "Outstanding",
      //   headerClassName: "text-right",
      //   cellClassName: "text-right font-medium",
      // },
      {
        key: "netPayable",
        header: "Net Payable",
        headerClassName: "text-right",
        cellClassName: "text-right font-semibold text-primary",
      },
      {
        key: "status",
        header: "Status",
      },
      {
        key: "dueDate",
        header: "Due Date",
      },
    ],
    [],
  );

  const renderRow = (row, rowIndex, headers) => {
    const scheduled = Number(row.scheduled || row.scheduled_amount || 0);
    const triggered = Number(row.triggered || row.triggered_amount || 0);
    const paid = Number(row.paid || row.paid_amount || 0);
    const outstanding =
      row.outstanding ??
      (triggered > 0
        ? Math.max(0, triggered - paid)
        : Math.max(0, scheduled - paid));
    const availableAdvance = Number(
      row.availableAdvance || row.advanceAdjustedAmount || 0,
    );
    const netPayable =
      row.netPayable ??
      Math.max(
        0,
        (triggered > 0 ? triggered : scheduled) - availableAdvance - paid,
      );
    const isTriggered =
      triggered > 0 || String(row.status || "").toUpperCase() === "TRIGGERED";
    const untriggeredReason =
      row.untriggeredReason ||
      row.untriggered_reason ||
      (!isTriggered ? "Document not approved / received" : null);

    const renderCell = (header) => {
      switch (header.key) {
        case "stage":
          return row.stage;
        case "scheduled":
          return formatCurrency(scheduled, currency);
        case "triggered":
          return formatCurrency(triggered, currency);
        case "paid":
          return formatCurrency(paid, currency);
        case "outstanding":
          return formatCurrency(outstanding, currency);
        case "netPayable":
          return formatCurrency(netPayable, currency);
        case "status":
          return (
            <div className="flex flex-col gap-1">
              <Badge
                variant="outline"
                className={`w-fit border-0 font-medium ${OBLIGATION_STATUS_COLORS[row.status] || ""}`}
              >
                {isTriggered ? row.status || "TRIGGERED" : "PENDING"}
              </Badge>
              {!isTriggered && untriggeredReason ? (
                <span className="text-[11px] text-muted-foreground">
                  {untriggeredReason}
                </span>
              ) : null}
            </div>
          );
        case "dueDate":
          return formatDate(row.dueDate);
        default:
          return "-";
      }
    };

    return (
      <TableRow key={`${row.stage}-${rowIndex}`}>
        {headers.map((header) => (
          <TableCell key={header.key} className={header.cellClassName}>
            {renderCell(header)}
          </TableCell>
        ))}
      </TableRow>
    );
  };

  return (
    <div
      className="overflow-x-auto rounded-md border border-border"
      data-testid="order-tracking-payment-obligations"
    >
      <AppDataTable
        columns={columns}
        rows={obligations}
        renderRow={renderRow}
        emptyMessage="No payment obligations recorded."
      />
    </div>
  );
};

export default OrderTrackingPaymentObligationsTable;
