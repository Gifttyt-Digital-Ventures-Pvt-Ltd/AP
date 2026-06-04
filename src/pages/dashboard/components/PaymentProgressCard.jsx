import React from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';

const PaymentProgressCard = ({
  paidValue,
  totalValue,
  paidPercentage,
  pendingValue,
  formatFullCurrency,
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-semibold text-sm">Payment Progress</h3>
          <p className="text-xs text-muted-foreground">Track your payment completion</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-green-600">{formatFullCurrency(paidValue)}</p>
          <p className="text-xs text-muted-foreground">of {formatFullCurrency(totalValue)} paid</p>
        </div>
      </div>
      <Progress value={paidPercentage} className="h-2" />
      <div className="flex justify-between mt-1.5 text-xs">
        <span className="text-green-600 font-medium">Paid: {paidPercentage.toFixed(1)}%</span>
        <span className="text-yellow-600 font-medium">Pending: {formatFullCurrency(pendingValue)}</span>
      </div>
    </CardContent>
  </Card>
);

export default PaymentProgressCard;
