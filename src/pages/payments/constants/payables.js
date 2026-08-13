export const PAYABLE_SOURCE_LABELS = {
  INVOICE: "Invoice",
  OBLIGATION: "Milestone",
  ADVANCE: "Manual advance",
};

export const PAYABLE_STAGE_LABELS = {
  PO: "PO",
  GRN: "GRN",
  PI: "PI",
  TI: "TI",
};

export const RELEASE_BLOCKER_COPY = {
  OBLIGATION_NOT_TRIGGERED: "Milestone has not been released yet.",
  EXCEEDS_TRIGGERED: "Requested amount exceeds the triggered balance.",
  MATCH_GATE: "Invoice matching must pass before release.",
  ADVANCE_CAP: "Order advance cap would be breached.",
  ORDER_NOT_OPEN: "Order is closed or cancelled.",
  BENEFICIARY_UNVERIFIED: "Beneficiary is not verified.",
  NO_ACTIVE_BANK_ACCOUNT: "No active bank account is available.",
};

export const PAYABLE_WARNING_COPY = {
  EARLIER_STAGE_UNPAID: "An earlier stage on this order is still unpaid.",
  PARTIAL_TRIGGER: "Milestone is partially triggered.",
  VENDOR_POOL_AVAILABLE: "Vendor has unapplied advances available.",
};

