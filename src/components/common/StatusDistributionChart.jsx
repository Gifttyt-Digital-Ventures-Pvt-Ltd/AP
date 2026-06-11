import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { STATUS_CHART_COLORS, STATUS_COLORS } from '../../utils/statusDistributionConstants';

const StatusDistributionTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const entry = payload[0].payload;

  return (
    <div className="rounded-md border border-border bg-white px-2 py-1 text-xs font-semibold shadow-md">
      {entry.name}
      <span className="ml-2 text-[10px] font-semibold text-muted-foreground">
        {entry.percentage}%
      </span>
    </div>
  );
};

const StatusDistributionChart = ({
  statusDistribution = [],
  title = 'Invoice Status Distribution',
  description,
  showIcon = false,
  centerLabel = 'Total invoices',
  legendTitle = 'Statuses',
  emptyMessage = 'No invoice data available',
  chartHeight = 230,
}) => {
  const total = useMemo(
    () => statusDistribution.reduce((sum, entry) => sum + (entry.value || 0), 0),
    [statusDistribution],
  );

  const chartData = useMemo(
    () =>
      statusDistribution.map((entry, index) => {
        const value = entry.value || 0;
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

        return {
          name: entry.name,
          value,
          color: STATUS_COLORS[entry.name] || STATUS_CHART_COLORS[index % STATUS_CHART_COLORS.length],
          percentage,
        };
      }),
    [statusDistribution, total],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          {showIcon ? <BarChart3 className="h-5 w-5 text-primary" /> : null}
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="mt-2 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-[230px] sm:w-1/2">
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-muted-foreground">{centerLabel}</p>
                <p className="text-lg font-bold">{total}</p>
              </div>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="70%"
                    outerRadius="95%"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<StatusDistributionTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full rounded-md border border-border p-4 sm:w-1/2">
              <p className="mb-2 text-xs font-semibold text-foreground">{legendTitle}</p>
              <div className="space-y-2">
                {chartData.map((entry, index) => (
                  <div key={index} className="flex w-full items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3.5 w-6 shrink-0 rounded-sm"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="truncate text-sm font-semibold text-muted-foreground">
                        {entry.name}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-semibold">{entry.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height: chartHeight }}
          >
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatusDistributionChart;
