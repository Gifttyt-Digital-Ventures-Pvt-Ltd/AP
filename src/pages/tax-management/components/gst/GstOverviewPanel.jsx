import React from 'react';
import { TabsContent } from '../../../../components/ui/tabs';
import { toast } from 'sonner';
import {
  Activity,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  FileCheck,
  FileText,
  Receipt,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  TaxActivityTimeline,
  TaxAlertBanner,
  TaxKpiCard,
  TaxProgressRow,
  TaxQuickActions,
  TaxSectionCard,
} from '../TaxUi';
import { gstActivityLog, gstHealthItems, gstOverviewKpis } from '../../data/taxStaticData';

const GstOverviewPanel = ({ onGotoTab }) => (
  <TabsContent value="overview" className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <TaxKpiCard label="Total Taxable Amount" value={gstOverviewKpis.totalTaxable} sub={gstOverviewKpis.totalTaxableSub} icon={Receipt} />
      <TaxKpiCard label="Total GST Collected" value={gstOverviewKpis.totalGstCollected} sub={gstOverviewKpis.totalGstCollectedSub} icon={Zap} />
      <TaxKpiCard label="Eligible ITC" value={gstOverviewKpis.eligibleItc} sub={gstOverviewKpis.eligibleItcSub} icon={CheckCircle2} tone="green" />
      <TaxKpiCard label="Cash Ledger Balance" value={gstOverviewKpis.cashLedgerBalance} sub={gstOverviewKpis.cashLedgerSub} icon={DollarSign} tone="blue" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <TaxKpiCard label="CGST" value={gstOverviewKpis.cgst} sub="Central tax" icon={Receipt} />
      <TaxKpiCard label="SGST" value={gstOverviewKpis.sgst} sub="State tax" icon={Receipt} />
      <TaxKpiCard label="IGST" value={gstOverviewKpis.igst} sub="Integrated tax" icon={Receipt} />
      <TaxKpiCard label="Reconciliation %" value={gstOverviewKpis.reconciliationPct} sub={gstOverviewKpis.reconciliationSub} icon={ArrowUpDown} tone="amber" />
    </div>

    <div className="grid gap-4 xl:grid-cols-[1fr_1fr_280px]">
      <TaxSectionCard icon={Activity} title="Recent GST Activity" description="Latest portal and ITC actions.">
        <TaxActivityTimeline items={gstActivityLog} />
      </TaxSectionCard>

      <TaxSectionCard icon={FileCheck} title="GST Compliance Health" description="Reconciliation, filing, and ITC signals.">
        <div className="space-y-4">
          {gstHealthItems.map((item) => (
            <TaxProgressRow
              key={item.label}
              label={item.label}
              value={item.score}
              sub={item.status === 'good' ? 'On track' : 'Needs attention'}
            />
          ))}
          <TaxAlertBanner>
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>2 areas need attention. Review reconciliation gaps.</span>
          </TaxAlertBanner>
        </div>
      </TaxSectionCard>

      <TaxSectionCard icon={Zap} title="Quick Actions" description="Jump to common GST workflows.">
        <TaxQuickActions
          actions={[
            { label: 'Run GSTR-2A Reconciliation', icon: ArrowUpDown, onClick: () => onGotoTab?.('reconciliation') },
            { label: 'Run GSTR-2B Reconciliation', icon: FileCheck, onClick: () => onGotoTab?.('reconciliation') },
            { label: 'Track GST Returns', icon: Calendar, onClick: () => onGotoTab?.('returns') },
            { label: 'View Documents', icon: FileText, onClick: () => onGotoTab?.('documents') },
            { label: 'Refresh GST Data', icon: RefreshCw, onClick: () => toast.success('GST data refreshed') },
            { label: 'Download GST Report', icon: Download, onClick: () => toast.success('GST report download started') },
          ]}
        />
      </TaxSectionCard>
    </div>
  </TabsContent>
);

export default GstOverviewPanel;
