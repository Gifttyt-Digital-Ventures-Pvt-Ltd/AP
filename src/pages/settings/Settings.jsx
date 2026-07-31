import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import useBankingSetup from '../banking/hooks/useBankingSetup';
import AccountStatusCard from '../banking/components/AccountStatusCard';
import AccountLinkCard from '../banking/components/AccountLinkCard';
import BeneficiariesTable from '../banking/components/BeneficiariesTable';
import BeneficiaryForm from '../banking/components/BeneficiaryForm';
import BankingSetupSteps from '../banking/components/BankingSetupSteps';
import {
  useLinkBankingAccountMutation,
  useUpdateBankingAccountMutation,
  useDeleteBankingAccountMutation,
  useUpdateBankingAccountStatusMutation,
  useRegisterBeneficiaryMutation,
  useValidateBeneficiaryMutation,
} from '../../Services/apis/connectedBankingApi';
import {
  findDuplicateBankAccount,
  getBankAccountVerificationStatus,
} from '../banking/utils/bankAccounts';
import { BANK_ACCOUNT_VERIFICATION_STATUS, BANKING_SETUP_STATUS, GATE_STATE } from '../banking/constants';

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
    isBankingEnabled,
  } = useRBAC();
  const navigate = useNavigate();
  const canViewBankingSettings =
    hasAnyPermission(['settings-banking', 'banking-full', 'banking-manage', 'banking-view', 'payments-admin']) &&
    isBankingEnabled;
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
  const canManageNotificationSettings =
    isCorporateSectionEnabled('SETTINGS_NOTIFICATIONS') &&
    (isCorporateAdmin || hasAnyPermission(['notifications-manage', 'NOTIFICATIONS MANAGE']));
  const availableSettingsTabs = useMemo(() => {
    const tabs = [];
    if (canViewOrganisationSettings) tabs.push('organisation');
    if (canViewBankingSettings) tabs.push('banking');
    if (canManageNotificationSettings) tabs.push('notifications');
    if (canViewBillingSettings) tabs.push('billing');
    return tabs;
  }, [canManageNotificationSettings, canViewBankingSettings, canViewBillingSettings, canViewOrganisationSettings]);
  const [searchParams] = useSearchParams();
  const [activeSettingsTab, setActiveSettingsTab] = useState('');
  const {
    data: organisationData,
    isLoading: organisationLoading,
    isFetching: organisationFetching,
    error: organisationError,
    refetch: refetchOrganisation,
  } = useGetOrganisationQuery(undefined, { skip: !canViewOrganisationSettings });
  const [createOrganisation] = useCreateOrganisationMutation();
  const [updateOrganisation] = useUpdateOrganisationMutation();
  const { guardAction, canPerformAction } = useActionGuard();
  const {
    isAccountLinked,
    paymentReadyAccounts,
    accounts,
    beneficiaries,
    setupStatus,
    refetchAccounts,
    refetchBeneficiaries,
  } = useBankingSetup({ skip: !canViewBankingSettings || !isBankingEnabled });
  const [linkBankingAccount, { isLoading: linkingAccount }] = useLinkBankingAccountMutation();
  const [updateBankingAccount, { isLoading: updatingAccount }] = useUpdateBankingAccountMutation();
  const [deleteBankingAccount, { isLoading: deletingAccount }] = useDeleteBankingAccountMutation();
  const [updateBankingAccountStatus, { isLoading: updatingAccountStatus }] = useUpdateBankingAccountStatusMutation();
  const [validateBeneficiary, { isLoading: validatingBeneficiary }] = useValidateBeneficiaryMutation();
  const [registerBeneficiary, { isLoading: savingBeneficiary }] = useRegisterBeneficiaryMutation();
  const canManageBanking = canPerformAction('banking.link');
  const canManageBeneficiaries = canPerformAction('banking.addBeneficiary');
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
  const [editingRejectedAccount, setEditingRejectedAccount] = useState(null);
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
    const tab = searchParams.get('tab');
    if (tab && availableSettingsTabs.includes(tab)) {
      setActiveSettingsTab(tab);
    }
  }, [searchParams, availableSettingsTabs]);

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

  const displayAccounts = accounts;
  const displayIsAccountLinked = isAccountLinked;
  const hasPaymentReadyAccount = paymentReadyAccounts.length > 0;
  const displayGateState = hasPaymentReadyAccount
    ? GATE_STATE.READY
    : setupStatus === BANKING_SETUP_STATUS.PENDING_VERIFICATION
      ? GATE_STATE.PENDING_VERIFICATION
      : setupStatus === BANKING_SETUP_STATUS.ACTION_REQUIRED
        ? GATE_STATE.ACTION_REQUIRED
        : displayIsAccountLinked
          ? GATE_STATE.CONFIGURED
          : GATE_STATE.ACCOUNT_PENDING;
  const displayIsSetupReady = hasPaymentReadyAccount;

  const handleLinkAccount = async ({ accountId, bank, bankName, accountName, accountType, accountNumber, ifsc }) => {
    if (!guardAction('banking.link')) return;
    const duplicate = findDuplicateBankAccount(
      displayAccounts,
      { bank, bankName, accountNumber, ifsc },
      accountId,
    );
    if (duplicate) {
      toast.error('This bank account has already been submitted by your corporate.');
      return;
    }
    try {
      const payload = {
        bank,
        bankName,
        accountName,
        accountType,
        accountNumber,
        ifsc,
      };
      if (accountId) {
        const currentStatus = getBankAccountVerificationStatus(editingRejectedAccount || {});
        if (currentStatus !== BANK_ACCOUNT_VERIFICATION_STATUS.REJECTED) {
          toast.error('Only rejected bank account requests can be edited.');
          return;
        }
        await updateBankingAccount({ accountId, ...payload }).unwrap();
        toast.success('Bank account request saved and resubmitted.');
        setEditingRejectedAccount(null);
      } else {
        await linkBankingAccount(payload).unwrap();
        toast.success('Bank account verification request submitted successfully.');
      }
      await refetchAccounts();
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || 'Failed to submit bank account verification request');
    }
  };

  const handleDeleteRejectedAccount = async (account) => {
    if (!guardAction('banking.link')) return;
    if (getBankAccountVerificationStatus(account) !== BANK_ACCOUNT_VERIFICATION_STATUS.REJECTED) {
      toast.error('Only rejected bank account requests can be deleted.');
      return;
    }
    try {
      await deleteBankingAccount(account.id).unwrap();
      if (String(editingRejectedAccount?.id) === String(account.id)) {
        setEditingRejectedAccount(null);
      }
      await refetchAccounts();
      toast.success('Rejected bank account request deleted.');
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || 'Failed to delete bank account request');
    }
  };

  const handleToggleAccountActive = async (account, isActive, reason = '') => {
    if (!guardAction('banking.link')) return;
    if (getBankAccountVerificationStatus(account) !== BANK_ACCOUNT_VERIFICATION_STATUS.APPROVED) {
      toast.error('Only approved bank accounts can be activated or deactivated.');
      return;
    }
    const deactivationReason = reason.trim();
    if (!isActive && !deactivationReason) {
      toast.error('Deactivation reason is required.');
      return;
    }
    try {
      await updateBankingAccountStatus({
        accountId: account.id,
        isActive,
        reason: !isActive ? deactivationReason : undefined,
      }).unwrap();
      await refetchAccounts();
      toast.success(isActive ? 'Bank account activated.' : 'Bank account deactivated.');
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || 'Failed to update bank account status');
    }
  };

  const handleVerifyBeneficiary = async (payload) => {
    if (!guardAction('banking.verifyBeneficiary')) return null;
    try {
      const response = await validateBeneficiary(payload).unwrap();
      toast.success('Beneficiary verified');
      return response;
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || 'Beneficiary verification failed');
      return null;
    }
  };

  const handleSaveBeneficiary = async (payload) => {
    if (!guardAction('banking.addBeneficiary')) return false;
    try {
      await registerBeneficiary(payload).unwrap();
      await refetchBeneficiaries();
      toast.success('Beneficiary saved successfully');
      return true;
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || 'Failed to save beneficiary');
      return false;
    }
  };

  const handleRetryBeneficiary = async (beneficiary) => {
    const payload = {
      bankAccountId:
        beneficiary.bankAccountId ||
        beneficiary.bank_account_id ||
        displayAccounts[0]?.id ||
        displayAccounts[0]?.accountNumber,
      name: beneficiary.name || beneficiary.beneficiaryName || '',
      accountNumber: beneficiary.accountNumber || beneficiary.account_number || '',
      ifsc: beneficiary.ifsc || beneficiary.ifscCode || beneficiary.ifsc_code || '',
      vendorId: beneficiary.vendorId || beneficiary.vendor_id || undefined,
      payeeType: 'ACCOUNT',
    };
    const verified = await handleVerifyBeneficiary(payload);
    if (!verified) return false;
    return handleSaveBeneficiary({
      ...payload,
      validationReference:
        verified.validationReference ||
        verified.referenceId ||
        verified.correlationId,
      verified: true,
    });
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
          {canManageNotificationSettings && (
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
          {isBankingEnabled && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm mb-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold font-['Manrope'] mb-1">Connected Banking</h3>
                  <p className="text-sm text-muted-foreground">
                    Submit bank account details for Optifii verification before using them for payments.
                  </p>
                </div>
                <Button variant="outline" onClick={() => navigate('/banking')}>
                  Open Banking
                </Button>
              </div>
              {displayIsSetupReady ? null : setupStatus === BANKING_SETUP_STATUS.PENDING_VERIFICATION ? (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Bank account verification is pending.
                </p>
              ) : setupStatus === BANKING_SETUP_STATUS.ACTION_REQUIRED ? (
                <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  A bank account request was rejected. Review the reason, then edit and resubmit or delete the request.
                </p>
              ) : (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Submit bank account details for verification before releasing payouts.
                </p>
              )}
              <BankingSetupSteps gateState={displayGateState} />
              <div className="grid gap-4 md:grid-cols-2">
                {displayIsAccountLinked ? (
                  <AccountStatusCard
                    accounts={displayAccounts}
                    canManage={canManageBanking}
                    actionLoading={updatingAccountStatus || deletingAccount}
                    onEditRejected={setEditingRejectedAccount}
                    onDeleteRejected={handleDeleteRejectedAccount}
                    onToggleActive={handleToggleAccountActive}
                  />
                ) : null}
                {canManageBanking ? (
                  <AccountLinkCard
                    canManage={canManageBanking}
                    linking={linkingAccount || updatingAccount}
                    initialAccount={editingRejectedAccount}
                    mode={editingRejectedAccount ? 'resubmit' : 'submit'}
                    onCancel={() => setEditingRejectedAccount(null)}
                    onLinkAccount={handleLinkAccount}
                  />
                ) : null}
              </div>
              {hasPaymentReadyAccount ? (
                <div className="space-y-4">
                  {canManageBeneficiaries ? (
                    <BeneficiaryForm
                      accounts={paymentReadyAccounts}
                      canManage={canManageBeneficiaries}
                      validating={validatingBeneficiary}
                      saving={savingBeneficiary}
                      onVerify={handleVerifyBeneficiary}
                      onSave={handleSaveBeneficiary}
                    />
                  ) : null}
                  <div>
                    <h4 className="mb-3 text-base font-semibold">Beneficiaries</h4>
                    <BeneficiariesTable
                      beneficiaries={beneficiaries}
                      canManage={canManageBeneficiaries}
                      onRegister={handleRetryBeneficiary}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </TabsContent>}

        {canViewBillingSettings && <TabsContent value="billing">
          <CreditsPage />
        </TabsContent>}

        {canManageNotificationSettings && <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>}

      </Tabs>

    </div>
  );
};

export default Settings;
