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

const GST_SUB_TABS = [
  { value: GST_TAB_VALUES.OVERVIEW, label: 'Overview' },
  { value: GST_TAB_VALUES.RECONCILIATION, label: 'Reconciliation' },
  { value: GST_TAB_VALUES.RETURNS, label: 'Returns' },
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
    <TabsContent value="gst" className="space-y-5">
      <Tabs value={gstSubTab} onValueChange={setGstSubTab} className="space-y-5">
        <TabsList className={`grid w-full ${gridColsClass}`}>
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

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
      </Tabs>
    </TabsContent>
  );
});

GstSection.displayName = 'GstSection';

export default GstSection;
