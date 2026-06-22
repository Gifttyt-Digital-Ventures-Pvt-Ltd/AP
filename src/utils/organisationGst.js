const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

let gstRowIdCounter = 0;

export function createEmptyGstRegistration() {
  gstRowIdCounter += 1;
  const suffix =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${gstRowIdCounter}`;
  return { id: `gst-row-${suffix}`, gstin: '', username: '' };
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

export function normalizeGstRegistrationsForSave(registrations = []) {
  return registrations
    .map(({ gstin, username }) => ({
      gstin: (gstin ?? '').trim().toUpperCase(),
      username: (username ?? '').trim(),
    }))
    .filter(({ gstin, username }) => gstin || username);
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

export function buildOrganisationSavePayload(orgForm) {
  const { gst_registrations, ...rest } = orgForm;
  const normalizedRegistrations = normalizeGstRegistrationsForSave(gst_registrations);

  return {
    ...rest,
    gst_registrations: normalizedRegistrations,
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
