import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import {
  useGetGstSummaryQuery,
  useGetOrganisationGstCredentialsQuery,
} from '../../../../Services/apis/taxApi';
import { useRBAC } from '../../../../contexts/RBACContext';
import { GST_TAB_VALUES, isGstTabEnabled } from '../../../../utils/gstConfiguration';
import GstOverviewPanel from './GstOverviewPanel';
import { GstDocumentsPanel } from './GstDocumentsPanels';
import GstLedgersPanel from './GstLedgersPanel';
import {
  GstReconciliationPanel,
  GstReturnsPanel,
} from './GstReferencePanels';
import { GstAnalyticsReconciliationProvider } from '../../contexts/GstAnalyticsReconciliationContext';

const GST_SUB_TABS = [
  { value: GST_TAB_VALUES.OVERVIEW, label: 'Overview' },
  // { value: GST_TAB_VALUES.RECONCILIATION, label: 'Reconciliation' },
  // { value: GST_TAB_VALUES.RETURNS, label: 'Returns' },
  { value: GST_TAB_VALUES.DOCUMENTS, label: 'Documents' },
  { value: GST_TAB_VALUES.LEDGERS, label: 'Ledgers' },
];

const GstSection = forwardRef(({ enabled = true }, ref) => {
  const { corporateScreens } = useRBAC();
  const activeGstConfiguration = corporateScreens?.activeGstConfiguration ?? [];

  const visibleTabs = useMemo(
    () => GST_SUB_TABS.filter((tab) => isGstTabEnabled(tab.value, activeGstConfiguration)),
    [activeGstConfiguration],
  );

  const [gstSubTab, setGstSubTab] = useState(GST_TAB_VALUES.OVERVIEW);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.value === gstSubTab)) {
      setGstSubTab(GST_TAB_VALUES.OVERVIEW);
    }
  }, [gstSubTab, visibleTabs]);

  const summaryActive = enabled && gstSubTab === GST_TAB_VALUES.OVERVIEW;
  const registrationsActive = enabled && (
    gstSubTab === GST_TAB_VALUES.DOCUMENTS || gstSubTab === GST_TAB_VALUES.LEDGERS
  );

  const { refetch: refetchSummary, isFetching: summaryFetching } = useGetGstSummaryQuery(undefined, {
    skip: !summaryActive,
  });
  const { refetch: refetchRegistrations, isFetching: registrationsFetching } = useGetOrganisationGstCredentialsQuery(undefined, {
    skip: !registrationsActive,
  });

  useImperativeHandle(ref, () => ({
    refetch: async () => {
      const tasks = [];
      if (summaryActive) tasks.push(refetchSummary());
      if (registrationsActive) tasks.push(refetchRegistrations());
      await Promise.all(tasks);
    },
    isFetching: summaryFetching || registrationsFetching,
  }));

  if (!enabled) return null;

  const gridColsClass = visibleTabs.length <= 2
    ? 'grid-cols-2'
    : visibleTabs.length === 3
      ? 'grid-cols-3'
      : visibleTabs.length === 4
        ? 'grid-cols-2 md:grid-cols-4'
        : 'grid-cols-2 md:grid-cols-5';

  return (
    <GstAnalyticsReconciliationProvider enabled={enabled}>
      <TabsContent value="gst" className="flex min-h-0 flex-1 flex-col">
        <Tabs value={gstSubTab} onValueChange={setGstSubTab} className="flex min-h-0 flex-1 flex-col gap-5">
        <TabsList className={`shrink-0 grid w-full ${gridColsClass}`}>
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Bounds the active sub-tab panel to the remaining height so GstOverviewPanel's
            table can scroll internally (via h-full). Other sub-tabs aren't written to expect
            a bounded box, so their content simply overflows this div (no overflow-y-auto set
            here) and the page falls back to its normal whole-page scroll for them — no change
            in behavior for Reconciliation/Returns/Documents/Ledgers. */}
        <div className="min-h-0 flex-1">
          {gstSubTab === GST_TAB_VALUES.OVERVIEW ? (
            <GstOverviewPanel
              onGotoTab={setGstSubTab}
              activeGstConfiguration={activeGstConfiguration}
            />
          ) : null}
          {gstSubTab === GST_TAB_VALUES.RECONCILIATION ? <GstReconciliationPanel /> : null}
          {gstSubTab === GST_TAB_VALUES.RETURNS ? <GstReturnsPanel /> : null}
          {gstSubTab === GST_TAB_VALUES.DOCUMENTS ? <GstDocumentsPanel /> : null}
          {gstSubTab === GST_TAB_VALUES.LEDGERS ? <GstLedgersPanel /> : null}
        </div>
        </Tabs>
      </TabsContent>
    </GstAnalyticsReconciliationProvider>
  );
});

GstSection.displayName = 'GstSection';

export default GstSection;
