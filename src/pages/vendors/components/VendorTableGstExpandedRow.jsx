import React from 'react';
import { TableCell, TableRow } from '../../../components/ui/table';
import { getVendorGstRegistrations } from './VendorGstRegistrationsPanel';

const VendorTableGstExpandedRow = ({ vendor, colSpan }) => {
  const registrations = getVendorGstRegistrations(vendor);

  return (
    <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={colSpan} className="px-4 py-3">
        <div className="pl-12">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            GSTIN Details
          </div>
          <div className="space-y-2">
            {registrations.map((registration) => (
              <div
                key={registration.gstin}
                className="flex flex-col gap-2 rounded-lg border border-border bg-background px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="flex min-w-0 items-center gap-2 sm:min-w-[160px] sm:flex-none">
                  <span className="font-mono text-xs font-semibold text-primary">
                    {registration.gstin}
                  </span>
                </div>
                <span className="text-sm text-foreground sm:min-w-28">{registration.state || '-'}</span>
                {registration.address ? (
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground sm:text-sm">
                    {registration.address}
                  </span>
                ) : (
                  <span className="flex-1 text-xs text-muted-foreground sm:text-sm">-</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default VendorTableGstExpandedRow;
