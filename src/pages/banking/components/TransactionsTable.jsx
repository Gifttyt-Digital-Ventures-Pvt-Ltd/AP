import React from 'react';
import { ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import AppDataTable from '../../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../../components/ui/table';

const transactionTableHeader = [
  { key: 'vendor', title: 'Vendor/Payer' },
  { key: 'date', title: 'Date', cellClassName: 'text-sm' },
  { key: 'ref_number', title: 'Ref. No.', cellClassName: "text-sm font-['JetBrains_Mono']" },
  {
    key: 'withdrawal',
    title: (
      <span className="flex items-center justify-end gap-1">
        Withdrawals(Dr)
        <ChevronDown className="h-4 w-4" />
      </span>
    ),
    headerClassName: 'text-right',
    cellClassName: "text-right font-['JetBrains_Mono'] font-semibold",
  },
  {
    key: 'deposit',
    title: (
      <span className="flex items-center justify-end gap-1">
        Deposits(Cr)
        <ChevronDown className="h-4 w-4" />
      </span>
    ),
    headerClassName: 'text-right',
    cellClassName: "text-right font-['JetBrains_Mono'] font-semibold text-emerald-600",
  },
  {
    key: 'closing_balance',
    title: (
      <span className="flex items-center justify-end gap-1">
        Closing Balance
        <ChevronDown className="h-4 w-4" />
      </span>
    ),
    headerClassName: 'text-right',
    cellClassName: "text-right font-['JetBrains_Mono'] font-semibold",
  },
  { key: 'authorized_by', title: 'Authorized By' },
];

// Main transactions table with debit/credit splits and author metadata.
const TransactionsTable = ({ filteredTransactions }) => {
  const renderTransactionRow = (transaction, rowIndex, headers) => (
    <TableRow key={transaction.id ?? rowIndex} data-testid={`transaction-row-${transaction.id}`}>
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case 'vendor':
            value = (
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                    transaction.type === 'deposit' ? 'bg-emerald-500' : 'bg-primary'
                  }`}
                >
                  {transaction.type === 'deposit' ? (
                    <div className="flex flex-col items-center">
                      <span className="text-lg">+</span>
                      <span className="text-xs">IN</span>
                    </div>
                  ) : (
                    transaction.vendor.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-medium">{transaction.vendor}</p>
                  <p className="text-xs text-muted-foreground">{transaction.ref_number}</p>
                </div>
              </div>
            );
            break;
          case 'date':
            value = (
              <div>
                <p>{format(transaction.date, 'd MMM yyyy')}</p>
                <p className="text-xs text-muted-foreground">{format(transaction.date, 'h:mm a')}</p>
              </div>
            );
            break;
          case 'withdrawal':
            value = transaction.withdrawal ? `₹${transaction.withdrawal.toLocaleString('en-IN')}` : '-';
            break;
          case 'deposit':
            value = transaction.deposit ? `+ ₹${transaction.deposit.toLocaleString('en-IN')}` : '-';
            break;
          case 'closing_balance':
            value = `₹${transaction.closing_balance.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
            break;
          case 'authorized_by':
            value = transaction.authorized_by ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                  {transaction.authorized_by
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div className="text-sm">
                  <p className="font-medium">{transaction.authorized_by}</p>
                  <p className="text-xs text-muted-foreground">vinay@optifii.com</p>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            );
            break;
          default:
            value = transaction?.[header.key] || '-';
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
  <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden" data-testid="transactions-table">
    <AppDataTable
      tableHeader={transactionTableHeader}
      tableData={filteredTransactions}
      renderRow={renderTransactionRow}
      emptyMessage="No transactions found"
      emptyTestId="no-transactions"
    />
  </div>
  );
};

export default TransactionsTable;
