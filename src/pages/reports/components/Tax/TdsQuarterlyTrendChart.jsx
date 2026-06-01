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

const TdsQuarterlyTrendChart = ({ quarterlyTrend = [], formatCurrency, formatFullCurrency }) => {
  if (quarterlyTrend.length === 0) return null;

  return (
    <div>
      <h4 className="font-medium mb-3">Quarterly Trend</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={quarterlyTrend}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="period" tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
          <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
          <Legend />
          <Bar dataKey="deducted" fill="#3b82f6" name="Deducted" />
          <Bar dataKey="deposited" fill="#22c55e" name="Deposited" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TdsQuarterlyTrendChart;
