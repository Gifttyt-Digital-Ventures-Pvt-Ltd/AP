import React from "react";
import { format } from "date-fns";
import AppDataTable from "../../../components/common/AppDataTable";
import { TableCell, TableRow } from "../../../components/ui/table";
import { formatCurrency } from "../../../utils/currency";
import PayoutStatusBadge from "./PayoutStatusBadge";

const payoutTableHeader = [
  { key: "vendorName", title: "Vendor", cellClassName: "font-medium" },
  { key: "mode", title: "Mode" },
  { key: "amount", title: "Amount" },
  { key: "normalizedStatus", title: "Status" },
  { key: "utr", title: "UTR" },
  { key: "initiatedAt", title: "Initiated" },
];

const PayoutTransactionsTable = ({ payouts = [], onRowClick }) => {
  const renderRow = (payout, rowIndex, headers) => (
    <TableRow
      key={payout.payoutId ?? rowIndex}
      className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
      onClick={() => onRowClick?.(payout)}
    >
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case "amount":
            value = formatCurrency(payout.amount, "INR");
            break;
          case "normalizedStatus":
            value = <PayoutStatusBadge status={payout.normalizedStatus} />;
            break;
          case "initiatedAt":
            value = payout.initiatedAt
              ? format(new Date(payout.initiatedAt), "dd MMM yyyy HH:mm")
              : "-";
            break;
          default:
            value = payout?.[header.key] || "-";
        }

        return (
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div
      className="bg-card border border-border rounded-lg shadow-sm overflow-hidden"
      data-testid="payout-transactions-table"
    >
      <AppDataTable
        tableHeader={payoutTableHeader}
        tableData={payouts}
        renderRow={renderRow}
        emptyMessage="No payout transactions yet"
      />
    </div>
  );
};

export default PayoutTransactionsTable;
