export const getRegistrationValue = (registration, ...keys) => {
  for (const key of keys) {
    const value = registration?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

export const formatRegistrationLocation = (registration = {}) => {
  const location = registration.location ?? registration.addressDetails ?? registration.address_details;
  if (location && typeof location === "object") {
    return [
      location.addressLine1 ?? location.address_line1,
      location.addressLine2 ?? location.address_line2,
      location.city,
      location.state,
      location.pincode ?? location.postalCode ?? location.postal_code,
      location.country,
    ]
      .filter(Boolean)
      .join(", ");
  }

  return getRegistrationValue(registration, "address", "principalAddress", "principal_address");
};

export const buildGstRegistrationFromVerification = (data) => {
  const gstin = String(data?.gstin || "").trim().toUpperCase();
  if (!gstin) return null;

  return {
    gstin,
    state: data.state || "",
    stateCode: data.stateCode || "",
    businessNature: data.businessNature || "",
    location: data.location ?? null,
    bankDetails: data.bankDetails ?? data.bank_details ?? {},
    address: formatRegistrationLocation(data),
  };
};

export const normalizeFormGstRegistrations = (registrations = []) =>
  (Array.isArray(registrations) ? registrations : [])
    .map((registration) => ({
      ...registration,
      gstin: String(getRegistrationValue(registration, "gstin", "gstIn", "gst")).trim().toUpperCase(),
      state: getRegistrationValue(registration, "state", "stateName", "state_name"),
      stateCode: getRegistrationValue(registration, "stateCode", "state_code"),
      address: formatRegistrationLocation(registration),
      location: registration.location ?? registration.addressDetails ?? registration.address_details ?? null,
      bankDetails: registration.bankDetails ?? registration.bank_details ?? {},
      _clientId:
        registration._clientId ||
        (getRegistrationValue(registration, "gstin", "gstIn", "gst")
          ? `reg-${String(getRegistrationValue(registration, "gstin", "gstIn", "gst")).trim().toUpperCase()}`
          : undefined),
      _fromFetch: registration._fromFetch === true,
    }))
    .filter((registration) => registration.gstin || registration._clientId);

export const getRegistrationKey = (registration = {}) =>
  registration._clientId || String(registration.gstin || "").trim().toUpperCase();

export const createEmptyGstRegistration = () => ({
  _clientId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  gstin: "",
  state: "",
  location: { country: "India" },
  bankDetails: {},
});

export const mapFetchedRegistrationToVerification = (registration = {}) => ({
  gstin: registration.gstin,
  pan: registration.pan || "",
  state: registration.state || "",
  stateCode: registration.stateCode || "",
  businessNature: registration.businessNature || "",
  location: registration.location ?? null,
  bankDetails: registration.bankDetails ?? {},
  address: registration.address || "",
  legalName: registration.legalName || "",
  tradeName: registration.tradeName || "",
  validGstin: true,
});
