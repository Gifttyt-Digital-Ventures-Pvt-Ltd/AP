import React from 'react';
import { TabsList, TabsTrigger } from '../../../components/ui/tabs';
import {
  BarChart3,
  FileText,
  Building2,
  Calculator,
  CreditCard,
} from 'lucide-react';

const ReportsTabsList = ({
  canViewExecutiveReports,
  canViewApReports,
  canViewVendorReports,
  canViewTaxReports,
  canViewPaymentReports,
}) => (
  <TabsList className="flex w-full max-w-3xl flex-wrap">
    {canViewExecutiveReports && (
      <TabsTrigger value="executive" data-testid="tab-executive">
        <BarChart3 className="h-4 w-4 mr-2" />
        Executive
      </TabsTrigger>
    )}
    {canViewApReports && (
      <TabsTrigger value="ap" data-testid="tab-ap">
        <FileText className="h-4 w-4 mr-2" />
        AP Reports
      </TabsTrigger>
    )}
    {canViewVendorReports && (
      <TabsTrigger value="vendor" data-testid="tab-vendor">
        <Building2 className="h-4 w-4 mr-2" />
        Vendors
      </TabsTrigger>
    )}
    {canViewTaxReports && (
      <TabsTrigger value="tax" data-testid="tab-tax">
        <Calculator className="h-4 w-4 mr-2" />
        Tax
      </TabsTrigger>
    )}
    {canViewPaymentReports && (
      <TabsTrigger value="payment" data-testid="tab-payment">
        <CreditCard className="h-4 w-4 mr-2" />
        Payments
      </TabsTrigger>
    )}
  </TabsList>
);

export default ReportsTabsList;
