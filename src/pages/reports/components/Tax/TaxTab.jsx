import React from 'react';
import GstSummaryCard from './GstSummaryCard';
import TdsSummaryCard from './TdsSummaryCard';

const TaxTab = ({ taxData, formatCurrency, formatFullCurrency }) => {
  if (!taxData) return null;

  return (
    <>
      <GstSummaryCard
        gstData={taxData.gst}
        formatCurrency={formatCurrency}
        formatFullCurrency={formatFullCurrency}
      />
      <TdsSummaryCard
        tdsData={taxData.tds}
        formatCurrency={formatCurrency}
        formatFullCurrency={formatFullCurrency}
      />
    </>
  );
};

export default TaxTab;
