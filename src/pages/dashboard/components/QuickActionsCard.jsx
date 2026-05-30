import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import {
  FileText,
  ShoppingCart,
  Building2,
  Layers,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

const QuickActionsCard = ({ showPaymentBatches }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => navigate('/invoices')}
          data-testid="quick-action-invoices"
        >
          <FileText className="h-4 w-4 mr-3 text-indigo-600" />
          Upload Invoice
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => navigate('/purchase-orders')}
          data-testid="quick-action-po"
        >
          <ShoppingCart className="h-4 w-4 mr-3 text-blue-600" />
          Create Purchase Order
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => navigate('/vendors')}
          data-testid="quick-action-vendor"
        >
          <Building2 className="h-4 w-4 mr-3 text-emerald-600" />
          Add New Vendor
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
        {showPaymentBatches && (
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate('/payments')}
            data-testid="quick-action-batch"
          >
            <Layers className="h-4 w-4 mr-3 text-purple-600" />
            Create Payment Batch
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => navigate('/reports')}
          data-testid="quick-action-reports"
        >
          <BarChart3 className="h-4 w-4 mr-3 text-orange-600" />
          View Reports
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuickActionsCard;
