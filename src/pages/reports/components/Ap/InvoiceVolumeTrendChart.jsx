import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ReportsTooltip from '../ReportsTooltip';

const InvoiceVolumeTrendChart = ({ volumeTrend = [], formatFullCurrency }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Invoice Volume Trend</CardTitle>
      <CardDescription>Daily invoice submissions</CardDescription>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={volumeTrend}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
          <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Invoices" />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default InvoiceVolumeTrendChart;
