import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Building2, CheckCircle, Copy, Globe, Loader2, Mail, MapPin, Phone, Save } from 'lucide-react';
import { toast } from 'sonner';
import BankAccountDialog from './components/BankAccountDialog';
import { useActionGuard } from '../../hooks/useActionGuard';
import { useRBAC } from '../../contexts/RBACContext';
import CreditsPage from '../credits/CreditsPage';
import NotificationSettings from '../notifications/NotificationSettings';
import OrgBranchesSection from './components/OrgBranchesSection';
import OrgGstRegistrationsSection from './components/OrgGstRegistrationsSection';
import {
  buildOrganisationSavePayload,
  createEmptyGstRegistration,
  getConfiguredOrganisationGstins,
  normalizeGstRegistrationsFromApi,
  normalizeOrganisationBranchesFromApi,
  validateGstRegistrations,
  validateOrganisationBranches,
} from '../../utils/organisationGst';
import {
  formatBankAccountType,
  isBankAccountActive,
  maskBankAccountNumber,
} from '../banking/utils/bankAccounts';

const ORGANISATION_DETAILS_FORM_ID = 'organisation-details-form';
const Settings = () => {
  const {
    corporateScreens,
    hasAnyPermission,
    isCorporateSectionEnabled,
    isBillingFeatureEnabled,
    isCorporateAdmin,
    isBranchEnabled: isBranchConfigurationEnabled,
    isBranchSqFtEnabled: isBranchSqFtConfigurationEnabled,
  } = useRBAC();
  const navigate = useNavigate();
  const canViewBankingSettings =
    hasAnyPermission(['settings-banking', 'banking-full']) &&
    isCorporateSectionEnabled('SETTINGS_CONNECTED_BANKING');
  const canViewOrganisationSettings =
    hasAnyPermission(['settings-org']) &&
    isCorporateSectionEnabled('SETTINGS_ORG_DETAILS');
  const canViewBillingSettings = hasAnyPermission([
    'credits-view',
    'credits-ledger',
    'credits-manage',
    'VIEW_WALLET',
    'VIEW_LEDGER',
    'MANAGE_BILLING',
  ]) && isBillingFeatureEnabled;
  const availableSettingsTabs = useMemo(() => {
    const tabs = [];
    if (canViewOrganisationSettings) tabs.push('organisation');
    if (canViewBankingSettings) tabs.push('banking');
    if (isCorporateAdmin) tabs.push('notifications');
    if (canViewBillingSettings) tabs.push('billing');
    return tabs;
  }, [canViewBankingSettings, canViewBillingSettings, canViewOrganisationSettings, isCorporateAdmin]);
  const [searchParams] = useSearchParams();
  const [activeSettingsTab, setActiveSettingsTab] = useState('');
  const {
    data: bankAccountsData = [],
    isError: bankAccountsError,
    refetch: refetchBankAccounts,
  } = useGetBankAccountsQuery(undefined, { skip: !canViewBankingSettings });
  const {
    data: organisationData,
    isLoading: organisationLoading,
    isFetching: organisationFetching,
    error: organisationError,
    refetch: refetchOrganisation,
  } = useGetOrganisationQuery(undefined, { skip: !canViewOrganisationSettings });
  const [createBankAccount] = useCreateBankAccountMutation();
  const [createOrganisation] = useCreateOrganisationMutation();
  const [updateOrganisation] = useUpdateOrganisationMutation();
  const { guardAction, canPerformAction } = useActionGuard();
  const bankAccounts = useMemo(
    () => (Array.isArray(bankAccountsData) ? bankAccountsData : []),
    [bankAccountsData],
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    account_type: 'Checking',
    currency: 'INR'
  });
  // Organisation Details state
  const [orgDetails, setOrgDetails] = useState(null);
  const [orgSaving, setOrgSaving] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [orgForm, setOrgForm] = useState({
    company_name: '',
    legal_name: '',
    gstin: '',
    branches: [],
    gst_registrations: [createEmptyGstRegistration()],
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
  const canCreateBankAccount = canPerformAction('settings.createBankAccount');
  const canCreateOrganisationDetails = canPerformAction('settings.createOrganisation');
  const canUpdateOrganisationDetails = canPerformAction('settings.updateOrganisation');
  const canSaveOrganisation = orgDetails ? canUpdateOrganisationDetails : canCreateOrganisationDetails;

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab === 'integrations') {
      navigate('/integrations', { replace: true });
      return;
    }
    if (requestedTab && availableSettingsTabs.includes(requestedTab)) {
      setActiveSettingsTab(requestedTab);
    }
  }, [availableSettingsTabs, navigate, searchParams]);

  useEffect(() => {
    if (availableSettingsTabs.length === 0) return;
    if (!activeSettingsTab || !availableSettingsTabs.includes(activeSettingsTab)) {
      setActiveSettingsTab(availableSettingsTabs[0]);
    }
  }, [activeSettingsTab, availableSettingsTabs]);

  useEffect(() => {
    if (organisationData) {
      setOrgDetails(organisationData);
      
      // Only initialize the form if it's currently empty or has not been loaded yet
      // This prevents overwriting user edits during background refetches
      setOrgForm(prev => {
        const isFormEmpty = !prev.company_name && !prev.email && !prev.phone;
        if (isFormEmpty || !orgDetails) {
          const gstRegistrations = normalizeGstRegistrationsFromApi(organisationData);
          const branches = normalizeOrganisationBranchesFromApi(organisationData);
          return {
            company_name: organisationData.company_name || '',
            legal_name: organisationData.legal_name || '',
            gstin: gstRegistrations[0]?.gstin || organisationData.gstin || '',
            branches,
            gst_registrations: gstRegistrations,
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
      branches: [],
      gst_registrations: [createEmptyGstRegistration()],
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
    const orgAction = orgDetails ? 'settings.updateOrganisation' : 'settings.createOrganisation';
    if (!guardAction(orgAction)) return;
    if (!orgForm.company_name) {
      toast.error('Company name is required');
      return;
    }

    const gstValidationError = validateGstRegistrations(orgForm.gst_registrations);
    if (gstValidationError) {
      toast.error(gstValidationError);
      return;
    }

    const branchValidationError = isBranchConfigurationEnabled
      ? validateOrganisationBranches(orgForm.branches)
      : '';
    if (branchValidationError) {
      toast.error(branchValidationError);
      return;
    }

    const organisationPayload = buildOrganisationSavePayload(orgForm);

    setOrgSaving(true);
    try {
      if (orgDetails) {
        // Update existing
        await updateOrganisation(organisationPayload).unwrap();
        toast.success('Organisation details updated successfully');
      } else {
        // Create new
        await createOrganisation(organisationPayload).unwrap();
        toast.success('Organisation details created successfully');
      }
    } catch (error) {
      const errorMessage = error?.data?.detail || 'Failed to save organisation details';
      toast.error(errorMessage);
    } finally {
      setOrgSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guardAction('settings.createBankAccount')) return;
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

  const organisationSaveLabel = orgDetails ? 'Update Details' : 'Save Details';

  const renderOrganisationSaveButton = ({
    testId = 'org-save-btn',
    className = '',
  } = {}) => (
    <Button
      type="submit"
      form={ORGANISATION_DETAILS_FORM_ID}
      disabled={orgSaving || !canSaveOrganisation}
      className={`min-w-[150px] shrink-0 ${className}`}
      data-testid={testId}
    >
      {orgSaving ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Save className="h-4 w-4 mr-2" />
          {organisationSaveLabel}
        </>
      )}
    </Button>
  );

  const copyPlatformEmail = async () => {
    if (!orgDetails?.platform_email) return;
    try {
      await navigator.clipboard.writeText(orgDetails.platform_email);
      setEmailCopied(true);
      toast.success('Platform email copied');
      setTimeout(() => setEmailCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy platform email');
    }
  };

  return (
    <div data-testid="settings-page">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2" data-testid="settings-title">
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your account and organisation settings</p>
      </div>

      <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="space-y-6" data-testid="settings-tabs">
        <TabsList>
          {canViewOrganisationSettings && (
            <TabsTrigger value="organisation" data-testid="tab-organisation">Organisation Details</TabsTrigger>
          )}
          {canViewBankingSettings && (
            <TabsTrigger value="banking" data-testid="tab-banking">Connected Banking</TabsTrigger>
          )}
          {isCorporateAdmin && (
            <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
          )}
          {canViewBillingSettings && (
            <TabsTrigger value="billing" data-testid="tab-billing">Billing</TabsTrigger>
          )}
        </TabsList>

        {canViewOrganisationSettings && <TabsContent value="organisation">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-xl font-semibold font-['Manrope'] mb-1 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Organisation Details
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure your company information for invoices and communications.
                Use the save action at the bottom of this page after updating branches,
                GST registrations, or contact details.
              </p>
            </div>

            {orgLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <form
                id={ORGANISATION_DETAILS_FORM_ID}
                onSubmit={handleOrgSave}
                className="space-y-6"
              >
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
                        <code className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-md   text-sm">
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
                  {isBranchConfigurationEnabled ? (
                    <OrgBranchesSection
                      branches={orgForm.branches}
                      gstOptions={getConfiguredOrganisationGstins(orgForm.gst_registrations)}
                      onChange={(branches) => setOrgForm({ ...orgForm, branches })}
                      showAreaField={isBranchSqFtConfigurationEnabled}
                    />
                  ) : null}
                  <OrgGstRegistrationsSection
                    registrations={orgForm.gst_registrations}
                    onChange={(gst_registrations) => {
                      const configuredGstins = new Set(getConfiguredOrganisationGstins(gst_registrations));
                      setOrgForm({
                        ...orgForm,
                        gst_registrations,
                        gstin: gst_registrations[0]?.gstin ?? '',
                        branches: orgForm.branches.map((branch) =>
                          branch.billingGstin && !configuredGstins.has(branch.billingGstin)
                            ? { ...branch, billingGstin: '' }
                            : branch,
                        ),
                      });
                    }}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="sticky bottom-[-24px] -mx-6 mt-2 border-t border-border bg-card/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/85">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Review your changes, then {organisationSaveLabel.toLowerCase()}.
                    </p>
                    {renderOrganisationSaveButton()}
                  </div>
                </div>
              </form>
            )}
          </div>
        </TabsContent>}

        {canViewBankingSettings && <TabsContent value="banking">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold font-['Manrope'] mb-1">Bank Accounts</h3>
                <p className="text-sm text-muted-foreground">Connect your bank accounts for seamless payments</p>
              </div>
                            <BankAccountDialog
                dialogOpen={dialogOpen}
                setDialogOpen={setDialogOpen}
                resetForm={resetForm}
                formData={formData}
                setFormData={setFormData}
                handleSubmit={handleSubmit}
                canCreateBankAccount={canCreateBankAccount}
              />
            </div>

            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <div
                  key={account?.id ?? account?.account_number ?? account?.account_name ?? 'unknown'}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`bank-account-${account?.id ?? 'unknown'}`}
                >
                  <div>
                    <h4 className="font-medium">{account?.account_name || 'Bank account'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {[account?.bank_name, formatBankAccountType(account?.account_type)]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {maskBankAccountNumber(account?.account_number)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold">{account?.currency || '—'}</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      isBankAccountActive(account) ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {isBankAccountActive(account) ? 'Active' : 'Inactive'}
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
        </TabsContent>}

        {canViewBillingSettings && <TabsContent value="billing">
          <CreditsPage />
        </TabsContent>}

        {isCorporateAdmin && <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>}

      </Tabs>

    </div>
  );
};

export default Settings;
