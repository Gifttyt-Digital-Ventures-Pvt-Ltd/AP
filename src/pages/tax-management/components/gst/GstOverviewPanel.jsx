import React, { useMemo } from 'react';
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
  Loader2,
  Receipt,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  TaxKpiCard,
  TaxQuickActions,
  TaxSectionCard,
} from '../TaxUi';
import { useGetGstSummaryQuery } from '../../../../Services/apis/taxApi';
import { mapGstSummaryToOverviewKpis } from '../../utils/gstApiMappers';

const GstOverviewPanel = ({ onGotoTab }) => {
  const { data: summary, isLoading, isFetching, isError, refetch } = useGetGstSummaryQuery();

  const kpis = useMemo(() => mapGstSummaryToOverviewKpis(summary ?? {}), [summary]);
  const loading = isLoading || isFetching;

  return (
    <TabsContent value="overview" className="space-y-6">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading GST summary…
        </div>
      ) : null}

      {isError ? (
        <p className="text-sm text-destructive">Unable to load GST summary. Try refreshing.</p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <TaxKpiCard label="Total Taxable Amount" value={kpis.totalTaxable} sub={kpis.totalTaxableSub} icon={Receipt} />
        <TaxKpiCard label="Total GST Collected" value={kpis.totalGstCollected} sub={kpis.totalGstCollectedSub} icon={Zap} />
        <TaxKpiCard label="Eligible ITC" value={kpis.eligibleItc} sub={kpis.eligibleItcSub} icon={CheckCircle2} tone="green" />
        <TaxKpiCard label="Cash Ledger Balance" value={kpis.cashLedgerBalance} sub={kpis.cashLedgerSub} icon={DollarSign} tone="blue" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <TaxKpiCard label="CGST" value={kpis.cgst} sub="Central tax" icon={Receipt} />
        <TaxKpiCard label="SGST" value={kpis.sgst} sub="State tax" icon={Receipt} />
        <TaxKpiCard label="IGST" value={kpis.igst} sub="Integrated tax" icon={Receipt} />
        <TaxKpiCard label="Reconciliation %" value={kpis.reconciliationPct} sub={kpis.reconciliationSub} icon={ArrowUpDown} tone="amber" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <TaxSectionCard icon={Activity} title="Recent GST Activity" description="Latest portal and ITC actions.">
          <p className="py-8 text-center text-sm text-muted-foreground">Activity feed will appear here once GST workflows run.</p>
        </TaxSectionCard>

        <TaxSectionCard icon={Zap} title="Quick Actions" description="Jump to common GST workflows.">
          <TaxQuickActions
            actions={[
              { label: 'Run GSTR-2A Reconciliation', icon: ArrowUpDown, onClick: () => onGotoTab?.('reconciliation') },
              { label: 'Run GSTR-2B Reconciliation', icon: FileCheck, onClick: () => onGotoTab?.('reconciliation') },
              { label: 'Track GST Returns', icon: Calendar, onClick: () => onGotoTab?.('returns') },
              { label: 'View Documents', icon: FileText, onClick: () => onGotoTab?.('documents') },
              {
                label: 'Refresh GST Data',
                icon: RefreshCw,
                onClick: async () => {
                  await refetch();
                  toast.success('GST summary refreshed');
                },
              },
              { label: 'Download GST Report', icon: Download, onClick: () => toast.success('GST report download started') },
            ]}
          />
        </TaxSectionCard>
      </div>
    </TabsContent>
  );
};

export default GstOverviewPanel;
