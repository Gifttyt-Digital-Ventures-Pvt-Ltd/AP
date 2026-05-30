import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';

const TopVendorsList = ({ vendorBreakdown = [], formatFullCurrency }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Top Vendors</CardTitle>
      <CardDescription>By total spend</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {vendorBreakdown.slice(0, 10).map((vendor, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                {idx + 1}
              </div>
              <div>
                <p className="font-medium text-sm">{vendor.name}</p>
                <p className="text-xs text-muted-foreground">{vendor.total_invoices} invoices</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatFullCurrency(vendor.total_amount)}</p>
              <p className="text-xs text-green-600">{formatFullCurrency(vendor.paid_amount)} paid</p>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default TopVendorsList;
