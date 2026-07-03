const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

let gstRowIdCounter = 0;
let branchRowIdCounter = 0;

export function createEmptyGstRegistration() {
  gstRowIdCounter += 1;
  const suffix =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${gstRowIdCounter}`;
  return { id: `gst-row-${suffix}`, gstin: '', username: '' };
}

export function createEmptyOrganisationBranch() {
  branchRowIdCounter += 1;
  const suffix =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${branchRowIdCounter}`;
  return {
    id: `branch-row-${suffix}`,
    branchName: '',
    branchCode: '',
    areaSqft: '',
    billingGstin: '',
  };
}

export function normalizeGstRegistrationsFromApi(data = {}) {
  const fromArray = data.gst_registrations ?? data.gstRegistrations;
  if (Array.isArray(fromArray) && fromArray.length > 0) {
    return fromArray.map((entry, index) => ({
      id: entry.id ?? `gst-row-${index}`,
      gstin: (entry.gstin ?? entry.gstIn ?? '').toUpperCase(),
      username: entry.username ?? entry.gst_username ?? entry.gstUsername ?? '',
    }));
  }

  const legacyGstin = (data.gstin ?? '').toUpperCase();
  if (legacyGstin) {
    return [
      {
        id: 'gst-row-legacy',
        gstin: legacyGstin,
        username: data.gst_username ?? data.gstUsername ?? '',
      },
    ];
  }

  return [createEmptyGstRegistration()];
}

export function normalizeOrganisationBranchesFromApi(data = {}) {
  const fromArray =
    data.branches ??
    data.organisationBranches ??
    data.organizationBranches ??
    data.branch_details;

  if (!Array.isArray(fromArray) || fromArray.length === 0) return [];

  return fromArray.map((entry, index) => ({
    id: entry.id ?? entry.branchId ?? entry.branch_id ?? `branch-row-${index}`,
    branchName: entry.branchName ?? entry.branch_name ?? entry.name ?? '',
    branchCode: entry.branchCode ?? entry.branch_code ?? entry.code ?? '',
    areaSqft:
      entry.areaSqft ??
      entry.area_sqft ??
      entry.areaOfBranch ??
      entry.area_of_branch ??
      '',
    billingGstin: (entry.billingGstin ?? entry.billing_gstin ?? entry.gstin ?? '').toUpperCase(),
  }));
}

export function normalizeGstRegistrationsForSave(registrations = []) {
  return registrations
    .map(({ gstin, username }) => ({
      gstin: (gstin ?? '').trim().toUpperCase(),
      username: (username ?? '').trim(),
    }))
    .filter(({ gstin, username }) => gstin || username);
}

export function normalizeOrganisationBranchesForSave(branches = []) {
  return branches
    .map(({ branchName, branchCode, areaSqft, billingGstin }) => ({
      branchName: (branchName ?? '').trim(),
      branchCode: (branchCode ?? '').trim(),
      areaSqft: areaSqft === '' || areaSqft === null || areaSqft === undefined ? null : Number(areaSqft),
      billingGstin: (billingGstin ?? '').trim().toUpperCase(),
    }))
    .filter(({ branchName, branchCode, areaSqft, billingGstin }) =>
      branchName || branchCode || areaSqft !== null || billingGstin,
    );
}

export function validateGstRegistrations(registrations = []) {
  const activeRows = normalizeGstRegistrationsForSave(registrations);

  for (const row of activeRows) {
    // if (row.gstin && !GSTIN_PATTERN.test(row.gstin)) {
    //   return 'Each GSTIN must be a valid 15-character GST number.';
    // }
    if (row.gstin && !row.username) {
      return 'GST portal username is required for each GSTIN.';
    }
    if (!row.gstin && row.username) {
      return 'GSTIN is required when a GST portal username is provided.';
    }
  }

  const gstins = activeRows.map((row) => row.gstin).filter(Boolean);
  if (new Set(gstins).size !== gstins.length) {
    return 'Duplicate GSTINs are not allowed.';
  }

  return null;
}

export function validateOrganisationBranches(branches = []) {
  const activeRows = normalizeOrganisationBranchesForSave(branches);
  const branchNames = [];
  const branchCodes = [];

  for (const row of activeRows) {
    if (!row.branchName) return 'Branch name is required for each configured branch.';
    if (row.areaSqft !== null && (!Number.isFinite(row.areaSqft) || row.areaSqft < 0)) {
      return 'Branch area must be a valid positive number.';
    }
    branchNames.push(row.branchName.trim().toLowerCase());
    if (row.branchCode) {
      branchCodes.push(row.branchCode.trim().toLowerCase());
    }
  }

  if (new Set(branchNames).size !== branchNames.length) {
    return 'Duplicate branch names are not allowed.';
  }
  if (branchCodes.length > 0 && new Set(branchCodes).size !== branchCodes.length) {
    return 'Duplicate branch codes are not allowed.';
  }

  return null;
}

export function getConfiguredOrganisationGstins(registrations = []) {
  return normalizeGstRegistrationsForSave(registrations)
    .map((registration) => registration.gstin)
    .filter(Boolean);
}

export function buildOrganisationSavePayload(orgForm) {
  const { gst_registrations, branches, ...rest } = orgForm;
  const normalizedRegistrations = normalizeGstRegistrationsForSave(gst_registrations);
  const normalizedBranches = normalizeOrganisationBranchesForSave(branches);

  return {
    ...rest,
    gst_registrations: normalizedRegistrations,
    branches: normalizedBranches,
    gstin: normalizedRegistrations[0]?.gstin ?? '',
  };
}

export function normalizeOrganisationGstCredentialsList(response) {
  const list = Array.isArray(response)
    ? response
    : response?.data ?? response?.items ?? response?.gst_registrations ?? response?.gstRegistrations ?? [];

  if (!Array.isArray(list)) return [];

  return list
    .map((entry, index) => ({
      id: entry.id ?? entry.gst ?? entry.gstin ?? entry.gstIn ?? `org-gst-${index}`,
      gst: (entry.gst ?? entry.gstin ?? entry.gstIn ?? '').trim().toUpperCase(),
      userName: (entry.userName ?? entry.username ?? entry.gst_username ?? entry.gstUsername ?? '').trim(),
    }))
    .filter((entry) => entry.gst && entry.userName);
}

export function buildGstPortalFetchCredentials(orgCredential) {
  if (!orgCredential?.gst || !orgCredential?.userName) return null;
  return {
    gst: orgCredential.gst,
    userName: orgCredential.userName,
  };
}
