import React, { useId } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const TaxChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border bg-background p-3 shadow-md">
      <p className="mb-1 text-sm font-medium">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
          {entry.unit || ''}
        </p>
      ))}
    </div>
  );
};

export const TdsMonthlyTrendChart = ({ data = [], variant = 'bar' }) => {
  const uid = useId().replace(/:/g, '');

  if (variant === 'area') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`${uid}-deducted`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${uid}-deposited`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit="L" />
          <Tooltip content={<TaxChartTooltip />} />
          <Legend />
          <Area type="monotone" dataKey="deducted" stroke="#6366f1" fill={`url(#${uid}-deducted)`} name="Deducted (L)" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="deposited" stroke="#22c55e" fill={`url(#${uid}-deposited)`} name="Deposited (L)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} unit="L" />
        <Tooltip content={<TaxChartTooltip />} />
        <Legend />
        <Bar dataKey="deducted" fill="#3b82f6" name="Deducted (L)" unit="L" />
        <Bar dataKey="deposited" fill="#22c55e" name="Deposited (L)" unit="L" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const TdsVendorBarChart = ({ data = [] }) => {
  const chartData = data.map((item) => ({
    name: item.vendor || item.name,
    amount: item.amount,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit="L" />
        <Tooltip content={<TaxChartTooltip />} />
        <Bar dataKey="amount" fill="#6366f1" name="TDS (L)" unit="L" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const TdsSectionChart = ({ data = [] }) => (
  <ResponsiveContainer width="100%" height={240}>
    <BarChart data={data} layout="vertical">
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis type="number" tick={{ fontSize: 12 }} unit="%" />
      <YAxis type="category" dataKey="section" width={70} tick={{ fontSize: 12 }} />
      <Tooltip content={<TaxChartTooltip />} />
      <Bar dataKey="value" fill="#6366f1" name="Share" unit="%" radius={[0, 4, 4, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

export const TdsSectionPieChart = ({ data = [] }) => (
  <div>
    <ResponsiveContainer width="100%" height={140}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" stroke="none">
          {data.map((entry) => (
            <Cell key={entry.section || entry.name} fill={entry.color || '#6366f1'} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
      </PieChart>
    </ResponsiveContainer>
    <div className="mt-2 space-y-1">
      {data.map((entry) => (
        <div key={entry.section || entry.name} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color || '#6366f1' }} />
            <span>{entry.section || entry.name}</span>
          </div>
          <span className="font-semibold">{entry.value}%</span>
        </div>
      ))}
    </div>
  </div>
);
