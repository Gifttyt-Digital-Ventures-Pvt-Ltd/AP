import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { humanizeGstEnum } from '../../pages/tax-management/utils/gstApiMappers';
import {
  GSTIN_PATTERN,
  useVendorGstAutofill,
} from '../../pages/tax-management/hooks/useVendorGstAutofill';
import { cn } from '../../lib/utils';

const isValidGstin = (value) => GSTIN_PATTERN.test(String(value || '').trim().toUpperCase());

const GstStatusBadge = ({ status, valid }) => {
  const normalized = String(status || '').toLowerCase();
  const isActive = normalized.includes('active') || normalized === 'act';
  const isInvalid = valid === false;

  const className = isInvalid
    ? 'border-red-200 bg-red-50 text-red-700'
    : isActive
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-amber-200 bg-amber-50 text-amber-800';

  return (
    <Badge variant="outline" className={cn('font-medium', className)}>
      {isInvalid ? 'Invalid GSTIN' : humanizeGstEnum(status) || 'Verified'}
    </Badge>
  );
};

/**
 * GST portal lookup once a valid GSTIN is entered.
 * Calls POST /tax/gst/vendor/details (no taxpayer OTP).
 */
const VendorGstVerificationBlock = ({
  gstin,
  onGstinChange,
  onVerified,
  onVerificationChange,
  verificationRequired = false,
  showVerificationError = false,
  gstLabel = 'GSTIN',
  gstRequired = false,
  panLabel = 'PAN Number',
  panRequired = false,
  panValue,
  onPanChange,
  showMsme = true,
  msmeLabel = 'MSME registered vendor',
  msmeRequired = false,
  msmeValue,
  onMsmeChange,
}) => {
  const { autofillByGstin, verifyGstinNow, isLoading } = useVendorGstAutofill();
  const [verification, setVerification] = useState(null);
  const lastVerifiedGstinRef = useRef('');
  const lastRequestedGstinRef = useRef('');

  const notifyUnverified = useCallback((normalized) => {
    onVerificationChange?.({
      verified: false,
      gstin: normalized,
      validGstin: null,
    });
  }, [onVerificationChange]);

  const clearVerification = useCallback((normalized = '') => {
    setVerification(null);
    lastVerifiedGstinRef.current = '';
    lastRequestedGstinRef.current = '';
    notifyUnverified(normalized);
  }, [notifyUnverified]);

  const handleLookupResult = useCallback((gstinValue, result) => {
    if (result.success) {
      lastVerifiedGstinRef.current = gstinValue;
      lastRequestedGstinRef.current = gstinValue;
      setVerification({ status: 'verified', data: result.data });
      onVerified?.(result.data);
      onVerificationChange?.({
        verified: true,
        gstin: gstinValue,
        validGstin: result.data?.validGstin !== false,
      });
      return;
    }
    setVerification({ status: 'error', error: result.error || 'GST verification failed' });
    notifyUnverified(gstinValue);
  }, [onVerified, onVerificationChange, notifyUnverified]);

  const runVerification = useCallback(() => {
    const normalized = String(gstin || '').trim().toUpperCase();
    if (!isValidGstin(normalized)) return;
    if (lastVerifiedGstinRef.current === normalized && verification?.status === 'verified') {
      return;
    }

    lastRequestedGstinRef.current = normalized;
    setVerification({ status: 'loading' });
    verifyGstinNow(normalized, (result) => handleLookupResult(normalized, result));
  }, [gstin, verifyGstinNow, handleLookupResult, verification?.status]);

  useEffect(() => {
    const normalized = String(gstin || '').trim().toUpperCase();
    if (!normalized) {
      clearVerification('');
      return undefined;
    }

    if (!isValidGstin(normalized)) {
      if (lastVerifiedGstinRef.current || lastRequestedGstinRef.current) {
        clearVerification(normalized);
      }
      return undefined;
    }

    if (
      lastVerifiedGstinRef.current === normalized ||
      lastRequestedGstinRef.current === normalized
    ) {
      return undefined;
    }

    lastRequestedGstinRef.current = normalized;
    setVerification({ status: 'loading' });
    return autofillByGstin(normalized, (result) => handleLookupResult(normalized, result));
  }, [gstin, autofillByGstin, clearVerification, handleLookupResult]);

  const handleGstinInput = (event) => {
    const next = event.target.value.toUpperCase();
    const normalized = next.trim();
    onGstinChange(next);

    if (lastVerifiedGstinRef.current && lastVerifiedGstinRef.current !== normalized) {
      clearVerification(normalized);
    }
  };

  const verified = verification?.status === 'verified' ? verification.data : null;
  const showResult = verification?.status === 'verified' || verification?.status === 'error';

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            GST Verification
            {verificationRequired ? <span className="text-destructive"> *</span> : null}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enter a 15-character GSTIN to check it automatically against the GST portal.
          </p>
        </div>
      </div>

      <div>
        <Label>
          {gstLabel}
          {gstRequired ? ' *' : ''}
        </Label>
        <Input
          value={gstin}
          onChange={handleGstinInput}
          placeholder="29ABCDE1234F1Z5"
          maxLength={15}
          className="mt-1.5 font-mono uppercase"
          data-testid="vendor-gstin-input"
          required={gstRequired}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Looking up GSTIN on the portal…
        </div>
      ) : null}

      {showResult ? (
        <div
          className={cn(
            'rounded-md border px-3 py-3 text-sm',
            verification.status === 'verified'
              ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30'
              : 'border-red-200 bg-red-50/80 dark:border-red-900 dark:bg-red-950/30',
          )}
        >
          {verification.status === 'verified' && verified ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-emerald-900 dark:text-emerald-100">Verified from GST portal</span>
                <GstStatusBadge status={verified.gstStatus} valid={verified.validGstin} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Legal name</span>
                  <p className="font-medium mt-0.5">{verified.legalName || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Registration date</span>
                  <p className="font-medium mt-0.5">{verified.registrationDate || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">State</span>
                  <p className="font-medium mt-0.5">
                    {verified.state || '—'}
                    {verified.stateCode ? ` (${verified.stateCode})` : ''}
                  </p>
                </div>
                {verified.businessNature ? (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Business nature</span>
                    <p className="font-medium mt-0.5">{verified.businessNature}</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-2 text-red-800 dark:text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{verification.error}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={!isValidGstin(gstin) || isLoading}
                onClick={runVerification}
                data-testid="vendor-gst-retry-button"
              >
                Retry
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {showVerificationError ? (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            {verificationRequired && !String(gstin || '').trim()
              ? 'GSTIN is required. Enter it to verify automatically.'
              : 'GST verification is required before you can save this vendor.'}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 pt-1 border-t border-border/60">
        <div>
          <Label>
            {panLabel}
            {panRequired ? ' *' : ''}
          </Label>
          <Input
            value={panValue}
            onChange={(event) => onPanChange(event.target.value.toUpperCase())}
            placeholder="ABCDE1234F"
            maxLength={10}
            className="mt-1.5 uppercase"
            required={panRequired}
          />
        </div>
        {showMsme ? (
          <div className="flex items-end pb-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="vendor-msme-gst-block"
                checked={Boolean(msmeValue)}
                onCheckedChange={(checked) => onMsmeChange(checked === true)}
                data-testid="vendor-msme-checkbox"
              />
              <Label htmlFor="vendor-msme-gst-block" className="cursor-pointer font-normal">
                {msmeLabel}
                {msmeRequired ? ' *' : ''}
              </Label>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VendorGstVerificationBlock;
