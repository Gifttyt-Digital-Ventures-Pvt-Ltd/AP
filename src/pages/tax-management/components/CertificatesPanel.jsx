import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { useGetVendorsQuery } from '../../../Services/apis/invoicesVendorsApi';
import { useGenerateForm16aMutation } from '../../../Services/apis/taxApi';
import { Button } from '../../../components/ui/button';
import { TabsContent } from '../../../components/ui/tabs';
import { Badge } from '../../../components/ui/badge';
import { TableCell, TableRow } from '../../../components/ui/table';
import AppDataTable from '../../../components/common/AppDataTable';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';
import { Calendar, FileCheck, FileText, Loader2, Users } from 'lucide-react';
import Form16ADialog from './Form16ADialog';
import { useActionGuard } from '../../../hooks/useActionGuard';
import { formatCurrency, formatDate } from '../utils/taxFormatting';
import { TaxKpiCard, TaxSectionCard } from './TaxUi';

const TDS_CERTIFICATES_TABLE_HEADER = [
  { key: 'certificate_number', title: 'Certificate No.', cellClassName: 'font-medium font-mono' },
  { key: 'vendor_name', title: 'Vendor' },
  { key: 'fiscal_year', title: 'Fiscal Year' },
  { key: 'quarter', title: 'Quarter' },
  { key: 'total_payment', title: 'Total Payment' },
  { key: 'total_tds_deducted', title: 'TDS Deducted' },
  { key: 'total_tds_deposited', title: 'TDS Deposited' },
  { key: 'status', title: 'Status' },
  { key: 'certificate_date', title: 'Date' },
];

const DEFAULT_FORM16A_FORM = {
  vendor_id: '',
  fiscal_year: '2024-25',
  quarter: 'Q4',
};

const renderTdsCertificateRow = (cert, rowIndex, headers) => (
  <TableRow
    key={cert.id ?? rowIndex}
    className={cn(rowIndex % 2 === 1 && 'bg-muted/20')}
    data-testid={`tds-certificate-row-${cert.id}`}
  >
    {headers.map((header) => {
      let value;

      switch (header.key) {
        case 'total_payment':
          value = formatCurrency(cert.total_payment);
          break;
        case 'total_tds_deducted':
          value = formatCurrency(cert.total_tds_deducted);
          break;
        case 'total_tds_deposited':
          value = formatCurrency(cert.total_tds_deposited);
          break;
        case 'status':
          value = <Badge variant="outline">{cert.status}</Badge>;
          break;
        case 'certificate_date':
          value = formatDate(cert.certificate_date);
          break;
        default:
          value = cert?.[header.key] ?? '-';
      }

      return (
        <TableCell key={header.key} className={cn('px-3 py-3', header.cellClassName)}>
          {value}
        </TableCell>
      );
    })}
  </TableRow>
);

const CertificatesPanel = forwardRef(({ enabled = true }, ref) => {
  const { guardAction, canPerformAction } = useActionGuard();
  const [tdsCertificates, setTdsCertificates] = useState([]);
  const [showForm16ADialog, setShowForm16ADialog] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [form16AForm, setForm16AForm] = useState(DEFAULT_FORM16A_FORM);
  const [generateForm16a] = useGenerateForm16aMutation();

  const {
    data: vendorsData = [],
    isLoading: vendorsLoading,
    isFetching: vendorsFetching,
    refetch: refetchVendors,
  } = useGetVendorsQuery(undefined, { skip: !enabled });

  const vendors = Array.isArray(vendorsData) ? vendorsData : [];
  const canGenerateForm16A = canPerformAction('tax.generateForm16a') && enabled;
  const loading = enabled && vendorsLoading;
  const isFetching = vendorsFetching;

  const refetch = async () => {
    await refetchVendors();
  };

  useImperativeHandle(ref, () => ({
    refetch,
    isFetching,
    openGenerateDialog: () => setShowForm16ADialog(true),
  }));

  const handleGenerateForm16A = async () => {
    if (!guardAction('tax.generateForm16a')) return;
    if (!form16AForm.vendor_id) {
      toast.error('Please select a vendor');
      return;
    }

    setCalculating(true);
    try {
      const data = await generateForm16a(form16AForm).unwrap();
      if (data?.certificate) {
        setTdsCertificates((prev) => [data.certificate, ...prev]);
      }
      toast.success(`Form 16A generated: ${data?.certificate?.certificate_number || ''}`);
      setShowForm16ADialog(false);
      setForm16AForm(DEFAULT_FORM16A_FORM);
      await refetch();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to generate Form 16A');
    } finally {
      setCalculating(false);
    }
  };

  if (!enabled) return null;

  if (loading) {
    return (
      <TabsContent value="certificates" className="space-y-6">
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">Loading certificates...</p>
          </div>
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="certificates" className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <TaxKpiCard label="Generated certificates" value={String(tdsCertificates.length)} sub="Live response only" icon={FileCheck} tone="green" />
        <TaxKpiCard label="Eligible vendors" value="0" sub="No live data" icon={Users} tone="blue" />
        <TaxKpiCard label="Default period" value="0" sub="No live data" icon={Calendar} tone="default" />
      </div>

      <TaxSectionCard
        icon={FileText}
        title="TDS Certificates (Form 16A)"
        description="Generated TDS certificates for vendors."
        actions={
          <Button
            variant="outline"
            onClick={() => setShowForm16ADialog(true)}
            data-testid="generate-form16a-btn"
            disabled={!canGenerateForm16A}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Form 16A
          </Button>
        }
      >
        <AppDataTable
          tableHeader={TDS_CERTIFICATES_TABLE_HEADER}
          tableData={tdsCertificates}
          renderRow={renderTdsCertificateRow}
          emptyMessage="No TDS certificates generated yet. Generate Form 16A for vendors."
        />
      </TaxSectionCard>

      <Form16ADialog
        open={showForm16ADialog}
        setOpen={setShowForm16ADialog}
        form16AForm={form16AForm}
        setForm16AForm={setForm16AForm}
        vendors={vendors}
        calculating={calculating}
        handleGenerateForm16A={handleGenerateForm16A}
        canManageTax={canGenerateForm16A}
      />
    </TabsContent>
  );
});

CertificatesPanel.displayName = 'CertificatesPanel';

export default CertificatesPanel;
