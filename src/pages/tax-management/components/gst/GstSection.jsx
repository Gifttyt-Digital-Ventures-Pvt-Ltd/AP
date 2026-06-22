import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import {
  useGetGstSummaryQuery,
  useGetOrganisationGstCredentialsQuery,
} from '../../../../Services/apis/taxApi';
import GstOverviewPanel from './GstOverviewPanel';
import { GstDocumentsPanel } from './GstDocumentsPanels';
import GstLedgersPanel from './GstLedgersPanel';
import {
  GstReconciliationPanel,
  GstReturnsPanel,
} from './GstReferencePanels';

const GST_SUB_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'reconciliation', label: 'Reconciliation' },
  { value: 'returns', label: 'Returns' },
  { value: 'documents', label: 'Documents' },
  { value: 'ledgers', label: 'Ledgers' },
];

const GstSection = forwardRef(({ enabled = true }, ref) => {
  const [gstSubTab, setGstSubTab] = useState('overview');

  const summaryActive = enabled && gstSubTab === 'overview';
  const registrationsActive = enabled && (gstSubTab === 'documents' || gstSubTab === 'ledgers');

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

  return (
    <TabsContent value="gst" className="space-y-5">
      <Tabs value={gstSubTab} onValueChange={setGstSubTab} className="space-y-5">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          {GST_SUB_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {gstSubTab === 'overview' ? <GstOverviewPanel onGotoTab={setGstSubTab} /> : null}
        {gstSubTab === 'reconciliation' ? <GstReconciliationPanel /> : null}
        {gstSubTab === 'returns' ? <GstReturnsPanel /> : null}
        {gstSubTab === 'documents' ? <GstDocumentsPanel /> : null}
        {gstSubTab === 'ledgers' ? <GstLedgersPanel /> : null}
      </Tabs>
    </TabsContent>
  );
});

GstSection.displayName = 'GstSection';

export default GstSection;
