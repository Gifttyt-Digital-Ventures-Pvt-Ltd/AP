import React from 'react';

// Shared recharts tooltip formatter for value-heavy report charts.
const ReportsTooltip = ({ active, payload, label, formatFullCurrency }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium text-sm">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' && entry.value > 100 ? formatFullCurrency(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default ReportsTooltip;
