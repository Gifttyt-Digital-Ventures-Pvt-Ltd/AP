import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import ReportsTooltip from '../ReportsTooltip';
import { CHART_COLORS } from '../../utils/reportsConstants';

const PaymentMethodsChart = ({ paymentMethods = [], formatFullCurrency }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Payment Methods</CardTitle>
      <CardDescription>Distribution by payment type</CardDescription>
    </CardHeader>
    <CardContent>
      {paymentMethods.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={paymentMethods}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="amount"
              label={({ method, percent }) => `${method} (${(percent * 100).toFixed(0)}%)`}
            >
              {paymentMethods.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          No payment data available
        </div>
      )}
    </CardContent>
  </Card>
);

export default PaymentMethodsChart;
