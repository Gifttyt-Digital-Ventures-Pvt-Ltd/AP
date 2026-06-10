import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ReportsTooltip from '../ReportsTooltip';

const PaymentVolumeTrendChart = ({ paymentTrend = [], formatCurrency, formatFullCurrency }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Payment Volume Trend</CardTitle>
      <CardDescription>Daily payment activity</CardDescription>
    </CardHeader>
    <CardContent>
      {paymentTrend.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={paymentTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
            <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
            <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} name="Count" />
            <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#22c55e" strokeWidth={2} name="Amount" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[250px] text-muted-foreground">
          No payment trend data available
        </div>
      )}
    </CardContent>
  </Card>
);

export default PaymentVolumeTrendChart;
