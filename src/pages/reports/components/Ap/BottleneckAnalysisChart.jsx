import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ReportsTooltip from '../ReportsTooltip';

const BottleneckAnalysisChart = ({ bottleneckAnalysis = [], formatFullCurrency }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Approval Bottleneck Analysis</CardTitle>
      <CardDescription>Invoices stuck at each stage</CardDescription>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={bottleneckAnalysis} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="stage" width={130} tick={{ fontSize: 12 }} />
          <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
          <Bar dataKey="count" name="Invoices" radius={[0, 4, 4, 0]}>
            {bottleneckAnalysis.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.count > 5 ? '#ef4444' : entry.count > 2 ? '#f59e0b' : '#22c55e'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default BottleneckAnalysisChart;
