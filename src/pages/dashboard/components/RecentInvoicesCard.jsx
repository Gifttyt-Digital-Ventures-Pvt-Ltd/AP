import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Receipt, ArrowRight } from 'lucide-react';
import { getStatusBadgeVariant } from '../utils/dashboardFormatters';

const RecentInvoicesCard = ({ invoices = [], formatFullCurrency }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Recent Invoices</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {invoices.length > 0 ? (
          <div className="space-y-3">
            {invoices.map((invoice, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{invoice.invoice_number || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.vendor_name || 'Unknown Vendor'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatFullCurrency(invoice.amount)}</p>
                  <Badge variant={getStatusBadgeVariant(invoice.status)} className="text-xs">
                    {invoice.status?.split(' ')[0] || 'Unknown'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">No recent invoices</div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentInvoicesCard;
