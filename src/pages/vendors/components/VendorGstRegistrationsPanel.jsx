import React from 'react';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';

const getRegistrationValue = (registration, ...keys) => {
  for (const key of keys) {
    const value = registration?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
};

const formatRegistrationLocation = (registration = {}) => {
  const location = registration.location ?? registration.addressDetails ?? registration.address_details;
  if (location && typeof location === 'object') {
    return [
      location.addressLine1 ?? location.address_line1,
      location.addressLine2 ?? location.address_line2,
      location.city,
      location.state,
      location.pincode ?? location.postalCode ?? location.postal_code,
      location.country,
    ]
      .filter(Boolean)
      .join(', ');
  }

  return getRegistrationValue(registration, 'address', 'principalAddress', 'principal_address');
};

export const getVendorGstRegistrations = (vendor = {}) => {
  const registrations =
    vendor.gstRegistrations ??
    vendor.gst_regs ??
    vendor.gstRegs ??
    vendor.gst_registrations;

  if (Array.isArray(registrations) && registrations.length > 0) {
    return registrations
      .map((registration) => ({
        ...registration,
        gstin: getRegistrationValue(registration, 'gstin', 'gstIn', 'gst'),
        tradeName: getRegistrationValue(registration, 'tradeName', 'trade_name', 'legalName', 'legal_name'),
        state: getRegistrationValue(registration, 'state', 'stateName', 'state_name'),
        address: formatRegistrationLocation(registration),
        location: registration.location ?? registration.addressDetails ?? registration.address_details ?? null,
        bankDetails: registration.bankDetails ?? registration.bank_details ?? {},
        registrationDate: getRegistrationValue(
          registration,
          'registrationDate',
          'registration_date',
          'regStartDate',
          'regDate',
        ),
        registrationType: getRegistrationValue(registration, 'registrationType', 'registration_type', 'regType'),
      }))
      .filter((registration) => registration.gstin);
  }

  const gstin = String(vendor.gstin || '').trim().toUpperCase();
  if (!gstin) return [];

  return [
    {
      gstin,
      tradeName: vendor.tradeName || vendor.trade_name || vendor.name || '',
      state: vendor.state || '',
      address: [vendor.address_line1 || vendor.addressLine1, vendor.address_line2 || vendor.addressLine2]
        .filter(Boolean)
        .join(', '),
      registrationDate: vendor.registrationDate || vendor.registration_date || '',
      registrationType: vendor.registrationType || vendor.registration_type || '',
    },
  ];
};

export const getFirstVendorGstin = (vendor = {}) => {
  const registrations = getVendorGstRegistrations(vendor);
  return registrations[0]?.gstin || vendor.gstin || '';
};

export const getVendorRegistrationStates = (vendor = {}) => {
  const registrations = getVendorGstRegistrations(vendor);
  return [...new Set(registrations.map((registration) => registration.state).filter(Boolean))];
};

export const getVendorMultiStateCount = (vendors = []) =>
  vendors.filter((vendor) => getVendorRegistrationStates(vendor).length > 1).length;

const VendorGstRegistrationsPanel = ({ vendor }) => {
  const registrations = getVendorGstRegistrations(vendor);

  if (registrations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        No GSTIN details available for this vendor.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {registrations.map((registration, index) => (
        <Card key={`${registration.gstin}-${index}`} className="rounded-lg border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <span className="font-mono text-sm font-semibold text-foreground">{registration.gstin}</span>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {registration.tradeName || vendor?.name || '-'}
                </p>
                {registration.address ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Location:</span> {registration.address}
                  </p>
                ) : null}
                {registration.bankDetails ? (
                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>
                      <span className="font-medium text-foreground">Bank:</span>{' '}
                      {registration.bankDetails.bankName || '-'}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Account:</span>{' '}
                      {registration.bankDetails.accountNumber || '-'}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">IFSC:</span>{' '}
                      {registration.bankDetails.ifscCode || '-'}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Holder:</span>{' '}
                      {registration.bankDetails.accountHolderName || '-'}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground sm:min-w-40">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{registration.state || '-'}</span>
                </div>
                {registration.registrationType ? (
                  <div>
                    <span className="font-medium text-foreground">Type:</span> {registration.registrationType}
                  </div>
                ) : null}
                {registration.registrationDate ? (
                  <div>
                    <span className="font-medium text-foreground">Registered:</span> {registration.registrationDate}
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default VendorGstRegistrationsPanel;
