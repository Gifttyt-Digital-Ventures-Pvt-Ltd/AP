import React, { useState } from 'react';
import { useGetInvoicesQuery, useGetVendorsQuery } from '../../Services/apis/invoicesVendorsApi';
import {
  useGetGstEntriesQuery,
  useGetGstSummaryQuery,
  useGetTdsEntriesQuery,
  useGetTdsSummaryQuery,
  useGetTdsSectionsQuery,
  useCalculateGstMutation,
  useCalculateTdsMutation,
  useGenerateForm16aMutation,
} from '../../Services/apis/taxApi';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  Search,
  Calculator,
  FileText,
  Download,
  CheckCircle,
  Clock,
  IndianRupee,
  Loader2,
  Receipt,
  Building2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import GstCalculationDialog from './components/GstCalculationDialog';
import TdsCalculationDialog from './components/TdsCalculationDialog';
import Form16ADialog from './components/Form16ADialog';
import { useActionGuard } from '../../hooks/useActionGuard';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry'
];

const TaxManagement = () => {
  const [activeTab, setActiveTab] = useState('gst');
  
  // GST State
  const {
    data: gstEntriesData = [],
    isLoading: gstEntriesLoading,
    isFetching: gstEntriesFetching,
    refetch: refetchGstEntries,
  } = useGetGstEntriesQuery();
  const {
    data: gstSummary = null,
    isLoading: gstSummaryLoading,
    isFetching: gstSummaryFetching,
    refetch: refetchGstSummary,
  } = useGetGstSummaryQuery();
  const {
    data: invoicesData = [],
    isLoading: invoicesLoading,
    isFetching: invoicesFetching,
    refetch: refetchInvoices,
  } = useGetInvoicesQuery();
  const {
    data: vendorsData = [],
    isLoading: vendorsLoading,
    isFetching: vendorsFetching,
    refetch: refetchVendors,
  } = useGetVendorsQuery();
  
  // TDS State
  const {
    data: tdsEntriesData = [],
    isLoading: tdsEntriesLoading,
    isFetching: tdsEntriesFetching,
    refetch: refetchTdsEntries,
  } = useGetTdsEntriesQuery();
  const {
    data: tdsSummary = null,
    isLoading: tdsSummaryLoading,
    isFetching: tdsSummaryFetching,
    refetch: refetchTdsSummary,
  } = useGetTdsSummaryQuery();
  const {
    data: tdsSectionsData = [],
    isLoading: tdsSectionsLoading,
    isFetching: tdsSectionsFetching,
    refetch: refetchTdsSections,
  } = useGetTdsSectionsQuery();
  const [tdsCertificates, setTdsCertificates] = useState([]);
  const [calculateGst] = useCalculateGstMutation();
  const [calculateTds] = useCalculateTdsMutation();
  const [generateForm16a] = useGenerateForm16aMutation();
  const { guardAction, canPerformAction } = useActionGuard();
  
  // Dialog States
  const [showGstCalcDialog, setShowGstCalcDialog] = useState(false);
  const [showTdsCalcDialog, setShowTdsCalcDialog] = useState(false);
  const [showForm16ADialog, setShowForm16ADialog] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const canManageTax = canPerformAction('tax.calculateGst');
  
  // Forms
  const [gstForm, setGstForm] = useState({
    invoice_id: '',
    vendor_gstin: '',
    place_of_supply: '',
    taxable_amount: 0,
    gst_rate: 18,
    is_reverse_charge: false
  });
  
  const [tdsForm, setTdsForm] = useState({
    invoice_id: '',
    section_code: '194C',
    base_amount: 0,
    is_company: false
  });
  
  const [form16AForm, setForm16AForm] = useState({
    vendor_id: '',
    fiscal_year: '2024-25',
    quarter: 'Q4'
  });

  const gstEntries = Array.isArray(gstEntriesData) ? gstEntriesData : [];
  const invoices = Array.isArray(invoicesData) ? invoicesData : [];
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];
  const tdsEntries = Array.isArray(tdsEntriesData) ? tdsEntriesData : [];
  const tdsSections = Array.isArray(tdsSectionsData) ? tdsSectionsData : [];

  const loading =
    gstEntriesLoading ||
    gstSummaryLoading ||
    tdsEntriesLoading ||
    tdsSummaryLoading ||
    tdsSectionsLoading ||
    invoicesLoading ||
    vendorsLoading;

  const fetchData = async () => {
    try {
      await Promise.all([
        refetchGstEntries(),
        refetchGstSummary(),
        refetchTdsEntries(),
        refetchTdsSummary(),
        refetchTdsSections(),
        refetchInvoices(),
        refetchVendors(),
      ]);
    } catch (error) {
      console.error('Error refreshing tax data:', error);
      toast.error('Failed to refresh tax data');
    }
  };

  const handleCalculateGST = async () => {
    if (!guardAction('tax.calculateGst')) return;
    if (!gstForm.invoice_id || !gstForm.place_of_supply || gstForm.taxable_amount <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setCalculating(true);
    try {
      const data = await calculateGst(gstForm).unwrap();
      toast.success(`GST calculated: ${formatCurrency(data?.entry?.total_gst)}`);
      setShowGstCalcDialog(false);
      setGstForm({
        invoice_id: '',
        vendor_gstin: '',
        place_of_supply: '',
        taxable_amount: 0,
        gst_rate: 18,
        is_reverse_charge: false
      });
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to calculate GST');
    } finally {
      setCalculating(false);
    }
  };

  const handleCalculateTDS = async () => {
    if (!guardAction('tax.calculateTds')) return;
    if (!tdsForm.invoice_id || !tdsForm.section_code || tdsForm.base_amount <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setCalculating(true);
    try {
      const data = await calculateTds(tdsForm).unwrap();
      toast.success(`TDS calculated: ${formatCurrency(data?.entry?.total_tds)}`);
      setShowTdsCalcDialog(false);
      setTdsForm({
        invoice_id: '',
        section_code: '194C',
        base_amount: 0,
        is_company: false
      });
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to calculate TDS');
    } finally {
      setCalculating(false);
    }
  };

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
      setForm16AForm({ vendor_id: '', fiscal_year: '2024-25', quarter: 'Q4' });
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to generate Form 16A');
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] rounded-xl border border-border bg-card/50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Loading tax data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tax-management-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Tax Management</h1>
          <p className="text-muted-foreground">Manage GST and TDS compliance</p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="gst" data-testid="tab-gst">GST</TabsTrigger>
          <TabsTrigger value="tds" data-testid="tab-tds">TDS</TabsTrigger>
          <TabsTrigger value="certificates" data-testid="tab-certificates">Certificates</TabsTrigger>
        </TabsList>

        {/* GST Tab */}
        <TabsContent value="gst" className="space-y-6">
          {/* GST Summary Cards */}
          {gstSummary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Taxable</p>
                      <p className="text-xl font-bold">{formatCurrency(gstSummary.total_taxable)}</p>
                    </div>
                    <IndianRupee className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">CGST Collected</p>
                      <p className="text-xl font-bold">{formatCurrency(gstSummary.total_cgst)}</p>
                    </div>
                    <Receipt className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">SGST Collected</p>
                      <p className="text-xl font-bold">{formatCurrency(gstSummary.total_sgst)}</p>
                    </div>
                    <Receipt className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">IGST Collected</p>
                      <p className="text-xl font-bold">{formatCurrency(gstSummary.total_igst)}</p>
                    </div>
                    <Receipt className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* GST Actions */}
          <div className="flex gap-2">
            <Button onClick={() => setShowGstCalcDialog(true)} data-testid="calc-gst-btn" disabled={!canManageTax}>
              <Calculator className="h-4 w-4 mr-2" />
              Calculate GST
            </Button>
          </div>

          {/* GST Entries Table */}
          <Card>
            <CardHeader>
              <CardTitle>GST Entries</CardTitle>
              <CardDescription>Input Tax Credit (ITC) eligible entries</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Place of Supply</TableHead>
                    <TableHead>Taxable Amt</TableHead>
                    <TableHead>CGST</TableHead>
                    <TableHead>SGST</TableHead>
                    <TableHead>IGST</TableHead>
                    <TableHead>Total GST</TableHead>
                    <TableHead>ITC</TableHead>
                    <TableHead>GSTR-2A</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gstEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        No GST entries found. Calculate GST for an invoice to create entries.
                      </TableCell>
                    </TableRow>
                  ) : (
                    gstEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.invoice_number || '-'}</TableCell>
                        <TableCell>{entry.vendor_name || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{entry.vendor_gstin || '-'}</TableCell>
                        <TableCell>{entry.place_of_supply || '-'}</TableCell>
                        <TableCell>{formatCurrency(entry.taxable_amount)}</TableCell>
                        <TableCell>{formatCurrency(entry.cgst_amount)}</TableCell>
                        <TableCell>{formatCurrency(entry.sgst_amount)}</TableCell>
                        <TableCell>{formatCurrency(entry.igst_amount)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(entry.total_gst)}</TableCell>
                        <TableCell>
                          {entry.itc_eligible ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Eligible
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              Not Eligible
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.gstr2a_matched ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TDS Tab */}
        <TabsContent value="tds" className="space-y-6">
          {/* TDS Summary Cards */}
          {tdsSummary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Base Amount</p>
                      <p className="text-xl font-bold">{formatCurrency(tdsSummary.total_base_amount)}</p>
                    </div>
                    <IndianRupee className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">TDS Deducted</p>
                      <p className="text-xl font-bold">{formatCurrency(tdsSummary.total_tds_deducted)}</p>
                    </div>
                    <Receipt className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">TDS Deposited</p>
                      <p className="text-xl font-bold">{formatCurrency(tdsSummary.total_tds_deposited)}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Deposit</p>
                      <p className="text-xl font-bold">{formatCurrency(tdsSummary.pending_deposit)}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TDS Actions */}
          <div className="flex gap-2">
            <Button onClick={() => setShowTdsCalcDialog(true)} data-testid="calc-tds-btn" disabled={!canManageTax}>
              <Calculator className="h-4 w-4 mr-2" />
              Calculate TDS
            </Button>
            <Button variant="outline" onClick={() => setShowForm16ADialog(true)} data-testid="generate-form16a-btn" disabled={!canManageTax}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Form 16A
            </Button>
          </div>

          {/* TDS Sections Reference */}
          <Card>
            <CardHeader>
              <CardTitle>TDS Sections Reference</CardTitle>
              <CardDescription>Applicable TDS rates by section</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Individual Rate</TableHead>
                    <TableHead>Company Rate</TableHead>
                    <TableHead>Single Threshold</TableHead>
                    <TableHead>Annual Threshold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tdsSections.map((section) => (
                    <TableRow key={section.id}>
                      <TableCell className="font-medium">{section.section_code}</TableCell>
                      <TableCell>{section.description}</TableCell>
                      <TableCell>{section.rate_individual}%</TableCell>
                      <TableCell>{section.rate_company}%</TableCell>
                      <TableCell>{formatCurrency(section.threshold_single)}</TableCell>
                      <TableCell>{formatCurrency(section.threshold_annual)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* TDS Entries Table */}
          <Card>
            <CardHeader>
              <CardTitle>TDS Entries</CardTitle>
              <CardDescription>TDS deductions and deposits</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Base Amount</TableHead>
                    <TableHead>TDS Rate</TableHead>
                    <TableHead>TDS Amount</TableHead>
                    <TableHead>Total TDS</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Challan</TableHead>
                    <TableHead>Quarter</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tdsEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No TDS entries found. Calculate TDS for an invoice to create entries.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tdsEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.section_code}</TableCell>
                        <TableCell>{entry.vendor_name || '-'}</TableCell>
                        <TableCell>{formatCurrency(entry.base_amount)}</TableCell>
                        <TableCell>{entry.tds_rate}%</TableCell>
                        <TableCell>{formatCurrency(entry.tds_amount)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(entry.total_tds)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={entry.status === 'Deposited' ? 'default' : 'secondary'}
                            className={entry.status === 'Deposited' ? 'bg-green-500' : ''}
                          >
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{entry.challan_number || '-'}</TableCell>
                        <TableCell>{entry.quarter}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>TDS Certificates (Form 16A)</CardTitle>
              <CardDescription>Generated TDS certificates for vendors</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificate No.</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Fiscal Year</TableHead>
                    <TableHead>Quarter</TableHead>
                    <TableHead>Total Payment</TableHead>
                    <TableHead>TDS Deducted</TableHead>
                    <TableHead>TDS Deposited</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tdsCertificates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No TDS certificates generated yet. Generate Form 16A for vendors.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tdsCertificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium font-mono">{cert.certificate_number}</TableCell>
                        <TableCell>{cert.vendor_name}</TableCell>
                        <TableCell>{cert.fiscal_year}</TableCell>
                        <TableCell>{cert.quarter}</TableCell>
                        <TableCell>{formatCurrency(cert.total_payment)}</TableCell>
                        <TableCell>{formatCurrency(cert.total_tds_deducted)}</TableCell>
                        <TableCell>{formatCurrency(cert.total_tds_deposited)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{cert.status}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(cert.certificate_date)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

            <GstCalculationDialog
        open={showGstCalcDialog}
        setOpen={setShowGstCalcDialog}
        gstForm={gstForm}
        setGstForm={setGstForm}
        invoices={invoices}
        formatCurrency={formatCurrency}
        indianStates={INDIAN_STATES}
        calculating={calculating}
        handleCalculateGST={handleCalculateGST}
        canManageTax={canManageTax}
      />

            <TdsCalculationDialog
        open={showTdsCalcDialog}
        setOpen={setShowTdsCalcDialog}
        tdsForm={tdsForm}
        setTdsForm={setTdsForm}
        invoices={invoices}
        tdsSections={tdsSections}
        formatCurrency={formatCurrency}
        calculating={calculating}
        handleCalculateTDS={handleCalculateTDS}
        canManageTax={canManageTax}
      />

            <Form16ADialog
        open={showForm16ADialog}
        setOpen={setShowForm16ADialog}
        form16AForm={form16AForm}
        setForm16AForm={setForm16AForm}
        vendors={vendors}
        calculating={calculating}
        handleGenerateForm16A={handleGenerateForm16A}
        canManageTax={canManageTax}
      />
    </div>
  );
};

export default TaxManagement;
