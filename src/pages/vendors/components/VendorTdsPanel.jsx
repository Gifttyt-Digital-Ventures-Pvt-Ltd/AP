import React from 'react';
import TdsSelectionField from '../../invoices/components/TdsSelectionField';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import {
  useGetVendorTdsEffectiveRateQuery,
} from '../../../Services/apis/taxApi';
import useTdsSubscription from '../../../hooks/useTdsSubscription';
import EffectiveRateBadge from './EffectiveRateBadge';
import VendorTdsCertificates from './VendorTdsCertificates';
import {
  createEmptyVendorTds,
  hasConfiguredVendorTds,
  normalizeVendorTds,
  vendorTdsFromSelection,
  vendorTdsToSelectionValue,
} from '../utils/vendorTds';

const VendorTdsPanel = ({
  tdsMapping = null,
  onChange,
  disabled = false,
  readOnly = false,
  vendorId = null,
  vendorStatus = "",
  tdsCertificates = [],
  onCertificatesChange,
}) => {
  const mapping = normalizeVendorTds(tdsMapping);
  const selectionValue = vendorTdsToSelectionValue(mapping);
  const hasTds = hasConfiguredVendorTds(mapping);
  const { isTdsSubscriptionEnabled } = useTdsSubscription();
  const {
    data: effectiveRate,
    isFetching: effectiveRateLoading,
    isError: effectiveRateError,
    error: effectiveRateErrorPayload,
  } =
    useGetVendorTdsEffectiveRateQuery(
      { vendorId, sectionCode: mapping.sectionCode },
      { skip: !isTdsSubscriptionEnabled || !vendorId || !mapping.sectionCode },
    );

  if (readOnly) {
    if (!hasConfiguredVendorTds(mapping)) {
      return (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          No TDS configured.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <EffectiveRateBadge
          rateInfo={effectiveRate}
          fallbackRate={mapping.rate}
          fallbackSection={mapping.sectionCode}
          loading={effectiveRateLoading}
          error={effectiveRateError ? effectiveRateErrorPayload : null}
        />
        <VendorTdsCertificates
          vendorId={vendorId}
          vendorStatus={vendorStatus}
          defaultSection={mapping.sectionCode}
          enabled={isTdsSubscriptionEnabled}
          pendingCertificates={tdsCertificates}
          onPendingCertificatesChange={onCertificatesChange}
          readOnly
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-sm font-medium">TDS applicable</Label>
          <p className="text-xs text-muted-foreground">
            Backend applies threshold/certificate rules by section.
          </p>
        </div>
        <Switch
          checked={hasTds}
          disabled={disabled}
          onCheckedChange={(checked) => {
            if (!checked) onChange?.(createEmptyVendorTds());
          }}
        />
      </div>

      {hasTds ? (
        <>
          <div>
            <Label className="text-xs">Section / custom rate</Label>
            <TdsSelectionField
              value={selectionValue}
              onChange={(selection) => {
                if (!selection?.tds) {
                  onChange?.(createEmptyVendorTds());
                  return;
                }
                onChange?.(vendorTdsFromSelection(selection));
              }}
              disabled={disabled}
              showLabel={false}
              testIdPrefix="vendor-tds"
            />
          </div>
          <EffectiveRateBadge
            rateInfo={effectiveRate}
            fallbackRate={mapping.rate}
            fallbackSection={mapping.sectionCode}
            loading={effectiveRateLoading}
            error={effectiveRateError ? effectiveRateErrorPayload : null}
          />
          <VendorTdsCertificates
            vendorId={vendorId}
            vendorStatus={vendorStatus}
            defaultSection={mapping.sectionCode}
            enabled={isTdsSubscriptionEnabled}
            pendingCertificates={tdsCertificates}
            onPendingCertificatesChange={onCertificatesChange}
          />
        </>
      ) : (
        <>
          <div>
            <TdsSelectionField
              value={selectionValue}
              onChange={(selection) => onChange?.(vendorTdsFromSelection(selection))}
              disabled={disabled}
              showLabel={false}
              testIdPrefix="vendor-tds"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Select a section to enable TDS for this vendor.
            </p>
          </div>
          <VendorTdsCertificates
            vendorId={vendorId}
            vendorStatus={vendorStatus}
            defaultSection={mapping.sectionCode}
            enabled={isTdsSubscriptionEnabled}
            pendingCertificates={tdsCertificates}
            onPendingCertificatesChange={onCertificatesChange}
          />
        </>
      )}
    </div>
  );
};

export default VendorTdsPanel;
