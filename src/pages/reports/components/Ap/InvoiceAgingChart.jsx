import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ReportsTooltip from '../ReportsTooltip';

const InvoiceAgingChart = ({ agingReport = [], formatCurrency, formatFullCurrency }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Invoice Aging Report</CardTitle>
      <CardDescription>Outstanding invoices by days overdue</CardDescription>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={agingReport}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
          <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
          <Legend />
          <Bar yAxisId="left" dataKey="count" fill="#6366f1" name="Count" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="right" dataKey="amount" fill="#22c55e" name="Amount" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default InvoiceAgingChart;
