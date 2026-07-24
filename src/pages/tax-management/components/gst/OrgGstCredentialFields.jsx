import React from 'react';
import { Link } from 'react-router-dom';
import { TaxSelect } from '../TaxUi';
import { cn } from '../../../../lib/utils';

const GstFormField = ({ label, required, optional, children, className }) => (
  <div className={cn('flex min-w-[160px] flex-col gap-1.5', className)}>
    <label className="text-xs font-semibold">
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
      {optional ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
    </label>
    {children}
  </div>
);

const OrgGstCredentialFields = ({
  credentials = [],
  loading = false,
  selectedGst = '',
  onGstChange,
  className,
}) => {
  const placeholder = loading
    ? 'Loading organisation GSTINs…'
    : credentials.length === 0
      ? 'No organisation GSTIN configured'
      : 'Select organisation GSTIN…';

  return (
    <>
      <GstFormField label="Organisation GSTIN" required className={cn('min-w-[240px]', className)}>
        <TaxSelect
          value={selectedGst || 'placeholder'}
          onValueChange={(value) => onGstChange(value === 'placeholder' ? '' : value)}
          disabled={loading || credentials.length === 0}
          placeholder={placeholder}
          options={[
            { value: 'placeholder', label: placeholder },
            ...credentials.map((entry) => ({
              value: entry.gst,
              label: entry.gst,
            })),
          ]}
        />
      </GstFormField>
      {!loading && credentials.length === 0 ? (
        <p className="w-full text-xs text-muted-foreground">
          Add organisation GST registrations in{' '}
          <Link to="/settings" className="font-medium text-primary underline-offset-2 hover:underline">
            Settings → Organisation Details
          </Link>
          {' '}before fetching GST portal data.
        </p>
      ) : null}
    </>
  );
};

export default OrgGstCredentialFields;
