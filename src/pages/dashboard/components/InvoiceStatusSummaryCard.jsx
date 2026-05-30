import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

const InvoiceStatusSummaryCard = ({ stats }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">Invoice Status</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex justify-between items-center p-2 bg-emerald-50 rounded">
          <span className="text-sm">Approved</span>
          <span className="font-semibold text-emerald-600">{stats?.approved_invoices || 0}</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
          <span className="text-sm">Amount Released</span>
          <span className="font-semibold text-blue-600">{stats?.paid_invoices || 0}</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
          <span className="text-sm">Pending Payment</span>
          <span className="font-semibold text-yellow-600">{stats?.approved_invoices || 0}</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default InvoiceStatusSummaryCard;
