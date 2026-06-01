import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import DashboardTooltip from './DashboardTooltip';

const SpendingTrendChart = ({ monthlyTrend = [], formatCompactCurrency, formatFullCurrency }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-lg flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        Spending Trend (Last 6 Months)
      </CardTitle>
    </CardHeader>
    <CardContent>
      {monthlyTrend.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyTrend}>
            <defs>
              <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatCompactCurrency} tick={{ fontSize: 11 }} />
            <Tooltip content={<DashboardTooltip formatFullCurrency={formatFullCurrency} />} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#6366f1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSpend)"
              name="Spend"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[220px] flex items-center justify-center text-muted-foreground">
          No spending data available
        </div>
      )}
    </CardContent>
  </Card>
);

export default SpendingTrendChart;
