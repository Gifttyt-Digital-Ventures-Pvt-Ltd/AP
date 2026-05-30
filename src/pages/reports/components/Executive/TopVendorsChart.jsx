import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ReportsTooltip from '../ReportsTooltip';

const TopVendorsChart = ({ topVendors = [], formatCurrency, formatFullCurrency }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Top Vendors by Spend</CardTitle>
      <CardDescription>Highest spending vendors in the period</CardDescription>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={topVendors.slice(0, 8)} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
          <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
          <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} name="Spend" />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default TopVendorsChart;
