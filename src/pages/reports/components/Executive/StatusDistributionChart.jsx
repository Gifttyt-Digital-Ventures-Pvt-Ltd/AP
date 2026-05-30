import React from 'react';
import SharedStatusDistributionChart from '../../../../components/common/StatusDistributionChart';

const StatusDistributionChart = (props) => (
  <SharedStatusDistributionChart description="Breakdown by current status" {...props} />
);

export default StatusDistributionChart;
