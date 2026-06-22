import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import RefreshButton from '../../components/common/RefreshButton';
import { useRBAC } from '../../contexts/RBACContext';
import GstSection from './components/gst/GstSection';
import TdsSection from './components/tds/TdsSection';
import CertificatesPanel from './components/CertificatesPanel';

const MAIN_TAB_GRID = {
  1: 'grid-cols-1 max-w-xs',
  2: 'grid-cols-2 max-w-sm',
  3: 'grid-cols-3 max-w-md',
};

const TaxManagement = () => {
  const { isCorporateSectionEnabled } = useRBAC();
  const [activeTab, setActiveTab] = useState('gst');
  const [refreshing, setRefreshing] = useState(false);

  const gstSectionRef = useRef(null);
  const tdsSectionRef = useRef(null);
  const certificatesPanelRef = useRef(null);

  const canViewGst = isCorporateSectionEnabled('TAX_GST');
  const canViewTds = isCorporateSectionEnabled('TAX_TDS_COMPLIANCE');

  const taxTabs = useMemo(() => {
    const tabs = [];
    if (canViewGst) tabs.push({ value: 'gst', label: 'GST' });
    if (canViewTds) {
      tabs.push({ value: 'tds', label: 'TDS' });
      tabs.push({ value: 'certificates', label: 'Certificates' });
    }
    return tabs;
  }, [canViewGst, canViewTds]);

  useEffect(() => {
    if (taxTabs.length === 0) return;
    if (!taxTabs.some((tab) => tab.value === activeTab)) {
      setActiveTab(taxTabs[0].value);
    }
  }, [activeTab, taxTabs]);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'gst' && canViewGst) {
        await gstSectionRef.current?.refetch?.();
      } else if (activeTab === 'tds' && canViewTds) {
        await tdsSectionRef.current?.refetch?.();
      } else if (activeTab === 'certificates' && canViewTds) {
        await certificatesPanelRef.current?.refetch?.();
      }
    } catch (error) {
      console.error('Error refreshing tax data:', error);
      toast.error('Failed to refresh tax data');
    } finally {
      setRefreshing(false);
    }
  };

  const openCertificates = () => {
    setActiveTab('certificates');
    window.setTimeout(() => certificatesPanelRef.current?.openGenerateDialog?.(), 0);
  };

  if (taxTabs.length === 0) {
    return (
      <div className="min-h-[60vh] rounded-xl border border-border bg-card/50 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No tax modules are enabled for your account.</p>
      </div>
    );
  }

  const tabGridClass = MAIN_TAB_GRID[taxTabs.length] || MAIN_TAB_GRID[3];

  return (
    <div className="space-y-6" data-testid="tax-management-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Tax Management</h1>
          <p className="text-muted-foreground">Manage GST and TDS compliance</p>
        </div>
        <RefreshButton onClick={fetchData} refreshing={refreshing}>
          Refresh
        </RefreshButton>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className={`grid w-full ${tabGridClass}`}>
          {taxTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} data-testid={`tab-${tab.value}`}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {canViewGst && <GstSection ref={gstSectionRef} enabled={activeTab === 'gst'} />}
        {canViewTds && (
          <TdsSection ref={tdsSectionRef} enabled={activeTab === 'tds'} onOpenCertificates={openCertificates} />
        )}
        {canViewTds && <CertificatesPanel ref={certificatesPanelRef} enabled={activeTab === 'certificates'} />}
      </Tabs>
    </div>
  );
};

export default TaxManagement;
