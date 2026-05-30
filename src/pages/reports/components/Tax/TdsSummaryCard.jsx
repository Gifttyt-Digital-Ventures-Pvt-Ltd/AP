import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Receipt } from 'lucide-react';
import TdsSummaryMetrics from './TdsSummaryMetrics';
import TdsBySectionChart from './TdsBySectionChart';
import TdsQuarterlyTrendChart from './TdsQuarterlyTrendChart';

const TdsSummaryCard = ({ tdsData, formatCurrency, formatFullCurrency }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg flex items-center gap-2">
        <Receipt className="h-5 w-5" />
        TDS Summary
      </CardTitle>
    </CardHeader>
    <CardContent>
      <TdsSummaryMetrics summary={tdsData.summary} formatCurrency={formatCurrency} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TdsBySectionChart
          sectionBreakdown={tdsData.section_breakdown}
          formatCurrency={formatCurrency}
          formatFullCurrency={formatFullCurrency}
        />
        <TdsQuarterlyTrendChart
          quarterlyTrend={tdsData.quarterly_trend}
          formatCurrency={formatCurrency}
          formatFullCurrency={formatFullCurrency}
        />
      </div>
    </CardContent>
  </Card>
);

export default TdsSummaryCard;
