import {
  getVendorDocumentFileEntries,
  sanitizeVendorDocumentsForSave,
} from './vendorDocuments';
import { sanitizeVendorTdsForSave } from './vendorTds';

const stripVendorLevelAddressAndBank = (vendor = {}) => {
  const {
    address_line1,
    address_line2,
    city,
    state,
    pincode,
    bank_name,
    account_number,
    ifsc_code,
    branch,
    account_holder_name,
    ...rest
  } = vendor;

  return rest;
};

export const sanitizeGstRegistrationsForSave = (registrations = []) =>
  (Array.isArray(registrations) ? registrations : [])
    .map((registration) => {
      const {
        _clientId,
        _fromFetch,
        tradeName,
        trade_name,
        legalName,
        legal_name,
        registrationType,
        registration_type,
        regType,
        registrationDate,
        registration_date,
        regStartDate,
        regDate,
        ...rest
      } = registration;
      return rest;
    })
    .filter((registration) => String(registration.gstin || '').trim());

export const sanitizeVendorBranchesForSave = (branches = []) =>
  (Array.isArray(branches) ? branches : [])
    .map((branch) => {
      const {
        isEditing,
        _clientId,
        branch_name,
        branch_code,
        mappedGstin,
        mapped_gstin,
        billingGstin,
        ...rest
      } = branch;
      return {
        ...rest,
        branchName: String(branch.branchName ?? branch_name ?? '').trim(),
        branchCode: String(branch.branchCode ?? branch_code ?? '').trim().toUpperCase(),
        gstin: String(branch.gstin ?? mappedGstin ?? mapped_gstin ?? billingGstin ?? '').trim().toUpperCase(),
      };
    })
    .filter((branch) => branch.branchName || branch.branchCode || branch.gstin);

export const normalizeVendorForSave = (vendor = {}) => {
  const sanitized = stripVendorLevelAddressAndBank(vendor);
  const { tdsMappings, vendor_branches, branches, ...restSanitized } = sanitized;
  delete restSanitized.tdsCertificates;
  delete restSanitized.tdsDetailsEdited;
  const tdsMapping = sanitizeVendorTdsForSave(restSanitized.tdsMapping ?? tdsMappings);
  const vendorBranches = sanitizeVendorBranchesForSave(
    restSanitized.vendorBranches ?? vendor_branches ?? branches,
  );

  if (Array.isArray(restSanitized.gstRegistrations) && restSanitized.gstRegistrations.length > 0) {
    const cleanedRegistrations = sanitizeGstRegistrationsForSave(restSanitized.gstRegistrations);
    return {
      ...restSanitized,
      gstRegistrations: cleanedRegistrations,
      vendorBranches,
      gstin: cleanedRegistrations[0]?.gstin || restSanitized.gstin || '',
      documents: sanitizeVendorDocumentsForSave(restSanitized.documents),
      tdsMapping,
    };
  }

  const gstin = String(vendor.gstin || '').trim().toUpperCase();
  if (!gstin) {
    return {
      ...restSanitized,
      vendorBranches,
      documents: sanitizeVendorDocumentsForSave(restSanitized.documents),
      tdsMapping,
    };
  }

  return {
    ...restSanitized,
    documents: sanitizeVendorDocumentsForSave(restSanitized.documents),
    tdsMapping,
    vendorBranches,
    gstRegistrations: [
      {
        gstin,
        state: vendor.state || '',
        location: {
          addressLine1: vendor.address_line1 || '',
          addressLine2: vendor.address_line2 || '',
          city: vendor.city || '',
          state: vendor.state || '',
          pincode: vendor.pincode || '',
          country: vendor.country || 'India',
        },
        bankDetails: {
          accountHolderName: vendor.account_holder_name || vendor.name || '',
          accountNumber: vendor.account_number || '',
          ifscCode: vendor.ifsc_code || '',
          bankName: vendor.bank_name || '',
          branch: vendor.branch || '',
        },
      },
    ],
  };
};

const normalizePendingTdsCertificates = (certificates = []) =>
  (Array.isArray(certificates) ? certificates : [])
    .map((certificate) => {
      const { document, _clientId, ...rest } = certificate || {};
      return {
        ...rest,
        hasDocument: Boolean(document),
      };
    })
    .filter((certificate) => certificate.certificateNumber || certificate.sectionCode);

const getVendorCertificateFileEntries = (certificates = []) =>
  (Array.isArray(certificates) ? certificates : [])
    .map((certificate, index) => ({ certificate, index }))
    .filter(({ certificate }) => (
      typeof File !== 'undefined' && certificate?.document instanceof File
    ));

export const hasVendorMultipartFiles = (vendor = {}) => {
  const documentFiles = getVendorDocumentFileEntries(vendor.documents);
  const certificateFiles = getVendorCertificateFileEntries(vendor.tdsCertificates);

  return documentFiles.length > 0 || certificateFiles.length > 0;
};

const buildVendorJsonPayload = (vendor = {}, overrides = {}) => {
  const pendingCertificates = normalizePendingTdsCertificates(vendor.tdsCertificates);
  return {
    ...normalizeVendorForSave(vendor),
    ...overrides,
    ...(pendingCertificates.length > 0 ? { tdsCertificates: pendingCertificates } : {}),
  };
};

export const buildVendorMultipartPayload = (vendor = {}, overrides = {}) => {
  const payload = buildVendorJsonPayload(vendor, overrides);
  const formData = new FormData();

  formData.append(
    'vendor',
    new Blob([JSON.stringify(payload)], { type: 'application/json' }),
  );

  getVendorDocumentFileEntries(vendor.documents).forEach(({ key, file }) => {
    formData.append(`documents[${key}]`, file);
  });

  getVendorCertificateFileEntries(vendor.tdsCertificates).forEach(({ certificate, index }) => {
    formData.append(`tdsCertificates[${index}].document`, certificate.document);
  });

  return formData;
};

export const buildVendorSaveBody = (vendor = {}, overrides = {}) =>
  hasVendorMultipartFiles(vendor)
    ? buildVendorMultipartPayload(vendor, overrides)
    : buildVendorJsonPayload(vendor, overrides);
