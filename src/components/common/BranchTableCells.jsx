import React from 'react';
import ClippedTextWithTooltip from './ClippedTextWithTooltip';

const orgBranchLabel = (record = {}) => {
  const name = record.branchName ?? record.branch_name ?? '';
  const code = record.branchCode ?? record.branch_code ?? '';
  if (name && code) return `${name} (${code})`;
  return name || code || '';
};

const vendorBranchLabel = (record = {}) => {
  const name = record.vendorBranchName ?? record.vendor_branch_name ?? '';
  const code = record.vendorBranchCode ?? record.vendor_branch_code ?? '';
  if (name && code) return `${name} (${code})`;
  return name || code || '';
};

export const OrgBranchCell = ({ record = {}, fallback = '-' }) => {
  const text = orgBranchLabel(record);
  if (!text) return fallback;
  return <ClippedTextWithTooltip text={text} maxWidthClass="max-w-[160px]" />;
};

export const OrgBranchDetail = ({
  record = {},
  label = 'Branch',
  className = 'mt-2 text-sm text-muted-foreground',
}) => {
  const text = orgBranchLabel(record);
  if (!text) return null;
  return (
    <p className={className}>
      {label}: {text}
    </p>
  );
};

export const VendorBranchDetail = ({
  record = {},
  label = 'Vendor Branch',
  className = 'text-sm text-muted-foreground',
}) => {
  const text = vendorBranchLabel(record);
  if (!text) return null;
  return (
    <p className={className}>
      {label}: {text}
    </p>
  );
};

export const VendorWithBranchCell = ({ record = {}, vendorName }) => {
  const resolvedVendorName = vendorName ?? record.vendorName ?? record.vendor_name ?? '';
  const branchLabel = vendorBranchLabel(record);

  return (
    <div className="space-y-0.5">
      <ClippedTextWithTooltip text={resolvedVendorName} />
      {branchLabel ? (
        <p className="text-xs text-muted-foreground">{branchLabel}</p>
      ) : null}
    </div>
  );
};
