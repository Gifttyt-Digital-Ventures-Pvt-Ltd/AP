import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Calculator } from 'lucide-react';
import GstSummaryMetrics from './GstSummaryMetrics';
import GstMonthlyTrendChart from './GstMonthlyTrendChart';

const GstSummaryCard = ({ gstData, formatCurrency, formatFullCurrency }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg flex items-center gap-2">
        <Calculator className="h-5 w-5" />
        GST Summary
      </CardTitle>
    </CardHeader>
    <CardContent>
      <GstSummaryMetrics summary={gstData.summary} formatCurrency={formatCurrency} />
      <GstMonthlyTrendChart
        monthlyTrend={gstData.monthly_trend}
        formatCurrency={formatCurrency}
        formatFullCurrency={formatFullCurrency}
      />
    </CardContent>
  </Card>
);

export default GstSummaryCard;
