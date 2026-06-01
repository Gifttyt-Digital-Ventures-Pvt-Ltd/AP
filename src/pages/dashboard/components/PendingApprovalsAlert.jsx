import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Bell, ArrowRight } from 'lucide-react';

const PendingApprovalsAlert = ({ pendingApprovals = [], formatFullCurrency }) => {
  const navigate = useNavigate();

  if (pendingApprovals.length === 0) return null;

  return (
    <Card className="border-yellow-200 bg-yellow-50/50">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-yellow-600" />
            Pending Your Approval ({pendingApprovals.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/approvals')}>
            Review All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pendingApprovals.slice(0, 3).map((invoice, idx) => (
            <div key={idx} className="p-3 bg-white rounded-lg border border-yellow-200">
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium text-sm">{invoice.invoice_number}</p>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 text-xs">
                  Pending
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{invoice.vendor_name}</p>
              <p className="font-semibold">{formatFullCurrency(invoice.amount)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingApprovalsAlert;
