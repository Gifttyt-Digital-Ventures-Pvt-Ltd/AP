import React from "react";
import { Card, CardContent } from "../../../components/ui/card";

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
  <Card className={`${cardClassName} h-full`}>
    <CardContent className="p-4 flex flex-col justify-between h-full">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground font-medium leading-tight">{label}</p>
        <div className={`p-1.5 rounded-lg shrink-0 ${iconWrapperClassName}`}>
          <Icon className={`h-4 w-4 ${iconClassName}`} />
        </div>
      </div>
      <div className="mt-3">
        <p
          className={`text-2xl font-bold tracking-tight ${valueClassName}`}
          data-testid={testId}
        >
          {value}
        </p>
      </div>
    </CardContent>
  </Card>
);

export default DashboardMetricCard;
