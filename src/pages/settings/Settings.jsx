import React, { useEffect, useState } from 'react';
import {
  useGetBankAccountsQuery,
  useCreateBankAccountMutation,
} from '../../Services/apis/approvalsPaymentsBankingApi';
import {
  useGetOrganisationQuery,
  useCreateOrganisationMutation,
  useUpdateOrganisationMutation,
} from '../../Services/apis/settingsApi';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Plug, PlugZap, Settings as SettingsIcon, RefreshCw, Check, XCircle, Loader2, Building2, Mail, Phone, Globe, MapPin, Save, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import BankAccountDialog from './components/BankAccountDialog';
import ZohoConfigDialog from './components/ZohoConfigDialog';
import TallyConfigDialog from './components/TallyConfigDialog';

// Zoho Logo Component - Four interlocking rounded squares
const ZohoLogo = () => (
  <svg width="56" height="36" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Red square - leftmost */}
    <rect x="0" y="20" width="35" height="35" rx="8" fill="none" stroke="#E42527" strokeWidth="6" transform="rotate(-5 17.5 37.5)"/>
    {/* Green square - second */}
    <rect x="25" y="15" width="35" height="35" rx="8" fill="none" stroke="#00A650" strokeWidth="6" transform="rotate(5 42.5 32.5)"/>
    {/* Blue square - third */}
    <rect x="52" y="18" width="35" height="35" rx="8" fill="none" stroke="#0078D4" strokeWidth="6" transform="rotate(-3 69.5 35.5)"/>
    {/* Orange square - rightmost */}
    <rect x="78" y="22" width="35" height="35" rx="8" fill="none" stroke="#F5A623" strokeWidth="6" transform="rotate(3 95.5 39.5)"/>
  </svg>
);

// Tally Logo Component
const TallyLogo = () => (
  <div className="text-2xl font-bold italic" style={{ color: '#D32F2F' }}>
    <span style={{ color: '#D32F2F' }}>Tally</span>
    <span className="text-xs align-super text-gray-500">.ERP9</span>
  </div>
);

// Sync data items that will be fetched
const SYNC_DATA_ITEMS = [
  'Invoices',
  'Bills',
  'Expenses',
  'Chart of Accounts',
  'Customers',
  'Vendors',
  'Product & Services'
];

const Settings = () => {
  const {
    data: bankAccountsData = [],
    isError: bankAccountsError,
    refetch: refetchBankAccounts,
  } = useGetBankAccountsQuery();
  const {
    data: organisationData,
    isLoading: organisationLoading,
    isFetching: organisationFetching,
    error: organisationError,
    refetch: refetchOrganisation,
  } = useGetOrganisationQuery();
  const [createBankAccount] = useCreateBankAccountMutation();
  const [createOrganisation] = useCreateOrganisationMutation();
  const [updateOrganisation] = useUpdateOrganisationMutation();
  const bankAccounts = Array.isArray(bankAccountsData) ? bankAccountsData : [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    account_type: 'Checking',
    currency: 'INR'
  });

  // Integration states
  const [zohoConnected, setZohoConnected] = useState(false);
  const [tallyConnected, setTallyConnected] = useState(true); // Shown as connected in the image
  const [zohoConnecting, setZohoConnecting] = useState(false);
  const [tallySyncing, setTallySyncing] = useState(false);

  // Configuration dialogs
  const [zohoConfigOpen, setZohoConfigOpen] = useState(false);
  const [tallyConfigOpen, setTallyConfigOpen] = useState(false);
  const [zohoConfig, setZohoConfig] = useState({ client_id: '', client_secret: '', organization_id: '' });
  const [tallyConfig, setTallyConfig] = useState({ server_url: 'http://localhost:9000', company_name: '' });

  // Organisation Details state
  const [orgDetails, setOrgDetails] = useState(null);
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgForm, setOrgForm] = useState({
    company_name: '',
    legal_name: '',
    gstin: '',
    pan: '',
    cin: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    email: '',
    phone: '',
    website: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder_name: ''
  });
  const [emailCopied, setEmailCopied] = useState(false);

  useEffect(() => {
    if (organisationData) {
      setOrgDetails(organisationData);
      
      // Only initialize the form if it's currently empty or has not been loaded yet
      // This prevents overwriting user edits during background refetches
      setOrgForm(prev => {
        const isFormEmpty = !prev.company_name && !prev.email && !prev.phone;
        if (isFormEmpty || !orgDetails) {
          return {
            company_name: organisationData.company_name || '',
            legal_name: organisationData.legal_name || '',
            gstin: organisationData.gstin || '',
            pan: organisationData.pan || '',
            cin: organisationData.cin || '',
            address_line1: organisationData.address_line1 || '',
            address_line2: organisationData.address_line2 || '',
            city: organisationData.city || '',
            state: organisationData.state || '',
            pincode: organisationData.pincode || '',
            country: organisationData.country || 'India',
            email: organisationData.email || '',
            phone: organisationData.phone || '',
            website: organisationData.website || '',
            bank_name: organisationData.bank_name || '',
            account_number: organisationData.account_number || '',
            ifsc_code: organisationData.ifsc_code || '',
            account_holder_name: organisationData.account_holder_name || ''
          };
        }
        return prev;
      });
    } else {
      setOrgDetails(null);
    }
  }, [organisationData, orgDetails]);

  useEffect(() => {
    if (bankAccountsError) {
      toast.error('Failed to load bank accounts');
    }
  }, [bankAccountsError]);

  useEffect(() => {
    if (organisationError?.status && organisationError.status !== 404) {
      toast.error('Failed to fetch organisation details');
    }
  }, [organisationError]);

  const orgLoading = organisationLoading || organisationFetching;

  const resetOrgForm = () => {
    setOrgForm({
      company_name: '',
      legal_name: '',
      gstin: '',
      pan: '',
      cin: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      email: '',
      phone: '',
      website: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      account_holder_name: ''
    });
  };

  useEffect(() => {
    if (!organisationData && organisationError?.status === 404) {
      resetOrgForm();
    }
  }, [organisationData, organisationError]);

  const handleOrgSave = async (e) => {
    e.preventDefault();
    if (!orgForm.company_name) {
      toast.error('Company name is required');
      return;
    }

    setOrgSaving(true);
    try {
      if (orgDetails) {
        // Update existing
        await updateOrganisation(orgForm).unwrap();
        toast.success('Organisation details updated successfully');
      } else {
        // Create new
        await createOrganisation(orgForm).unwrap();
        toast.success('Organisation details created successfully');
      }
    } catch (error) {
      const errorMessage = error?.data?.detail || 'Failed to save organisation details';
      toast.error(errorMessage);
    } finally {
      setOrgSaving(false);
    }
  };

  const copyPlatformEmail = () => {
    if (orgDetails?.platform_email) {
      navigator.clipboard.writeText(orgDetails.platform_email);
      setEmailCopied(true);
      toast.success('Platform email copied to clipboard!');
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createBankAccount(formData).unwrap();
      toast.success('Bank account added successfully');
      setDialogOpen(false);
      resetForm();
      refetchBankAccounts();
    } catch (error) {
      toast.error('Failed to add bank account');
    }
  };

  const resetForm = () => {
    setFormData({
      account_name: '',
      account_number: '',
      bank_name: '',
      account_type: 'Checking',
      currency: 'INR'
    });
  };

  // Zoho Integration Handlers
  const handleZohoConnect = async () => {
    if (!zohoConfig.client_id || !zohoConfig.client_secret) {
      toast.error('Please configure Zoho credentials first');
      setZohoConfigOpen(true);
      return;
    }
    setZohoConnecting(true);
    try {
      // Simulating connection - in real implementation, this would call Zoho OAuth
      await new Promise(resolve => setTimeout(resolve, 2000));
      setZohoConnected(true);
      toast.success('Successfully connected to Zoho Books!');
    } catch (error) {
      toast.error('Failed to connect to Zoho Books');
    } finally {
      setZohoConnecting(false);
    }
  };

  const handleZohoDisconnect = () => {
    setZohoConnected(false);
    setZohoConfig({ client_id: '', client_secret: '', organization_id: '' });
    toast.success('Disconnected from Zoho Books');
  };

  const handleZohoConfigSave = () => {
    if (!zohoConfig.client_id || !zohoConfig.client_secret) {
      toast.error('Client ID and Client Secret are required');
      return;
    }
    toast.success('Zoho configuration saved');
    setZohoConfigOpen(false);
  };

  // Tally Integration Handlers
  const handleTallyConnect = async () => {
    if (!tallyConfig.server_url) {
      toast.error('Please configure Tally server URL first');
      setTallyConfigOpen(true);
      return;
    }
    setTallySyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTallyConnected(true);
      toast.success('Successfully connected to Tally!');
    } catch (error) {
      toast.error('Failed to connect to Tally');
    } finally {
      setTallySyncing(false);
    }
  };

  const handleTallyDisconnect = () => {
    setTallyConnected(false);
    toast.success('Disconnected from Tally');
  };

  const handleTallySyncMasters = async () => {
    setTallySyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast.success('Master data synced successfully from Tally!');
    } catch (error) {
      toast.error('Failed to sync master data');
    } finally {
      setTallySyncing(false);
    }
  };

  const handleTallyConfigSave = () => {
    if (!tallyConfig.server_url) {
      toast.error('Tally Server URL is required');
      return;
    }
    toast.success('Tally configuration saved');
    setTallyConfigOpen(false);
  };

  return (
    <div data-testid="settings-page">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold  text-primary mb-2" data-testid="settings-title">
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your account settings and integrations</p>
      </div>

      <Tabs defaultValue="banking" className="space-y-6" data-testid="settings-tabs">
        <TabsList>
          <TabsTrigger value="organisation" data-testid="tab-organisation">Organisation Details</TabsTrigger>
          <TabsTrigger value="banking" data-testid="tab-banking">Connected Banking</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="organisation">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-xl font-semibold  mb-1 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Organisation Details
              </h3>
              <p className="text-sm text-muted-foreground">Configure your company information for invoices and communications</p>
            </div>

            {orgLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <form onSubmit={handleOrgSave} className="space-y-6">
                {/* Platform Email Banner */}
                {orgDetails?.platform_email && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" data-testid="platform-email-banner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-800">Platform Invoice Email</p>
                          <p className="text-sm text-blue-600">Vendors can send invoices directly to this email</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-md  text-sm">
                          {orgDetails.platform_email}
                        </code>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={copyPlatformEmail}
                          className="text-blue-600 border-blue-300 hover:bg-blue-100"
                          data-testid="copy-platform-email-btn"
                        >
                          {emailCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Company Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 border-b pb-2">Company Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input
                        id="company_name"
                        value={orgForm.company_name}
                        onChange={(e) => setOrgForm({ ...orgForm, company_name: e.target.value })}
                        placeholder="Enter company name"
                        required
                        data-testid="org-company-name-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="legal_name">Legal Name</Label>
                      <Input
                        id="legal_name"
                        value={orgForm.legal_name}
                        onChange={(e) => setOrgForm({ ...orgForm, legal_name: e.target.value })}
                        placeholder="Legal registered name"
                        data-testid="org-legal-name-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Tax Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 border-b pb-2">Tax & Registration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="gstin">GSTIN</Label>
                      <Input
                        id="gstin"
                        value={orgForm.gstin}
                        onChange={(e) => setOrgForm({ ...orgForm, gstin: e.target.value.toUpperCase() })}
                        placeholder="22AAAAA0000A1Z5"
                        maxLength={15}
                        data-testid="org-gstin-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pan">PAN</Label>
                      <Input
                        id="pan"
                        value={orgForm.pan}
                        onChange={(e) => setOrgForm({ ...orgForm, pan: e.target.value.toUpperCase() })}
                        placeholder="AAAAA0000A"
                        maxLength={10}
                        data-testid="org-pan-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cin">CIN</Label>
                      <Input
                        id="cin"
                        value={orgForm.cin}
                        onChange={(e) => setOrgForm({ ...orgForm, cin: e.target.value.toUpperCase() })}
                        placeholder="Corporate Identification Number"
                        data-testid="org-cin-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="address_line1">Address Line 1</Label>
                      <Input
                        id="address_line1"
                        value={orgForm.address_line1}
                        onChange={(e) => setOrgForm({ ...orgForm, address_line1: e.target.value })}
                        placeholder="Street address"
                        data-testid="org-address1-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="address_line2">Address Line 2</Label>
                      <Input
                        id="address_line2"
                        value={orgForm.address_line2}
                        onChange={(e) => setOrgForm({ ...orgForm, address_line2: e.target.value })}
                        placeholder="Building, floor, etc."
                        data-testid="org-address2-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={orgForm.city}
                        onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })}
                        placeholder="City"
                        data-testid="org-city-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={orgForm.state}
                        onChange={(e) => setOrgForm({ ...orgForm, state: e.target.value })}
                        placeholder="State"
                        data-testid="org-state-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input
                        id="pincode"
                        value={orgForm.pincode}
                        onChange={(e) => setOrgForm({ ...orgForm, pincode: e.target.value })}
                        placeholder="560001"
                        maxLength={6}
                        data-testid="org-pincode-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={orgForm.country}
                        onChange={(e) => setOrgForm({ ...orgForm, country: e.target.value })}
                        placeholder="India"
                        data-testid="org-country-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={orgForm.email}
                        onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                        placeholder="company@example.com"
                        data-testid="org-email-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={orgForm.phone}
                        onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                        placeholder="+91 9876543210"
                        data-testid="org-phone-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="website"
                          value={orgForm.website}
                          onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                          placeholder="www.company.com"
                          className="pl-10"
                          data-testid="org-website-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 border-b pb-2">Bank Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bank_name">Bank Name</Label>
                      <Input
                        id="bank_name"
                        value={orgForm.bank_name}
                        onChange={(e) => setOrgForm({ ...orgForm, bank_name: e.target.value })}
                        placeholder="Bank name"
                        data-testid="org-bank-name-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="account_holder_name">Account Holder Name</Label>
                      <Input
                        id="account_holder_name"
                        value={orgForm.account_holder_name}
                        onChange={(e) => setOrgForm({ ...orgForm, account_holder_name: e.target.value })}
                        placeholder="Account holder name"
                        data-testid="org-account-holder-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="account_number">Account Number</Label>
                      <Input
                        id="account_number"
                        value={orgForm.account_number}
                        onChange={(e) => setOrgForm({ ...orgForm, account_number: e.target.value })}
                        placeholder="Account number"
                        data-testid="org-account-number-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ifsc_code">IFSC Code</Label>
                      <Input
                        id="ifsc_code"
                        value={orgForm.ifsc_code}
                        onChange={(e) => setOrgForm({ ...orgForm, ifsc_code: e.target.value.toUpperCase() })}
                        placeholder="SBIN0000123"
                        data-testid="org-ifsc-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button type="submit" disabled={orgSaving} className="min-w-[150px]" data-testid="org-save-btn">
                    {orgSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {orgDetails ? 'Update Details' : 'Save Details'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </TabsContent>

        <TabsContent value="banking">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold  mb-1">Bank Accounts</h3>
                <p className="text-sm text-muted-foreground">Connect your bank accounts for seamless payments</p>
              </div>
                            <BankAccountDialog
                dialogOpen={dialogOpen}
                setDialogOpen={setDialogOpen}
                resetForm={resetForm}
                formData={formData}
                setFormData={setFormData}
                handleSubmit={handleSubmit}
              />
            </div>

            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`bank-account-${account.id}`}
                >
                  <div>
                    <h4 className="font-medium">{account.account_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {account.bank_name} - {account.account_type}
                    </p>
                    <p className="text-xs  text-muted-foreground mt-1">
                      **** {account.account_number.slice(-4)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm  font-semibold">{account.currency}</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      account.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
              {bankAccounts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground" data-testid="no-bank-accounts">
                  No bank accounts connected. Add one to get started.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-6">
            {/* Header */}
            <p className="text-muted-foreground">
              Integrate AI Accountant with either Zoho or Tally for seamless financial data synchronization.
            </p>

            {/* Integration Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Zoho Card */}
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden" data-testid="zoho-integration-card">
                {/* Card Header */}
                <div className={`px-6 py-4 flex items-center justify-between border-b ${zohoConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-border'}`}>
                  <div className="flex items-center gap-3">
                    <ZohoLogo />
                    <span className="text-xl font-bold">Zoho</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                    zohoConnected 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {zohoConnected ? (
                      <>
                        <Check className="h-4 w-4" />
                        Connected
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Not Connected
                      </>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <h4 className="font-semibold text-gray-800 mb-3">We'll fetch your:</h4>
                  <ul className="space-y-2 mb-6">
                    {SYNC_DATA_ITEMS.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  {/* Action Buttons */}
                  {!zohoConnected ? (
                    <Button 
                      className="w-full bg-violet-500 hover:bg-violet-600 text-white"
                      onClick={handleZohoConnect}
                      disabled={zohoConnecting}
                      data-testid="zoho-connect-button"
                    >
                      {zohoConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plug className="h-4 w-4 mr-2" />
                          Connect
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={handleZohoDisconnect}
                          data-testid="zoho-disconnect-button"
                        >
                          <PlugZap className="h-4 w-4 mr-2" />
                          Disconnect
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setZohoConfigOpen(true)}
                          data-testid="zoho-configure-button"
                        >
                          <SettingsIcon className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                      <Button 
                        className="w-full bg-violet-500 hover:bg-violet-600 text-white"
                        data-testid="zoho-sync-button"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Masters
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tally Card */}
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden" data-testid="tally-integration-card">
                {/* Card Header */}
                <div className={`px-6 py-4 flex items-center justify-between border-b ${tallyConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-border'}`}>
                  <div className="flex items-center gap-3">
                    <TallyLogo />
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                    tallyConnected 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {tallyConnected ? (
                      <>
                        <Check className="h-4 w-4" />
                        Connected
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Not Connected
                      </>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <h4 className="font-semibold text-gray-800 mb-3">We'll fetch your:</h4>
                  <ul className="space-y-2 mb-6">
                    {SYNC_DATA_ITEMS.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  {/* Action Buttons */}
                  {!tallyConnected ? (
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={handleTallyConnect}
                      disabled={tallySyncing}
                      data-testid="tally-connect-button"
                    >
                      {tallySyncing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plug className="h-4 w-4 mr-2" />
                          Connect
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={handleTallyDisconnect}
                          data-testid="tally-disconnect-button"
                        >
                          <PlugZap className="h-4 w-4 mr-2" />
                          Disconnect
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setTallyConfigOpen(true)}
                          data-testid="tally-configure-button"
                        >
                          <SettingsIcon className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleTallySyncMasters}
                        disabled={tallySyncing}
                        data-testid="tally-sync-button"
                      >
                        {tallySyncing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Masters
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> These integrations allow you to sync financial data between OptiFii and your accounting software. 
                Real-time integration requires API credentials from Zoho Books or a running Tally instance.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

            <ZohoConfigDialog
        open={zohoConfigOpen}
        setOpen={setZohoConfigOpen}
        ZohoLogo={ZohoLogo}
        zohoConfig={zohoConfig}
        setZohoConfig={setZohoConfig}
        handleZohoConfigSave={handleZohoConfigSave}
      />

            <TallyConfigDialog
        open={tallyConfigOpen}
        setOpen={setTallyConfigOpen}
        TallyLogo={TallyLogo}
        tallyConfig={tallyConfig}
        setTallyConfig={setTallyConfig}
        handleTallyConfigSave={handleTallyConfigSave}
      />
    </div>
  );
};

export default Settings;

