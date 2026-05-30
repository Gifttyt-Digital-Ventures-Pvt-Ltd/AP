import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Layers } from 'lucide-react';

const PaymentBatchesCard = ({ paymentBatchStats, formatCompactCurrency }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-lg flex items-center gap-2">
        <Layers className="h-5 w-5 text-purple-600" />
        Payment Batches
      </CardTitle>
    </CardHeader>
    <CardContent>
      {paymentBatchStats ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center p-2 bg-muted rounded">
            <span className="text-sm">Total Batches</span>
            <span className="font-semibold">{paymentBatchStats.total_batches || 0}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
            <span className="text-sm">Pending</span>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
              {paymentBatchStats.pending?.count ?? paymentBatchStats.pending ?? 0}
            </Badge>
          </div>
          <div className="flex justify-between items-center p-2 bg-green-50 rounded">
            <span className="text-sm">Completed</span>
            <Badge variant="outline" className="bg-green-100 text-green-700">
              {paymentBatchStats.completed?.count || 0}
            </Badge>
          </div>
          <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
            <span className="text-sm">Total Processed</span>
            <span className="font-semibold text-blue-600">
              {formatCompactCurrency(paymentBatchStats.completed?.amount || 0)}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-4">No batch data available</div>
      )}
    </CardContent>
  </Card>
);

export default PaymentBatchesCard;
