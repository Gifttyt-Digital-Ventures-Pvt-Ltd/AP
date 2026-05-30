import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ReportsTooltip from '../ReportsTooltip';

const TdsBySectionChart = ({ sectionBreakdown = [], formatCurrency, formatFullCurrency }) => {
  if (sectionBreakdown.length === 0) return null;

  return (
    <div>
      <h4 className="font-medium mb-3">TDS by Section</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={sectionBreakdown} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="section" width={80} tick={{ fontSize: 12 }} />
          <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
          <Bar dataKey="tds_amount" fill="#6366f1" name="TDS Amount" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TdsBySectionChart;
