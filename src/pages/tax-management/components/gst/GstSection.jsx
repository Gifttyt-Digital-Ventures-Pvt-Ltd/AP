import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import GstOverviewPanel from './GstOverviewPanel';
import { GstDocumentsPanel } from './GstDocumentsPanels';
import {
  GstLedgersPanel,
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

  useImperativeHandle(ref, () => ({
    refetch: async () => {},
    isFetching: false,
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

        <GstOverviewPanel onGotoTab={setGstSubTab} />
        <GstReconciliationPanel />
        <GstReturnsPanel />
        <GstDocumentsPanel />
        <GstLedgersPanel />
      </Tabs>
    </TabsContent>
  );
});

GstSection.displayName = 'GstSection';

export default GstSection;
