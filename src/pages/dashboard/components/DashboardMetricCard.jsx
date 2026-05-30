import React from 'react';
import { Card, CardContent } from '../../../components/ui/card';

const DashboardMetricCard = ({
  icon: Icon,
  label,
  value,
  cardClassName,
  iconWrapperClassName,
  iconClassName,
  valueClassName,
  testId,
}) => (
  <Card className={cardClassName}>
    <CardContent className="pt-4 pb-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconWrapperClassName}`}>
          <Icon className={`h-5 w-5 ${iconClassName}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-xl font-bold ${valueClassName}`} data-testid={testId}>
            {value}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default DashboardMetricCard;
