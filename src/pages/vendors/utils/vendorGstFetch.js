import { mapVendorGstDetailsToForm, normalizeGstPortalVendorDetails } from '../../tax-management/utils/gstApiMappers';
import { resolveVendorFetchSource } from '../../../utils/vendorValidation';

export const getVendorGstDetailsCurrentData = (response = {}) =>
  response?.currentData ??
  response?.data?.currentData ??
  response?.data ??
  response;

const getRegistrationGstin = (registration = {}) =>
  String(
    registration.gstin ??
      registration.gstIn ??
      registration.gst ??
      '',
  )
    .trim()
    .toUpperCase();

const pickIdentityField = (source = {}, ...keys) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
};

const mapRegistrationToFetchRecord = (registration = {}, identity = {}) => {
  const gstin = getRegistrationGstin(registration);
  const mapped = mapVendorGstDetailsToForm(registration);

  return {
    gstin: gstin || mapped.gstin,
    tradeName:
      pickIdentityField(registration, 'tradeName', 'trade_name', 'tradeNam') ||
      mapped.tradeName ||
      mapped.legalName ||
      identity.legalName ||
      '',
    legalName:
      identity.legalName ||
      pickIdentityField(registration, 'legalName', 'legal_name', 'lgnm') ||
      mapped.legalName ||
      '',
    pan: (
      identity.pan ||
      pickIdentityField(registration, 'pan') ||
      mapped.pan ||
      ''
    ).toUpperCase(),
    vendorType:
      identity.vendorType ||
      pickIdentityField(registration, 'vendorType', 'vendor_type') ||
      'Company',
    email: identity.email || pickIdentityField(registration, 'email') || '',
    mobile: identity.mobile || pickIdentityField(registration, 'mobile') || '',
    contactPerson:
      identity.contactPerson ||
      pickIdentityField(registration, 'contactPerson', 'contact_person') ||
      '',
    state: pickIdentityField(registration, 'state', 'stateName', 'state_name') || mapped.state,
    stateCode: pickIdentityField(registration, 'stateCode', 'state_code') || mapped.stateCode,
    address:
      pickIdentityField(registration, 'address', 'principalAddress', 'principal_address') ||
      mapped.address ||
      '',
    location: registration.location ?? registration.addressDetails ?? registration.address_details ?? mapped.location ?? null,
    bankDetails: registration.bankDetails ?? registration.bank_details ?? {},
    registrationDate:
      pickIdentityField(registration, 'registrationDate', 'registration_date') ||
      mapped.registrationDate,
    registrationType:
      pickIdentityField(registration, 'registrationType', 'registration_type', 'dty') ||
      mapped.registrationType ||
      '',
    businessNature:
      pickIdentityField(registration, 'businessNature', 'business_nature', 'bussNature') ||
      mapped.businessNature,
  };
};

export const buildVendorGstDetailsRequestBody = ({ pan, gstin } = {}) => {
  const source = resolveVendorFetchSource({ pan, gstin });
  if (!source) return null;
  if (source.mode === 'pan') return { pan: source.value };
  return { gstin: source.value };
};

export const mapVendorGstDetailsToFetchRecords = (response = {}, requestedMode = 'gstin') => {
  const currentData = normalizeGstPortalVendorDetails(getVendorGstDetailsCurrentData(response));
  const identity = {
    legalName:
      pickIdentityField(currentData, 'legalName', 'legal_name', 'lgnm') || '',
    tradeName:
      pickIdentityField(currentData, 'tradeName', 'trade_name', 'tradeNam') || '',
    pan: (
      pickIdentityField(currentData, 'pan') ||
      String(currentData.gstin || '').trim().toUpperCase().slice(2, 12)
    ).toUpperCase(),
    vendorType: pickIdentityField(currentData, 'vendorType', 'vendor_type') || 'Company',
    email: pickIdentityField(currentData, 'email') || '',
    mobile: pickIdentityField(currentData, 'mobile') || '',
    contactPerson:
      pickIdentityField(currentData, 'contactPerson', 'contact_person') || '',
  };

  const registrations =
    currentData.gstRegistrations ??
    currentData.gst_registrations ??
    currentData.registrations ??
    currentData.gstRegs ??
    currentData.gst_regs;

  if (Array.isArray(registrations) && registrations.length > 0) {
    const records = registrations
      .map((registration) => mapRegistrationToFetchRecord(registration, identity))
      .filter((record) => record.gstin);

    return {
      mode: requestedMode === 'pan' || records.length > 1 ? 'pan' : 'gstin',
      records,
      identity,
    };
  }

  const mapped = mapVendorGstDetailsToForm(currentData);
  const record = mapRegistrationToFetchRecord({ ...currentData, ...mapped }, identity);

  if (!record.gstin) {
    return { mode: requestedMode, records: [], identity };
  }

  return {
    mode: requestedMode,
    records: [record],
    identity,
  };
};

export const fetchVendorGstDetailsFromLookup = ({ pan, gstin } = {}, lookup = { byPan: {}, byGstin: {} }) => {
  const source = resolveVendorFetchSource({ pan, gstin });
  if (!source) {
    return { success: false, error: 'Enter PAN or GSTIN to fetch details' };
  }

  if (source.mode === 'pan') {
    const records = lookup.byPan?.[source.value] || [];
    if (!records.length) {
      return { success: false, error: 'No vendor found for this PAN in sandbox data.' };
    }

    return {
      success: true,
      mode: 'pan',
      records,
      identity: {
        legalName: records[0]?.legalName || '',
        tradeName: records[0]?.tradeName || '',
        pan: source.value,
        vendorType: records[0]?.vendorType || 'Company',
        email: records[0]?.email || '',
        mobile: records[0]?.mobile || '',
        contactPerson: records[0]?.contactPerson || '',
      },
    };
  }

  const record = lookup.byGstin?.[source.value];
  if (!record) {
    return { success: false, error: 'No vendor found for this GSTIN in sandbox data.' };
  }

  return {
    success: true,
    mode: 'gstin',
    records: [record],
    identity: {
      legalName: record.legalName || '',
      tradeName: record.tradeName || '',
      pan: record.pan || '',
      vendorType: record.vendorType || 'Company',
      email: record.email || '',
      mobile: record.mobile || '',
      contactPerson: record.contactPerson || '',
    },
  };
};

export const fetchVendorGstDetailsByPanFromLookup = (pan, lookup) =>
  fetchVendorGstDetailsFromLookup({ pan }, lookup);
