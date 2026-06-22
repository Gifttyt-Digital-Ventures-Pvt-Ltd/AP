import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  BarChart2,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  FileText,
  Info,
  Loader2,
  Play,
  Receipt,
  RefreshCw,
  Shield,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import {
  TaxApiMeta,
  TaxCompactTable,
  TaxDetailGrid,
  TaxDrawer,
  TaxFilterBar,
  TaxKpiCard,
  TaxProgressRow,
  TaxSearchInput,
  TaxSectionCard,
  TaxSelect,
  TaxStatusBadge,
} from '../TaxUi';
import {
  TDS_RATES,
  TDS_REPORT_TYPES,
  tdsCsiFiles,
  tdsExceptions,
  tdsForm16aJobs,
  tdsFvuReturns,
  tdsMonthlyTrend,
  tdsRecentActivities,
  tdsReports,
  tdsSectionWise,
  tdsVendorWise,
} from '../../data/taxStaticData';
import { useGetVendorsQuery } from '../../../../Services/apis/invoicesVendorsApi';
import { formatCurrency } from '../../utils/taxFormatting';
import { TdsMonthlyTrendChart, TdsSectionChart, TdsSectionPieChart, TdsVendorBarChart } from './TdsCharts';

const TDS_SECTIONS = Object.keys(TDS_RATES).filter((key) => key !== 'Others');

function useVendorNameOptions(enabled = true) {
  const { data: vendorsData = [] } = useGetVendorsQuery(undefined, { skip: !enabled });
  return useMemo(() => {
    const list = Array.isArray(vendorsData) ? vendorsData : [];
    return list
      .map((vendor) => vendor.name ?? vendor.vendorName)
      .filter(Boolean);
  }, [vendorsData]);
}

const REPORT_ICONS = {
  'vendor-summary': Users,
  quarterly: BarChart2,
  'deduction-reg': FileText,
  'challan-reg': Receipt,
  compliance: Shield,
  exception: AlertCircle,
};

export const TdsOverviewPanels = () => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <TaxKpiCard label="Form 16A Generated" value="82" sub="Certificates (reference)" icon={FileText} />
      <TaxKpiCard label="Compliance Score" value="91%" sub="Above threshold" icon={Shield} tone="green" />
      <TaxKpiCard label="Active Vendors" value="24" sub="With TDS liability" icon={Users} tone="blue" />
    </div>

    <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_280px]">
      <TaxSectionCard icon={Calendar} title="Monthly TDS Trend" description="Deducted vs deposited by month (₹ Lakhs).">
        <TdsMonthlyTrendChart data={tdsMonthlyTrend} variant="area" />
      </TaxSectionCard>
      <TaxSectionCard icon={Users} title="Vendor-wise TDS" description="Top vendors by deduction (₹ Lakhs).">
        <TdsVendorBarChart data={tdsVendorWise} />
      </TaxSectionCard>
      <TaxSectionCard icon={BarChart2} title="TDS by Section" description="Distribution across sections.">
        <TdsSectionPieChart data={tdsSectionWise} />
      </TaxSectionCard>
    </div>

    <TaxSectionCard
      icon={BarChart2}
      title="Recent TDS Activities"
      description="Latest deductions and deposits"
      actions={
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      <TaxCompactTable
        rows={tdsRecentActivities}
        columns={[
          { key: 'vendor', title: 'Vendor' },
          { key: 'section', title: 'TDS Section', render: (row) => <TaxStatusBadge status={row.section} /> },
          { key: 'amount', title: 'Amount', render: (row) => formatCurrency(row.amount), cellClassName: 'text-right font-medium' },
          { key: 'date', title: 'Date', cellClassName: 'text-muted-foreground' },
          { key: 'status', title: 'Status', render: (row) => <TaxStatusBadge status={row.status} /> },
        ]}
      />
    </TaxSectionCard>
  </div>
);

export const TdsCalculatorPanel = ({ onCalculate, disabled }) => {
  const vendorOptions = useVendorNameOptions();
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('Company');
  const [amount, setAmount] = useState('');
  const [section, setSection] = useState('194C');
  const [panAvail, setPanAvail] = useState('Yes');
  const [payDate, setPayDate] = useState('');
  const [result, setResult] = useState(null);

  const handleLocalCalculate = () => {
    const paymentAmount = parseFloat(amount.replace(/,/g, '')) || 0;
    if (!paymentAmount) return;
    let rate = TDS_RATES[section]?.rate ?? 1;
    if (panAvail === 'No') rate = Math.min(rate * 2, 20);
    const tdsAmt = paymentAmount * (rate / 100);
    setResult({ rate, tdsAmt, net: paymentAmount - tdsAmt, desc: TDS_RATES[section]?.desc ?? '' });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">TDS Calculator</h3>
        <p className="text-sm text-muted-foreground">Calculate TDS before making vendor payments. Use the calculator for invoice-linked deductions.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <TaxSectionCard icon={Receipt} title="Payment Details" description="Enter payment information to calculate TDS.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <TaxSelect value={vendor || 'placeholder'} onValueChange={(value) => value !== 'placeholder' && setVendor(value)} options={[{ value: 'placeholder', label: 'Select vendor…' }, ...vendorOptions.map((name) => ({ value: name, label: name }))]} />
            </div>
            <div className="space-y-1.5">
              <Label>Vendor Category</Label>
              <TaxSelect value={category} onValueChange={setCategory} options={['Company', 'Individual', 'HUF', 'Firm']} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Amount (₹) *</Label>
              <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 5,00,000" />
            </div>
            <div className="space-y-1.5">
              <Label>TDS Section *</Label>
              <TaxSelect value={section} onValueChange={setSection} options={TDS_SECTIONS} />
            </div>
            <div className="space-y-1.5">
              <Label>PAN Available</Label>
              <TaxSelect value={panAvail} onValueChange={setPanAvail} options={['Yes', 'No']} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Date</Label>
              <Input type="date" value={payDate} onChange={(event) => setPayDate(event.target.value)} />
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Section <strong>{section}</strong> — {TDS_RATES[section]?.desc}. Standard rate: <strong>{TDS_RATES[section]?.rate}%</strong>
              {panAvail === 'No' ? ' · Higher rate applies — PAN not available' : ''}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={onCalculate} disabled={disabled}>
              Open Calculator
            </Button>
            <Button onClick={handleLocalCalculate} disabled={!amount.trim()}>
              <Zap className="mr-2 h-4 w-4" />
              Calculate TDS
            </Button>
          </div>
        </TaxSectionCard>

        <div className="space-y-4">
          {result ? (
            <>
              <TaxSectionCard icon={CheckCircle2} title="TDS Calculation Result">
                <div className="space-y-2">
                  {[
                    { label: 'TDS Rate', value: `${result.rate}%` },
                    { label: 'TDS Amount', value: formatCurrency(result.tdsAmt) },
                    { label: 'Net Payable Amount', value: formatCurrency(result.net), highlight: true },
                  ].map((row) => (
                    <div key={row.label} className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${row.highlight ? 'border-green-200 bg-green-50' : 'bg-muted/20'}`}>
                      <span>{row.label}</span>
                      <span className="font-semibold">{row.value}</span>
                    </div>
                  ))}
                </div>
              </TaxSectionCard>
              <TaxSectionCard icon={Receipt} title="Calculation Breakdown">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between rounded-md border bg-muted/20 px-3 py-2">
                    <span>Payment Amount</span>
                    <span className="font-semibold">{formatCurrency(parseFloat(amount.replace(/,/g, '')) || 0)}</span>
                  </div>
                  <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground" />
                  <div className="flex justify-between rounded-md border bg-muted/20 px-3 py-2">
                    <span>TDS Deduction</span>
                    <span className="font-semibold text-red-600">− {formatCurrency(result.tdsAmt)}</span>
                  </div>
                  <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground" />
                  <div className="flex justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2">
                    <span>Net Vendor Payment</span>
                    <span className="font-semibold text-green-700">{formatCurrency(result.net)}</span>
                  </div>
                </div>
              </TaxSectionCard>
            </>
          ) : (
            <TaxSectionCard icon={Zap} title="Enter payment details">
              <p className="text-sm text-muted-foreground">TDS rate is auto-applied based on the selected section. Higher rate applies if PAN is not available.</p>
            </TaxSectionCard>
          )}
        </div>
      </div>
    </div>
  );
};

export const TdsAnalyticsPanel = () => (
  <div className="space-y-4">
    <TaxFilterBar>
      <TaxSelect value="FY 2023-24" onValueChange={() => {}} options={['FY 2023-24', 'FY 2024-25']} />
      <TaxSelect value="All Quarters" onValueChange={() => {}} options={['All Quarters', 'Q1', 'Q2', 'Q3', 'Q4']} />
      <TaxSelect value="All Sections" onValueChange={() => {}} options={['All Sections', ...TDS_SECTIONS]} />
      <TaxSearchInput value="" onChange={() => {}} placeholder="Search vendor…" />
    </TaxFilterBar>
    <div className="grid gap-4 md:grid-cols-4">
      <TaxKpiCard label="Total Deductions" value="₹38.2L" sub="FY 2023-24" icon={Receipt} tone="default" />
      <TaxKpiCard label="Unique Vendors" value="24" sub="With TDS records" icon={Users} tone="blue" />
      <TaxKpiCard label="Average Deduction" value="₹1.59L" sub="Per vendor" icon={BarChart2} tone="green" />
      <TaxKpiCard label="Compliance Exceptions" value={String(tdsExceptions.length)} sub="Need attention" icon={AlertCircle} tone="amber" />
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <TaxSectionCard icon={Calendar} title="Monthly Deduction Trend">
        <TdsMonthlyTrendChart data={tdsMonthlyTrend} variant="area" />
      </TaxSectionCard>
      <TaxSectionCard icon={BarChart2} title="Section-wise Distribution">
        <div className="space-y-3">
          {tdsSectionWise.map((item) => (
            <TaxProgressRow key={item.section} label={`Section ${item.section}`} value={item.value} />
          ))}
        </div>
      </TaxSectionCard>
    </div>
    <TaxSectionCard icon={FileText} title="TDS by Section" description="Distribution of TDS deductions by section.">
      <TdsSectionChart data={tdsSectionWise} />
    </TaxSectionCard>
    <TaxSectionCard icon={AlertCircle} title="Compliance Exceptions" description="Vendors with TDS compliance items requiring action.">
      <TaxCompactTable
        rows={tdsExceptions}
        columns={[
          { key: 'vendor', title: 'Vendor' },
          { key: 'issue', title: 'Issue' },
          { key: 'severity', title: 'Severity', render: (row) => <TaxStatusBadge status={row.severity} /> },
          { key: 'amount', title: 'Amount', render: (row) => formatCurrency(row.amount), cellClassName: 'text-right' },
        ]}
      />
    </TaxSectionCard>
  </div>
);

export const TdsReportsPanel = () => {
  const vendorOptions = useVendorNameOptions();
  const [selectedReport, setSelectedReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState(tdsReports);

  const generate = () => {
    if (!selectedReport) return;
    setGenerating(true);
    window.setTimeout(() => {
      const reportType = TDS_REPORT_TYPES.find((item) => item.key === selectedReport);
      setReports((prev) => [
        { id: `rep-new-${Date.now()}`, name: `${reportType?.label ?? 'Report'} — Q3 FY24`, date: '20 Feb 2024', status: 'Processing' },
        ...prev,
      ]);
      setGenerating(false);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">TDS Reports</h3>
        <p className="text-sm text-muted-foreground">Generate and download TDS reports for compliance and audit purposes.</p>
      </div>

      <TaxSectionCard icon={Play} title="Generate Report">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <TaxSelect value="FY 2023-24" onValueChange={() => {}} options={['FY 2023-24', 'FY 2024-25']} />
          <TaxSelect value="Q3" onValueChange={() => {}} options={['All Quarters', 'Q1', 'Q2', 'Q3', 'Q4']} />
          <TaxSelect value="All Vendors" onValueChange={() => {}} options={['All Vendors', ...vendorOptions]} />
          <Button onClick={generate} disabled={!selectedReport || generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {generating ? 'Generating…' : 'Generate Report'}
          </Button>
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Select Report Type</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {TDS_REPORT_TYPES.map((report) => {
            const Icon = REPORT_ICONS[report.key] || FileText;
            const active = selectedReport === report.key;
            return (
              <button
                key={report.key}
                type="button"
                onClick={() => setSelectedReport(report.key)}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${active ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 hover:border-primary/30'}`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>
                  <span className={`block text-sm font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>{report.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{report.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </TaxSectionCard>

      <TaxSectionCard icon={FileText} title="Generated Reports" description="Download previously generated reports">
        <TaxCompactTable
          rows={reports}
          columns={[
            { key: 'name', title: 'Report Name' },
            { key: 'date', title: 'Generated Date', cellClassName: 'text-muted-foreground' },
            { key: 'status', title: 'Status', render: (row) => <TaxStatusBadge status={row.status} /> },
            {
              key: 'action',
              title: 'Download',
              render: (row) =>
                row.status === 'Completed' ? (
                  <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Download</Button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                ),
            },
          ]}
        />
      </TaxSectionCard>
    </div>
  );
};

export const TdsForm16aPanel = ({ onOpenCertificates }) => {
  const [records, setRecords] = useState(tdsForm16aJobs);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    window.setTimeout(() => {
      setRecords((prev) => [
        { id: `JOB-00${prev.length + 1}`, vendor: 'Nova Retail Pvt', quarter: 'Q3', fy: '2023-24', generated: '—', status: 'submitted' },
        ...prev,
      ]);
      setGenerating(false);
    }, 1400);
  };

  const statusCounts = useMemo(
    () => ({
      completed: records.filter((row) => row.status === 'completed').length,
      processing: records.filter((row) => row.status === 'processing').length,
      submitted: records.filter((row) => row.status === 'submitted').length,
      failed: records.filter((row) => row.status === 'failed').length,
    }),
    [records],
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Form 16A</h3>
        <p className="text-sm text-muted-foreground">Generate and manage TDS certificates (Form 16A) for vendors.</p>
      </div>

      <TaxSectionCard
        icon={FileCheck}
        title="Certificate Generation"
        actions={
          <>
            <Button variant="outline" onClick={onOpenCertificates}>Open Certificates</Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {generating ? 'Generating…' : 'Generate Form 16A'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: 'Completed', count: statusCounts.completed, tone: 'green' },
            { label: 'Processing', count: statusCounts.processing, tone: 'amber' },
            { label: 'Submitted', count: statusCounts.submitted, tone: 'blue' },
            { label: 'Failed', count: statusCounts.failed, tone: 'red' },
          ].map((item) => (
            <TaxKpiCard key={item.label} label={item.label} value={String(item.count)} tone={item.tone} icon={FileText} />
          ))}
        </div>
      </TaxSectionCard>

      <TaxSectionCard
        icon={FileText}
        title="Certificate Records"
        description="Form 16A generation history"
        meta={<TaxApiMeta synced="Today, 09:42 AM" count={String(records.length)} />}
      >
        <TaxCompactTable
          rows={records}
          columns={[
            { key: 'id', title: 'Job ID', cellClassName: 'font-mono text-xs' },
            { key: 'vendor', title: 'Vendor' },
            { key: 'quarter', title: 'Quarter' },
            { key: 'fy', title: 'Financial Year' },
            { key: 'generated', title: 'Generated Date', cellClassName: 'text-muted-foreground' },
            { key: 'status', title: 'Status', render: (row) => <TaxStatusBadge status={row.status} /> },
            {
              key: 'actions',
              title: 'Actions',
              render: (row) => (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedJob(row); setDrawerOpen(true); }}>
                    <Eye className="mr-1 h-4 w-4" />
                    View
                  </Button>
                  {row.status === 'completed' ? (
                    <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" />Download</Button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </TaxSectionCard>

      <TaxDrawer open={drawerOpen} onOpenChange={setDrawerOpen} title={`Form 16A Job — ${selectedJob?.id || ''}`}>
        {selectedJob ? (
          <div className="space-y-4">
            <TaxStatusBadge status={selectedJob.status} />
            <TaxDetailGrid
              items={[
                { label: 'Vendor', value: selectedJob.vendor },
                { label: 'Quarter', value: selectedJob.quarter },
                { label: 'Financial Year', value: selectedJob.fy },
                { label: 'Generated Date', value: selectedJob.generated },
                { label: 'TRACES Reference', value: 'ACK/TDS/2024/Q3/88421', mono: true },
                { label: 'Certificate Pages', value: '2 pages' },
              ]}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline"><Download className="mr-2 h-4 w-4" />Download PDF</Button>
              <Button size="sm" variant="outline" onClick={onOpenCertificates}>Generate Certificate</Button>
            </div>
          </div>
        ) : null}
      </TaxDrawer>
    </div>
  );
};

export const TdsFvuPanel = () => (
  <TaxSectionCard
    icon={FileCheck}
    title="FVU Generator"
    description="Prepare files required for TDS return filing with TRACES."
    actions={<Button><Play className="mr-2 h-4 w-4" />Generate FVU</Button>}
  >
    <TaxCompactTable
      rows={tdsFvuReturns}
      columns={[
        { key: 'form', title: 'Form' },
        { key: 'period', title: 'Period' },
        { key: 'records', title: 'Records', cellClassName: 'text-right' },
        { key: 'validation', title: 'Validation', render: (row) => `${row.validation}%`, cellClassName: 'text-right' },
        { key: 'status', title: 'Status', render: (row) => <TaxStatusBadge status={row.status} /> },
      ]}
    />
  </TaxSectionCard>
);

export const TdsCsiPanel = () => {
  const [step, setStep] = useState(1);
  const [tan, setTan] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const steps = ['Enter TAN', 'Verify OTP', 'Download CSI'];
  const statusItems = [
    { label: 'OTP Generated', done: step >= 2 },
    { label: 'OTP Verified', done: step >= 3 },
    { label: 'CSI Available', done: step >= 4 },
    { label: 'Download Complete', done: step >= 4 },
  ];

  const doAction = () => {
    setLoading(true);
    window.setTimeout(() => {
      setStep((current) => Math.min(current + 1, 4));
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">CSI Download</h3>
        <p className="text-sm text-muted-foreground">Download Challan Status Information (CSI) file from TRACES portal.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <TaxSectionCard icon={Shield} title="CSI Download Wizard">
          <div className="mb-6 flex items-center">
            {steps.map((label, index) => {
              const done = step > index + 1;
              const active = step === index + 1;
              return (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${done ? 'bg-green-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                    <span className={`text-xs ${active ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{label}</span>
                  </div>
                  {index < steps.length - 1 ? <div className={`mx-3 mb-5 h-0.5 flex-1 ${step > index + 1 ? 'bg-green-500' : 'bg-muted'}`} /> : null}
                </React.Fragment>
              );
            })}
          </div>

          {step === 1 ? (
            <div className="max-w-md space-y-4">
              <p className="text-sm text-muted-foreground">Enter the Tax Deduction Account Number (TAN) registered with TRACES to generate an OTP.</p>
              <div className="space-y-1.5">
                <Label>TAN Number *</Label>
                <Input value={tan} onChange={(event) => setTan(event.target.value)} placeholder="e.g. BLRG12345B" className="font-mono" />
              </div>
              <Button onClick={doAction} disabled={!tan.trim() || loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                {loading ? 'Generating OTP…' : 'Generate OTP'}
              </Button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="max-w-md space-y-4">
              <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900">
                OTP sent to registered mobile & email for TAN <strong>{tan}</strong>.
              </div>
              <div className="space-y-1.5">
                <Label>Enter OTP *</Label>
                <Input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="6-digit OTP" />
              </div>
              <div className="flex gap-2">
                <Button onClick={doAction} disabled={otp.length < 4 || loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                  Verify OTP
                </Button>
                <Button variant="ghost" onClick={() => setStep(1)}>Resend OTP</Button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="max-w-md space-y-4">
              <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900">
                OTP verified. CSI file is ready for download.
              </div>
              <TaxDetailGrid
                items={[
                  { label: 'TAN', value: tan, mono: true },
                  { label: 'Period', value: 'Q3 FY 2023-24' },
                  { label: 'File Available', value: 'Yes' },
                ]}
              />
              <Button onClick={doAction} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download CSI
              </Button>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="max-w-md space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-green-50 text-green-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold">Download Complete</p>
                  <p className="text-sm text-muted-foreground">CSI file downloaded successfully.</p>
                </div>
              </div>
              <TaxDetailGrid
                items={[
                  { label: 'TAN', value: tan, mono: true },
                  { label: 'File Name', value: 'CSI_Q3_FY2024.csi', mono: true },
                  { label: 'Downloaded', value: '20 Feb 2024, 10:45 AM' },
                ]}
              />
              <Button variant="outline" onClick={() => { setStep(1); setTan(''); setOtp(''); }}>Start New Download</Button>
            </div>
          ) : null}
        </TaxSectionCard>

        <TaxSectionCard icon={Shield} title="Process Status">
          <div className="space-y-3">
            {statusItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-sm">
                <span className={`grid h-5 w-5 place-items-center rounded-full ${item.done ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                  {item.done ? <CheckCircle2 className="h-3 w-3" /> : '•'}
                </span>
                <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
              </div>
            ))}
          </div>
        </TaxSectionCard>
      </div>

      <TaxSectionCard icon={Download} title="CSI File History" description="Previously downloaded CSI files by quarter.">
        <TaxCompactTable
          rows={tdsCsiFiles}
          columns={[
            { key: 'quarter', title: 'Quarter' },
            { key: 'challans', title: 'Challans', cellClassName: 'text-right' },
            { key: 'pending', title: 'Pending', cellClassName: 'text-right' },
            { key: 'downloaded', title: 'Last Download' },
            { key: 'status', title: 'Status', render: (row) => <TaxStatusBadge status={row.status} /> },
          ]}
        />
      </TaxSectionCard>
    </div>
  );
};
