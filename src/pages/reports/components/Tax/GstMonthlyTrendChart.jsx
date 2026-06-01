import React from 'react';
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

const GstMonthlyTrendChart = ({ monthlyTrend = [], formatCurrency, formatFullCurrency }) => {
  if (monthlyTrend.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={monthlyTrend}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
        <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
        <Legend />
        <Bar dataKey="cgst" fill="#3b82f6" name="CGST" stackId="a" />
        <Bar dataKey="sgst" fill="#8b5cf6" name="SGST" stackId="a" />
        <Bar dataKey="igst" fill="#f97316" name="IGST" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default GstMonthlyTrendChart;
