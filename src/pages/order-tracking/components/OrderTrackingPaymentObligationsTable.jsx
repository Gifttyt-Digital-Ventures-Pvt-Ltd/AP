import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { formatCurrency } from "../../../utils/currency";
import { formatDate } from "../utils";

/**
 * Stage · Scheduled · Triggered · Paid · Status · Due Date (spec §12.3).
 * Explicitly includes Triggered and Paid — a Scheduled-only table makes
 * Outstanding untraceable, per the spec's own gap callout. `status` uses the
 * internal obligation state machine vocabulary, not the SOW's Due/Discounted
 * set — see docs/order-tracking-api-contract.md §3.3 for why that choice
 * isn't a full reconciliation of spec §17's open item.
 */
const OBLIGATION_STATUS_COLORS = {
  PENDING: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  TRIGGERED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  APPROVED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  PARTIALLY_PAID: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-muted text-muted-foreground",
  WAIVED: "bg-muted text-muted-foreground",
};

const OrderTrackingPaymentObligationsTable = ({ obligations, currency }) => (
  <div className="overflow-x-auto rounded-md border border-border" data-testid="order-tracking-payment-obligations">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Stage</TableHead>
          <TableHead className="text-right">Scheduled</TableHead>
          <TableHead className="text-right">Triggered</TableHead>
          <TableHead className="text-right">Paid</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Due Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {obligations.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-4 text-center text-sm text-muted-foreground">
              No payment obligations recorded.
            </TableCell>
          </TableRow>
        ) : (
          obligations.map((obligation, index) => (
            <TableRow key={`${obligation.stage}-${index}`}>
              <TableCell className="font-medium">{obligation.stage}</TableCell>
              <TableCell className="text-right">{formatCurrency(obligation.scheduled, currency)}</TableCell>
              <TableCell className="text-right">{formatCurrency(obligation.triggered, currency)}</TableCell>
              <TableCell className="text-right">{formatCurrency(obligation.paid, currency)}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`border-0 font-medium ${OBLIGATION_STATUS_COLORS[obligation.status] || ""}`}>
                  {obligation.status || "-"}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(obligation.dueDate)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
);

export default OrderTrackingPaymentObligationsTable;
