import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import RefreshButton from '../../components/common/RefreshButton';
import GstTab from './components/GstTab';
import TdsTab from './components/TdsTab';
import CertificatesTab from './components/CertificatesTab';
import { useRBAC } from '../../contexts/RBACContext';

const TaxManagement = () => {
  const { isCorporateSectionEnabled } = useRBAC();
  const [activeTab, setActiveTab] = useState('gst');
  const [refreshing, setRefreshing] = useState(false);

  const gstTabRef = useRef(null);
  const tdsTabRef = useRef(null);
  const certificatesTabRef = useRef(null);

  const canViewGst = isCorporateSectionEnabled('TAX_GST');
  const canViewTds = isCorporateSectionEnabled('TAX_TDS_COMPLIANCE');
  const taxTabs = useMemo(() => {
    const tabs = [];
    if (canViewGst) tabs.push('gst');
    if (canViewTds) tabs.push('tds', 'certificates');
    return tabs;
  }, [canViewGst, canViewTds]);

  useEffect(() => {
    if (taxTabs.length === 0) return;
    if (!taxTabs.includes(activeTab)) {
      setActiveTab(taxTabs[0]);
    }
  }, [activeTab, taxTabs]);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        canViewGst ? gstTabRef.current?.refetch() : Promise.resolve(),
        canViewTds ? tdsTabRef.current?.refetch() : Promise.resolve(),
        canViewTds ? certificatesTabRef.current?.refetch() : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Error refreshing tax data:', error);
      toast.error('Failed to refresh tax data');
    } finally {
      setRefreshing(false);
    }
  };

  if (taxTabs.length === 0) {
    return (
      <div className="min-h-[60vh] rounded-xl border border-border bg-card/50 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No tax modules are enabled for your account.</p>
      </div>
    );
  }

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          {canViewGst && <TabsTrigger value="gst" data-testid="tab-gst">GST</TabsTrigger>}
          {canViewTds && <TabsTrigger value="tds" data-testid="tab-tds">TDS</TabsTrigger>}
          {canViewTds && (
            <TabsTrigger value="certificates" data-testid="tab-certificates">
              Certificates
            </TabsTrigger>
          )}
        </TabsList>

        {canViewGst && <GstTab ref={gstTabRef} enabled={canViewGst} />}
        {canViewTds && <TdsTab ref={tdsTabRef} enabled={canViewTds} />}
        {canViewTds && <CertificatesTab ref={certificatesTabRef} enabled={canViewTds} />}
      </Tabs>
    </div>
  );
};

export default TaxManagement;
