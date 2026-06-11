import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import ReportsTooltip from '../ReportsTooltip';
import { CHART_COLORS } from '../../utils/reportsConstants';

const SpendByCategoryChart = ({ categoryDistribution = [], formatFullCurrency }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Spend by Category</CardTitle>
      <CardDescription>Vendor category breakdown</CardDescription>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={categoryDistribution}
            cx="50%"
            cy="50%"
            outerRadius={100}
            dataKey="amount"
            label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
            labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
          >
            {categoryDistribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
        </PieChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default SpendByCategoryChart;
