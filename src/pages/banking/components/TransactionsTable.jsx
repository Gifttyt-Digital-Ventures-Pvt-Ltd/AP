import React from 'react';
import { ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

// Main transactions table with debit/credit splits and author metadata.
const TransactionsTable = ({ filteredTransactions }) => (
  <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
    <table className="w-full" data-testid="transactions-table">
      <thead className="border-b border-border bg-muted/50">
        <tr>
          <th className="p-4 text-left text-sm font-medium">Vendor/Payer</th>
          <th className="p-4 text-left text-sm font-medium">Date</th>
          <th className="p-4 text-left text-sm font-medium">Ref. No.</th>
          <th className="p-4 text-right text-sm font-medium">
            <span className="flex items-center justify-end gap-1">
              Withdrawals(Dr)
              <ChevronDown className="h-4 w-4" />
            </span>
          </th>
          <th className="p-4 text-right text-sm font-medium">
            <span className="flex items-center justify-end gap-1">
              Deposits(Cr)
              <ChevronDown className="h-4 w-4" />
            </span>
          </th>
          <th className="p-4 text-right text-sm font-medium">
            <span className="flex items-center justify-end gap-1">
              Closing Balance
              <ChevronDown className="h-4 w-4" />
            </span>
          </th>
          <th className="p-4 text-left text-sm font-medium">Authorized By</th>
        </tr>
      </thead>
      <tbody>
        {filteredTransactions.map((transaction) => (
          <tr
            key={transaction.id}
            className="border-b border-border hover:bg-muted/50 transition-colors"
            data-testid={`transaction-row-${transaction.id}`}
          >
            <td className="p-4">
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
            </td>
            <td className="p-4 text-sm">
              <div>
                <p>{format(transaction.date, 'd MMM yyyy')}</p>
                <p className="text-xs text-muted-foreground">{format(transaction.date, 'h:mm a')}</p>
              </div>
            </td>
            <td className="p-4 text-sm font-['JetBrains_Mono']">{transaction.ref_number}</td>
            <td className="p-4 text-right font-['JetBrains_Mono'] font-semibold">
              {transaction.withdrawal ? `\u20B9${transaction.withdrawal.toLocaleString('en-IN')}` : '-'}
            </td>
            <td className="p-4 text-right font-['JetBrains_Mono'] font-semibold text-emerald-600">
              {transaction.deposit ? `+ \u20B9${transaction.deposit.toLocaleString('en-IN')}` : '-'}
            </td>
            <td className="p-4 text-right font-['JetBrains_Mono'] font-semibold">
              {'\u20B9'}
              {transaction.closing_balance.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
            <td className="p-4">
              {transaction.authorized_by ? (
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
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {filteredTransactions.length === 0 && (
      <div className="text-center py-8 text-muted-foreground" data-testid="no-transactions">
        No transactions found
      </div>
    )}
  </div>
);

export default TransactionsTable;
