import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

const PaymentSummaryCard = ({ stats, formatFullCurrency }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">Payment Summary</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex justify-between items-center p-2 bg-muted rounded">
          <span className="text-sm">Total Amount</span>
          <span className="font-semibold">{formatFullCurrency(stats?.total_amount || 0)}</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
          <span className="text-sm">Amount Released</span>
          <span className="font-semibold text-blue-600">
            {formatFullCurrency(stats?.paid_amount || 0)}
          </span>
        </div>
        <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
          <span className="text-sm">Pending Payment</span>
          <span className="font-semibold text-yellow-600">
            {formatFullCurrency(stats?.pending_amount || 0)}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default PaymentSummaryCard;
