import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import AppDataTable from '../../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../../components/ui/table';
import { cn } from '../../../lib/utils';
import { Check, Smartphone } from 'lucide-react';
import {
  useReleasePayrunMutation,
  useRequestPayrunReleaseOtpMutation,
  useResendPayrunReleaseOtpMutation,
} from '../../../Services/apis/approvalsPaymentsBankingApi';
import { useGetBankingAccountBalanceQuery } from '../../../Services/apis/connectedBankingApi';
import { DEFAULT_CURRENCY, formatCurrency } from '../../../utils/currency';
import { isBankAccountPaymentEligible } from '../../banking/utils/bankAccounts';
import { getPayableDisplayLabel } from '../utils/payableRows';

const OTP_RESEND_COOLDOWN_SECONDS = 30;

const preventDialogOutsideDismiss = (event) => {
  event.preventDefault();
};

const formatMoney = (value, currency = DEFAULT_CURRENCY) =>
  formatCurrency(Number(value || 0), currency);

const getInvoicePaymentCurrency = (invoice = {}, fallbackCurrency = DEFAULT_CURRENCY) =>
  invoice.convertToInr ? DEFAULT_CURRENCY : invoice.currency || fallbackCurrency;

const clippedTableText = (value, className = '') => {
  const text = String(value || '-');
  return (
    <span className={cn('block min-w-0 truncate text-left', className)} title={text}>
      {text}
    </span>
  );
};

const getPaymentModeRecommendation = (amount = 0) => {
  const total = Number(amount || 0);
  if (total < 200000) {
    return {
      recommendedMode: 'IMPS',
      enabledModes: ['IMPS', 'NEFT', 'RTGS'],
      reason: 'Fastest option',
    };
  }
  if (total < 500000) {
    return {
      recommendedMode: 'IMPS',
      enabledModes: ['IMPS', 'NEFT'],
      reason: 'Fastest eligible option',
    };
  }
  if (total < 1000000) {
    return {
      recommendedMode: 'NEFT',
      enabledModes: ['NEFT', 'RTGS'],
      reason: 'IMPS limit exceeded',
    };
  }
  return {
    recommendedMode: 'RTGS',
    enabledModes: ['RTGS'],
    reason: 'Only eligible payment mode',
  };
};

const getBeneficiaryReleaseStatusMeta = (status = '') => {
  const normalized = String(status || 'UNVERIFIED').trim().toUpperCase();
  if (normalized === 'VERIFIED') {
    return {
      label: 'Verified',
      ready: true,
      className: 'bg-emerald-100 text-emerald-800',
    };
  }

  return {
    label: 'Unverified',
    ready: false,
    className: 'bg-amber-100 text-amber-800',
  };
};

const getInvoiceBeneficiaryAccounts = (invoice = {}) => {
  const accounts =
    invoice.beneficiaryAccounts ||
    invoice.beneficiary_accounts ||
    invoice.vendorAccounts ||
    invoice.vendor_accounts ||
    invoice.bankAccounts ||
    invoice.bank_accounts ||
    [];

  if (Array.isArray(accounts) && accounts.length > 0) {
    return accounts.map((account, index) => {
      const status = account.status || account.validationStatus || account.validation_status || 'UNVERIFIED';
      const statusMeta = getBeneficiaryReleaseStatusMeta(status);
      const beneficiaryId =
        account.beneficiaryId ||
        account.beneficiary_id ||
        '';
      return {
        id:
          beneficiaryId ||
          `${invoice.id || invoice.invoiceNumber}-beneficiary-${index}`,
        beneficiaryId,
        selected: Boolean(account.selected),
        bankName: account.bankName || account.bank_name || account.bank || invoice.vendorBankName || '-',
        accountNumber:
          account.accountNumber ||
          account.account_number ||
          account.vendorAccountNumber ||
          account.vendor_account_number ||
          '-',
        ifsc:
          account.ifsc ||
          account.ifscCode ||
          account.ifsc_code ||
          account.vendorIfscCode ||
          account.vendor_ifsc_code ||
          '-',
        status,
        statusLabel: statusMeta.label,
        statusClassName: statusMeta.className,
        releaseReady: statusMeta.ready,
      };
    });
  }

  const bankName = invoice.vendorBankName || invoice.vendor_bank_name || invoice.bankName || invoice.bank_name;
  const accountNumber =
    invoice.vendorAccountNumber ||
    invoice.vendor_account_number ||
    invoice.accountNumber ||
    invoice.account_number;
  const ifsc =
    invoice.vendorIfscCode ||
    invoice.vendor_ifsc_code ||
    invoice.ifscCode ||
    invoice.ifsc_code ||
    invoice.ifsc;

  if (!bankName && !accountNumber && !ifsc) return [];

  return [{
    id: `${invoice.id || invoice.invoiceNumber}-default-beneficiary`,
    beneficiaryId: '',
    selected: false,
    bankName: bankName || '-',
    accountNumber: accountNumber || '-',
    ifsc: ifsc || '-',
    status: 'UNVERIFIED',
    statusLabel: 'Unverified',
    statusClassName: 'bg-amber-100 text-amber-800',
    releaseReady: false,
  }];
};

const getBeneficiaryAccountKey = (invoiceId, accountId) => `${invoiceId}::${accountId}`;

const getReleaseBankAccountId = (account) =>
  account?.id || account?.bankAccountId || account?.accountNumber || account?.account_number;

const getOtpRecipientName = (payrun = {}) =>
  payrun.releaseOwner?.name ||
  payrun.release_owner?.name ||
  payrun.releaser?.name ||
  payrun.admin?.name ||
  'the releaser';

const getOtpRecipientMobile = (payrun = {}) =>
  payrun.releaseOwner?.mobile ||
  payrun.release_owner?.mobile ||
  payrun.releaser?.mobile ||
  payrun.admin?.mobile ||
  payrun.otpMobile ||
  payrun.otp_mobile ||
  'registered mobile';

const OtpVerificationPanel = ({
  payrun,
  otp,
  setOtp,
  otpCooldownSeconds,
  onBack,
  onVerify,
  onResend,
  requestingOtp,
  resendingOtp,
  releasingPayrun,
}) => {
  const digits = Array.from({ length: 6 }, (_, index) => otp[index] || '');
  const recipientName = getOtpRecipientName(payrun);
  const recipientMobile = getOtpRecipientMobile(payrun);

  const updateDigit = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    setOtp(nextDigits.join('').trim());

    if (digit && index < 5) {
      document.getElementById(`release-otp-${index + 2}`)?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      document.getElementById(`release-otp-${index}`)?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    setOtp(pasted);
    document.getElementById(`release-otp-${Math.min(pasted.length, 6)}`)?.focus();
  };

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-7 py-8 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
        <Smartphone className="h-8 w-8" />
      </div>
      <h3 className="m-0 text-xl font-bold text-slate-950">OTP Verification</h3>
      <p className="mt-3 text-sm text-slate-500">
        Enter the 6-digit OTP sent to <span className="font-semibold text-slate-600">{recipientName}</span> at{' '}
        <span className="font-semibold text-slate-600">{recipientMobile}</span>
      </p>

      <div className="mt-8 flex justify-center gap-3" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <Input
            key={`otp-${index}`}
            id={`release-otp-${index + 1}`}
            value={digit}
            inputMode="numeric"
            maxLength={1}
            onChange={(event) => updateDigit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            className="h-14 w-12 flex-none rounded-xl border-2 border-slate-200 bg-white p-0 text-center text-xl font-semibold text-slate-950 shadow-sm focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-200 sm:w-14"
            aria-label={`OTP digit ${index + 1}`}
          />
        ))}
      </div>

      <div className="mt-5 text-sm text-slate-500">
        {resendingOtp ? (
          'Sending...'
        ) : otpCooldownSeconds > 0 ? (
          `Resend OTP in ${otpCooldownSeconds}s`
        ) : (
          <button type="button" onClick={onResend} className="font-semibold text-violet-700 hover:underline">
            Resend OTP
          </button>
        )}
      </div>

      <div className="mt-7 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" className="h-11" onClick={onBack}>
          ← Back
        </Button>
        <Button
          type="button"
          className="h-11 bg-violet-700 hover:bg-violet-800"
          onClick={onVerify}
          disabled={requestingOtp || resendingOtp || releasingPayrun || otp.trim().length < 6}
        >
          {releasingPayrun ? (
            'Releasing...'
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" /> Verify & Release Payment
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

const ReleasePaymentDialog = ({ payrun, open, onOpenChange, bankAccounts, onPaid, showBatchField = false }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [bankAccountId, setBankAccountId] = useState('');
  const [mode, setMode] = useState('NEFT');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldownSeconds, setOtpCooldownSeconds] = useState(0);
  const [otp, setOtp] = useState('');
  const [otpRequestId, setOtpRequestId] = useState('');
  const [selectedBeneficiaryAccounts, setSelectedBeneficiaryAccounts] = useState({});
  const [requestReleaseOtp, { isLoading: requestingOtp }] = useRequestPayrunReleaseOtpMutation();
  const [resendReleaseOtp, { isLoading: resendingOtp }] = useResendPayrunReleaseOtpMutation();
  const [releasePayrunPayment, { isLoading: releasingPayrun }] = useReleasePayrunMutation();
  const totalDebitAmount = Number(payrun?.totalAmount || 0);
  const payrunCurrency = payrun?.currency || DEFAULT_CURRENCY;
  const hasSourceAwareRows = payrun?.invoices?.some(
    (invoice) => invoice.sourceType && invoice.sourceType !== 'INVOICE',
  );
  const paymentModeRecommendation = getPaymentModeRecommendation(totalDebitAmount);
  const releaseBankAccounts = useMemo(() => {
    const eligibleAccounts = bankAccounts.filter(isBankAccountPaymentEligible);
    return eligibleAccounts.length > 0 ? eligibleAccounts : bankAccounts;
  }, [bankAccounts]);
  const selectedAccount = releaseBankAccounts.find((account) => String(getReleaseBankAccountId(account)) === String(bankAccountId));
  const selectedBalanceAccountId = selectedAccount ? String(getReleaseBankAccountId(selectedAccount)) : '';
  const {
    data: selectedAccountBalance,
    isFetching: isBalanceFetching,
    refetch: refetchSelectedAccountBalance,
  } = useGetBankingAccountBalanceQuery(selectedBalanceAccountId, {
    skip: !open || !selectedBalanceAccountId,
  });

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setBankAccountId('');
    setMode(paymentModeRecommendation.recommendedMode);
    setOtpSent(false);
    setOtpCooldownSeconds(0);
    setOtp('');
    setOtpRequestId('');
    setSelectedBeneficiaryAccounts(
      Object.fromEntries(
        (payrun?.invoices || []).map((invoice) => {
          const accounts = getInvoiceBeneficiaryAccounts(invoice);
          const selectableAccounts = accounts.filter((account) => account.beneficiaryId);
          const selectedAccount =
            selectableAccounts.find((account) => account.selected) ||
            selectableAccounts[0];
          return [invoice.id, selectedAccount?.id || ''];
        }),
      ),
    );
  }, [open, paymentModeRecommendation.recommendedMode, payrun]);

  useEffect(() => {
    if (!open) return;
    if (!paymentModeRecommendation.enabledModes.includes(mode)) {
      setMode(paymentModeRecommendation.recommendedMode);
    }
  }, [mode, open, paymentModeRecommendation.enabledModes, paymentModeRecommendation.recommendedMode]);

  useEffect(() => {
    if (!open || bankAccountId || releaseBankAccounts.length !== 1) return;
    const onlyAccountId = getReleaseBankAccountId(releaseBankAccounts[0]);
    if (onlyAccountId) {
      setBankAccountId(String(onlyAccountId));
    }
  }, [bankAccountId, open, releaseBankAccounts]);

  useEffect(() => {
    if (!open || !bankAccountId) return;
    const stillEligible = releaseBankAccounts.some(
      (account) => String(getReleaseBankAccountId(account)) === String(bankAccountId),
    );
    if (!stillEligible) {
      setBankAccountId('');
      setOtpSent(false);
      setOtp('');
      setOtpRequestId('');
      toast.error('The selected bank account is no longer active. Select another active verified account and request a new OTP.');
    }
  }, [bankAccountId, open, releaseBankAccounts]);

  useEffect(() => {
    if (!open) return;
    setOtpSent(false);
    setOtp('');
    setOtpRequestId('');
    setOtpCooldownSeconds(0);
  }, [bankAccountId, open]);

  useEffect(() => {
    if (!open || !otpSent || otpCooldownSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setOtpCooldownSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [open, otpCooldownSeconds, otpSent]);

  if (!payrun) return null;
  const hasEligibleBankAccount = releaseBankAccounts.length > 0;
  const releaseSteps = ['Verify Beneficiaries', 'Debit Account', 'Review & Release'];
  const paymentModes = ['IMPS', 'NEFT', 'RTGS'];
  const chargeAmount = 0;
  const fallbackAvailableBalance = selectedAccount?.availableBalance ?? selectedAccount?.available_balance ?? selectedAccount?.balance;
  const availableBalance =
    selectedAccountBalance?.availableBalance ??
    selectedAccountBalance?.available_balance ??
    selectedAccountBalance?.balance ??
    fallbackAvailableBalance;
  const balanceAfter =
    availableBalance === undefined || availableBalance === null
      ? null
      : Number(availableBalance || 0) - totalDebitAmount - chargeAmount;
  const bankName = selectedAccount?.label || selectedAccount?.bankName || selectedAccount?.bank || 'IDFC Bank';
  const accountNumber = selectedAccount?.maskedAccountNumber || selectedAccount?.accountNumber || 'Account';

  const renderReleaseSection = (title, children) => (
    <section>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.09em] text-slate-400">
        {title}
      </p>
      <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white">
        {children}
      </div>
    </section>
  );

  const renderReleaseRow = (label, value, { mono = false } = {}) => (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-3.5 py-2.5 last:border-b-0">
      <span className="shrink-0 text-[13px] text-slate-500">{label}</span>
      <span className={`min-w-0 text-right text-[13px] font-medium text-slate-900 ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );

  const getSelectedBeneficiaryForInvoice = (invoice) => {
    const beneficiaryAccounts = getInvoiceBeneficiaryAccounts(invoice);
    const selectableAccounts = beneficiaryAccounts.filter((account) => account.beneficiaryId);
    const selectedBeneficiaryId = selectedBeneficiaryAccounts[invoice.id] || '';
    const selectedBeneficiary = selectableAccounts.find((account) => String(account.id) === String(selectedBeneficiaryId));
    if (selectedBeneficiary) return selectedBeneficiary;
    if (selectableAccounts.length > 0) return selectableAccounts[0];

    return beneficiaryAccounts[0] || null;
  };

  const getSelectedBeneficiaryPayload = () => {
    const selected = (payrun.invoices || []).flatMap((invoice) => {
      const selectedBeneficiary = getSelectedBeneficiaryForInvoice(invoice) || {};
      if (!selectedBeneficiary.beneficiaryId) return [];
      return [{
        invoiceId: invoice.invoiceId || invoice.invoice_id || invoice.id,
        payrunItemId: invoice.payrunItemId || invoice.payrun_item_id,
        beneficiaryId: selectedBeneficiary.beneficiaryId,
      }];
    });
    return selected.length > 0 ? selected : undefined;
  };

  const hasReleaseInvoices = Array.isArray(payrun.invoices) && payrun.invoices.length > 0;
  const canContinueReleaseStep =
    (step === 1 && hasReleaseInvoices) ||
    (step === 2 && hasEligibleBankAccount && selectedAccount && !isBalanceFetching);

  const getPayrunId = () => payrun.payrunId || payrun.id;
  const getOtpRequestId = (response) =>
    response?.otpRequestId ||
    response?.data?.otpRequestId ||
    response?.otp_request_id ||
    response?.data?.otp_request_id ||
    '';

  const requestOtp = async ({ resend = false } = {}) => {
    if (!selectedAccount) {
      toast.error('Select an active verified bank account before requesting OTP');
      return false;
    }
    const payrunId = getPayrunId();
    if (!payrunId) {
      toast.error('Payrun id is missing');
      return false;
    }
    try {
      if (selectedBalanceAccountId) {
        const balanceResult = await refetchSelectedAccountBalance();
        const latestBalance =
          balanceResult?.data?.availableBalance ??
          balanceResult?.data?.available_balance ??
          balanceResult?.data?.balance ??
          null;

        if (latestBalance === null || latestBalance === undefined) {
          toast.error('Unable to fetch the latest bank balance. Please try again.');
          return false;
        }

        if (Number(latestBalance || 0) < totalDebitAmount + chargeAmount) {
          toast.error('Insufficient bank balance for this payment release.');
          return false;
        }
      }

      const selectedBeneficiaries = getSelectedBeneficiaryPayload();
      const payload = {
        payrunId,
        bankAccountId: getReleaseBankAccountId(selectedAccount),
        paymentMode: mode,
        amount: Number(payrun.totalAmount || 0),
        currency: payrunCurrency,
        ...(selectedBeneficiaries ? { beneficiaries: selectedBeneficiaries } : {}),
      };
      const response = resend
        ? await resendReleaseOtp({ ...payload, otpRequestId }).unwrap()
        : await requestReleaseOtp(payload).unwrap();
      setOtpRequestId(getOtpRequestId(response));
      setOtpSent(true);
      setOtp('');
      setOtpCooldownSeconds(OTP_RESEND_COOLDOWN_SECONDS);
      toast.success(response?.message || response?.data?.message || 'OTP sent');
      return true;
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || 'Failed to send OTP');
      return false;
    }
  };

  const payNow = async () => {
    if (!selectedAccount) {
      toast.error('Select an active verified bank account before releasing payment');
      return;
    }
    if (!otpSent) {
      await requestOtp();
      return;
    }
    if (otp.trim().length < 4) {
      toast.error('Enter the OTP to release payment');
      return;
    }
    const payrunId = getPayrunId();
    if (!payrunId) {
      toast.error('Payrun id is missing');
      return;
    }
    let releaseResponse;
    try {
      const selectedBeneficiaries = getSelectedBeneficiaryPayload();
      releaseResponse = await releasePayrunPayment({
        payrunId,
        bankAccountId: getReleaseBankAccountId(selectedAccount),
        paymentMode: mode,
        otpRequestId,
        otp: otp.trim(),
        ...(selectedBeneficiaries ? { beneficiaries: selectedBeneficiaries } : {}),
      }).unwrap();
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || 'Failed to release payment');
      return;
    }
    const paidAt = new Date().toISOString();
    const releaseItems =
      releaseResponse?.items ||
      releaseResponse?.data?.items ||
      releaseResponse?.transfers ||
      releaseResponse?.data?.transfers ||
      [];
    const paidInvoices = payrun.invoices.map((invoice, index) => ({
      ...invoice,
      status: 'Paid',
      utr:
        releaseItems[index]?.utr ||
        releaseItems[index]?.utrNumber ||
        releaseItems[index]?.utr_number ||
        invoice.utr ||
        '-',
      paidOn: paidAt,
    }));
    onPaid({
      ...payrun,
      status: 'Paid',
      paidOn: paidAt,
      mode,
      bank: selectedAccount?.label || selectedAccount?.bankName || selectedAccount?.bank || 'IDFC Bank',
      invoices: paidInvoices,
      timeline: [
        ...(payrun.timeline || []),
        { label: 'Payment released', actor: payrun.admin?.name || 'Admin / Master Admin', at: paidAt },
      ],
    });
    toast.success(releaseResponse?.message || releaseResponse?.data?.message || 'Payment released');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[90vh] flex-col overflow-hidden',
          otpSent ? 'max-w-3xl rounded-2xl' : 'max-w-5xl',
        )}
        onInteractOutside={preventDialogOutsideDismiss}
      >
        {otpSent ? (
          <OtpVerificationPanel
            payrun={payrun}
            otp={otp}
            setOtp={setOtp}
            otpCooldownSeconds={otpCooldownSeconds}
            onBack={() => {
              setOtpSent(false);
              setOtp('');
              setOtpRequestId('');
              setOtpCooldownSeconds(0);
            }}
            onVerify={payNow}
            onResend={() => requestOtp({ resend: true })}
            requestingOtp={requestingOtp}
            resendingOtp={resendingOtp}
            releasingPayrun={releasingPayrun}
          />
        ) : (
          <>
            <DialogHeader className="shrink-0">
              <DialogTitle>Release Payment - {payrun.batchId}</DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 pb-2">
          <div className="flex flex-wrap gap-2">
            {releaseSteps.map((label, index) => {
              const stepNumber = index + 1;
              const active = step === stepNumber;
              const done = step > stepNumber;
              return (
                <span
                  key={label}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-border text-muted-foreground'
                  }`}
                >
                  {stepNumber}. {label}
                </span>
              );
            })}
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 px-[18px] py-4">
            <p className="mb-0.5 text-xs text-slate-500">Total Debit</p>
            <p className="m-0 text-[22px] font-extrabold text-slate-900">{formatMoney(totalDebitAmount, payrunCurrency)}</p>
          </div>

          {step === 1 && (
            <div className="space-y-5">
              {renderReleaseSection(
                hasSourceAwareRows ? 'Payable Details' : 'Invoice Details',
                <>
                  <AppDataTable
                    tableHeader={[
                      { key: 'vendorName', title: 'Vendor' },
                      { key: 'invoiceNumber', title: hasSourceAwareRows ? 'Reference' : 'Invoice' },
                      { key: 'beneficiaryAccount', title: 'Beneficiary Account' },
                      { key: 'bank', title: 'Bank' },
                      { key: 'ifsc', title: 'IFSC' },
                      { key: 'amount', title: 'Amount', headerClassName: 'text-left', cellClassName: 'text-left' },
                      { key: 'status', title: 'Status' },
                    ]}
                    tableData={payrun.invoices}
                    rowKey="id"
                    tableClassName="min-w-[920px] table-fixed text-sm"
                    tableContainerClassName="max-h-[360px] overflow-auto"
                    emptyMessage="No invoices in this payrun"
                    renderRow={(invoice) => {
                      const beneficiaryAccounts = getInvoiceBeneficiaryAccounts(invoice);
                      const selectableBeneficiaryAccounts = beneficiaryAccounts.filter((account) => account.beneficiaryId);
                      const hasMultipleAccounts = selectableBeneficiaryAccounts.length > 1;
                      const selectedBeneficiaryId = selectedBeneficiaryAccounts[invoice.id] || selectableBeneficiaryAccounts[0]?.id || '';
                      const selectedBeneficiary = getSelectedBeneficiaryForInvoice(invoice) || {};

                      return (
                        <TableRow key={invoice.id} className="align-top">
                          <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3.5 py-3 text-left font-medium text-slate-900">
                            {clippedTableText(invoice.vendorName)}
                          </TableCell>
                          <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3.5 py-3 text-left text-primary">
                            <div className="min-w-0">
                              {invoice.sourceType && invoice.sourceType !== 'INVOICE' ? (
                                <span className="mb-0.5 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                  {invoice.sourceType}
                                </span>
                              ) : null}
                              {clippedTableText(getPayableDisplayLabel(invoice))}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[220px] overflow-hidden whitespace-nowrap px-3.5 py-3 text-left">
                            {hasMultipleAccounts ? (
                              <Select
                                value={String(selectedBeneficiaryId)}
                                onValueChange={(value) =>
                                  setSelectedBeneficiaryAccounts((prev) => ({
                                    ...prev,
                                    [invoice.id]: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9 w-full min-w-0">
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectableBeneficiaryAccounts.map((account) => {
                                    const accountLabel = `${account.accountNumber} · ${account.ifsc} · ${account.bankName}`;
                                    return (
                                      <SelectItem
                                        key={getBeneficiaryAccountKey(invoice.id, account.id)}
                                        value={String(account.id)}
                                        title={accountLabel}
                                      >
                                        <span className="block max-w-[380px] truncate">
                                          {accountLabel}
                                        </span>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span
                                className="block min-w-0 truncate font-mono text-xs text-slate-700"
                                title={selectedBeneficiary.accountNumber || '-'}
                              >
                                {selectedBeneficiary.accountNumber || '-'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3.5 py-3 text-left text-slate-700">
                            {clippedTableText(selectedBeneficiary.bankName)}
                          </TableCell>
                          <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3.5 py-3 text-left font-mono text-xs text-slate-700">
                            {clippedTableText(selectedBeneficiary.ifsc)}
                          </TableCell>
                          <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3.5 py-3 text-left font-semibold text-slate-900">
                            <div className="min-w-0">
                              {clippedTableText(formatMoney(invoice.requestedAmount, getInvoicePaymentCurrency(invoice, payrunCurrency)))}
                              {invoice.hasAdvanceAdjustment ? (
                                <span className="block truncate text-[11px] font-normal text-slate-500">
                                  Advance Adjusted: -{formatMoney(invoice.advanceAdjustedTotal, invoice.currency)}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3.5 py-3 text-left">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${
                                selectedBeneficiary.statusClassName || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {selectedBeneficiary.statusLabel || selectedBeneficiary.status || 'Not Verified'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    }}
                  />
                </>,
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {renderReleaseSection(
                'Payment Details',
                <div className="space-y-4 p-3.5">
                  {!hasEligibleBankAccount ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-medium">No active verified bank account is available.</p>
                      <p className="mt-1">
                        Activate an approved account or submit a new bank account for verification before releasing this payment.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3 bg-white"
                        onClick={() => {
                          onOpenChange(false);
                          navigate('/settings?tab=banking');
                        }}
                      >
                        Manage Bank Accounts
                      </Button>
                    </div>
                  ) : null}

                  <div>
                    <Label className="text-[13px] font-medium text-slate-700">Pay From</Label>
                    <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                      {releaseBankAccounts.map((account) => {
                        const accountId = String(getReleaseBankAccountId(account));
                        const active = String(bankAccountId) === accountId;
                        const accountBankName = account.label || account.bankName || account.bank || 'IDFC Bank';
                        const accountDisplay = account.maskedAccountNumber || account.accountNumber || 'Account';
                        const fallbackAccountBalance = account.availableBalance ?? account.available_balance ?? account.balance;
                        const accountBalance = active ? availableBalance : fallbackAccountBalance;
                        const accountInitials = String(accountBankName)
                          .split(/\s+/)
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase();

                        return (
                          <button
                            key={accountId}
                            type="button"
                            onClick={() => setBankAccountId(accountId)}
                            className={`flex w-full items-center gap-3 rounded-[10px] border p-3 text-left transition ${
                              active
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 bg-white hover:border-primary/50 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-orange-500 text-[11px] font-extrabold text-white">
                              {accountInitials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="m-0 truncate text-[13.5px] font-semibold text-slate-900">
                                {accountBankName} · {accountDisplay}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                Available:{' '}
                                {active && isBalanceFetching
                                  ? 'Fetching...'
                                  : accountBalance === undefined || accountBalance === null
                                    ? '-'
                                    : formatMoney(accountBalance)}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${
                                active
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {active ? 'Selected' : 'Active'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label className="text-[13px] font-medium text-slate-700">Payment Mode</Label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {paymentModes.map((paymentMode) => {
                        const active = mode === paymentMode;
                        const enabled = paymentModeRecommendation.enabledModes.includes(paymentMode);
                        return (
                          <button
                            key={paymentMode}
                            type="button"
                            onClick={() => {
                              if (enabled) setMode(paymentMode);
                            }}
                            disabled={!hasEligibleBankAccount || !enabled}
                            className={`rounded-[10px] border-2 px-3 py-2 text-left transition ${
                              !enabled
                                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70'
                                : active
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-primary/50'
                            }`}
                          >
                            <span className="block text-[12.5px] font-bold">{paymentMode}</span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {paymentMode === 'IMPS' ? '<₹5L' : paymentMode === 'RTGS' ? '₹2L+' : 'Any'}
                            </span>
                            {paymentMode === paymentModeRecommendation.recommendedMode ? (
                              <span className="mt-1 block text-[11px] font-semibold text-primary">
                                Recommended
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12.5px] text-blue-900">
                      Recommended: <strong>{paymentModeRecommendation.recommendedMode}</strong> for this batch amount of{' '}
                      <strong>{formatMoney(totalDebitAmount, payrunCurrency)}</strong> ({paymentModeRecommendation.reason})
                    </div>
                  </div>
                </div>,
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              {renderReleaseSection(
                'Review',
                <>
                  {showBatchField ? renderReleaseRow('Batch', payrun.batchId || payrun.payrunNumber || '-') : null}
                  {renderReleaseRow('Debit Account', selectedAccount ? `${bankName} · ${accountNumber}` : '-')}
                  {renderReleaseRow('Payment Mode', mode)}
                  {renderReleaseRow('Invoice Amount', formatMoney(totalDebitAmount, payrunCurrency))}
                  {renderReleaseRow(`Charges (${mode})`, chargeAmount > 0 ? formatMoney(chargeAmount) : 'Free')}
                  {renderReleaseRow('Total Debit', formatMoney(totalDebitAmount + chargeAmount))}
                  {renderReleaseRow(
                    'Balance After',
                    isBalanceFetching
                      ? 'Fetching...'
                      : balanceAfter === null
                      ? '-'
                      : balanceAfter < 0
                        ? 'Insufficient funds'
                        : formatMoney(balanceAfter),
                  )}
                </>,
              )}

            </div>
          )}
            </div>

            <DialogFooter className="shrink-0 border-t pt-4">
              {step > 1 && <Button variant="outline" onClick={() => setStep((prev) => prev - 1)}>Back</Button>}
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              {step < 3 ? (
                <Button
                  onClick={() => {
                    setStep((prev) => prev + 1);
                  }}
                  disabled={!canContinueReleaseStep}
                >
                  Continue
                </Button>
              ) : (
                <Button onClick={payNow} disabled={!selectedAccount || requestingOtp || resendingOtp || releasingPayrun}>
                  {releasingPayrun
                    ? 'Releasing...'
                    : requestingOtp
                      ? 'Sending OTP...'
                      : 'Release Payment'}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReleasePaymentDialog;
