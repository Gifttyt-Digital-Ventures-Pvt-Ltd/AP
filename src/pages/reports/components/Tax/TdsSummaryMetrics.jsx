import React from 'react';

const TdsSummaryMetrics = ({ summary, formatCurrency }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <div className="p-3 bg-muted rounded-lg">
      <p className="text-xs text-muted-foreground">Base Amount</p>
      <p className="text-lg font-bold">{formatCurrency(summary.total_base_amount)}</p>
    </div>
    <div className="p-3 bg-blue-50 rounded-lg">
      <p className="text-xs text-blue-600">TDS Deducted</p>
      <p className="text-lg font-bold text-blue-700">{formatCurrency(summary.total_deducted)}</p>
    </div>
    <div className="p-3 bg-green-50 rounded-lg">
      <p className="text-xs text-green-600">TDS Deposited</p>
      <p className="text-lg font-bold text-green-700">{formatCurrency(summary.total_deposited)}</p>
    </div>
    <div className="p-3 bg-red-50 rounded-lg">
      <p className="text-xs text-red-600">Pending Deposit</p>
      <p className="text-lg font-bold text-red-700">{formatCurrency(summary.pending_deposit)}</p>
    </div>
  </div>
);

export default TdsSummaryMetrics;
