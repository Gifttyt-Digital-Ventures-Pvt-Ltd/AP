import React from 'react';

const DashboardTooltip = ({ active, payload, label, formatFullCurrency }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}:{' '}
            {typeof entry.value === 'number' && entry.value > 100
              ? formatFullCurrency(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default DashboardTooltip;
