import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Receipt, ArrowRight } from 'lucide-react';
import { getStatusBadgeVariant } from '../utils/dashboardFormatters';
import InvoiceDueDateIndicators from '../../invoices/components/InvoiceDueDateIndicators';
import { normalizeInvoiceOverdueFields } from '../../invoices/utils/invoiceDueDate';

const toRecentInvoiceRow = (invoice = {}) => ({
  ...invoice,
  invoiceNumber: invoice.invoice_number ?? invoice.invoiceNumber,
  vendorName: invoice.vendor_name ?? invoice.vendorName,
  dueDate: invoice.due_date ?? invoice.dueDate,
  status: invoice.status,
  amount: invoice.amount,
  currency: invoice.currency,
  ...normalizeInvoiceOverdueFields(invoice),
});

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
            {invoices.map((rawInvoice, idx) => {
              const invoice = toRecentInvoiceRow(rawInvoice);

              return (
                <div
                  key={invoice.id ?? idx}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Receipt className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {invoice.invoiceNumber || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {invoice.vendorName || 'Unknown Vendor'}
                      </p>
                      <InvoiceDueDateIndicators invoice={invoice} className="mt-1" />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">{formatFullCurrency(invoice.amount)}</p>
                    <Badge variant={getStatusBadgeVariant(invoice.status)} className="text-xs">
                      {invoice.status?.split(' ')[0] || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">No recent invoices</div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentInvoicesCard;
