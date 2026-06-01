import React from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { TrendingDown, TrendingUp } from 'lucide-react';

// Reusable KPI card used across report tabs.
const MetricCard = ({ title, value, subtitle, icon: Icon, trend, color = 'text-primary' }) => (
  <Card>
    <CardContent className="pt-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-end">
          <Icon className={`h-8 w-8 ${color} opacity-80`} />
          {trend !== undefined && (
            <div className={`flex items-center mt-2 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default MetricCard;
