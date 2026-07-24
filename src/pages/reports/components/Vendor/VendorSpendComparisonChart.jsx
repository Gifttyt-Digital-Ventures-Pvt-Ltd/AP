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

const MAX_WORDS_PER_LINE = 3;

// Recharts' default tick text is a single line at fontSize 10 / fill #666 /
// textAnchor middle. This mirrors those exact defaults so short names render
// identically to before, and only wraps onto a second line past 3 words.
const VendorNameTick = ({ x, y, payload }) => {
  const words = String(payload?.value ?? '').trim().split(/\s+/).filter(Boolean);
  const lines =
    words.length > MAX_WORDS_PER_LINE
      ? [
          words.slice(0, Math.ceil(words.length / 2)).join(' '),
          words.slice(Math.ceil(words.length / 2)).join(' '),
        ]
      : [words.join(' ')];

  return (
    <text x={x} y={y} textAnchor="middle" fontSize={10} fill="#666">
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index === 0 ? '0.71em' : '1em'}>
          {line}
        </tspan>
      ))}
    </text>
  );
};

const VendorSpendComparisonChart = ({ vendorBreakdown = [], formatCurrency, formatFullCurrency }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Vendor Spend Comparison</CardTitle>
      <CardDescription>Top 10 vendors by spend</CardDescription>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={vendorBreakdown.slice(0, 10)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={<VendorNameTick />} angle={0} textAnchor="middle" interval={0} height={80} />
          <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
          <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
          <Legend />
          <Bar dataKey="paid_amount" stackId="a" fill="#22c55e" name="Paid" radius={[0, 0, 0, 0]} />
          <Bar dataKey="pending_amount" stackId="a" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default VendorSpendComparisonChart;
