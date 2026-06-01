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
    <CardContent className="pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Payment Progress</h3>
          <p className="text-sm text-muted-foreground">Track your payment completion</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-600">{formatFullCurrency(paidValue)}</p>
          <p className="text-sm text-muted-foreground">of {formatFullCurrency(totalValue)} paid</p>
        </div>
      </div>
      <Progress value={paidPercentage} className="h-3" />
      <div className="flex justify-between mt-2 text-sm">
        <span className="text-green-600">Paid: {paidPercentage.toFixed(1)}%</span>
        <span className="text-yellow-600">Pending: {formatFullCurrency(pendingValue)}</span>
      </div>
    </CardContent>
  </Card>
);

export default PaymentProgressCard;
