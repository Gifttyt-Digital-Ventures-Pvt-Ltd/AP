import React from 'react';

const GstSummaryMetrics = ({ summary, formatCurrency }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
    <div className="p-3 bg-muted rounded-lg">
      <p className="text-xs text-muted-foreground">Taxable Amount</p>
      <p className="text-lg font-bold">{formatCurrency(summary.total_taxable)}</p>
    </div>
    <div className="p-3 bg-blue-50 rounded-lg">
      <p className="text-xs text-blue-600">CGST</p>
      <p className="text-lg font-bold text-blue-700">{formatCurrency(summary.total_cgst)}</p>
    </div>
    <div className="p-3 bg-purple-50 rounded-lg">
      <p className="text-xs text-purple-600">SGST</p>
      <p className="text-lg font-bold text-purple-700">{formatCurrency(summary.total_sgst)}</p>
    </div>
    <div className="p-3 bg-orange-50 rounded-lg">
      <p className="text-xs text-orange-600">IGST</p>
      <p className="text-lg font-bold text-orange-700">{formatCurrency(summary.total_igst)}</p>
    </div>
    <div className="p-3 bg-indigo-50 rounded-lg">
      <p className="text-xs text-indigo-600">Total GST</p>
      <p className="text-lg font-bold text-indigo-700">{formatCurrency(summary.total_gst)}</p>
    </div>
    <div className="p-3 bg-green-50 rounded-lg">
      <p className="text-xs text-green-600">ITC Eligible</p>
      <p className="text-lg font-bold text-green-700">{formatCurrency(summary.itc_eligible)}</p>
    </div>
    <div className="p-3 bg-yellow-50 rounded-lg">
      <p className="text-xs text-yellow-600">ITC Pending</p>
      <p className="text-lg font-bold text-yellow-700">{formatCurrency(summary.itc_pending)}</p>
    </div>
  </div>
);

export default GstSummaryMetrics;
